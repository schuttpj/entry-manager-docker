import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Snag, Annotation } from "@/types/snag";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { GState } from "jspdf";

interface PDFExportProps {
  snags: Snag[];
  projectName: string;
}

const compressImage = async (imageUrl: string, maxWidth = 1200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!imageUrl.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } catch (err) {
        reject(new Error(`Failed to process image: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
};

const drawAnnotationPins = (
  doc: jsPDF,
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
  annotations: Annotation[]
) => {
  if (!annotations?.length) return;

  annotations.forEach((pin, index) => {
    try {
      const pinX = imageX + (pin.x * imageWidth) / 100;
      const pinY = imageY + (pin.y * imageHeight) / 100;
      
      // Draw pin circle with border
      doc.setFillColor(255, 0, 0);
      doc.circle(pinX, pinY, 2.5, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.circle(pinX, pinY, 2.5, 'S');
      
      // Draw pin number with background
      const number = (index + 1).toString();
      doc.setFillColor(255, 255, 255);
      doc.circle(pinX, pinY, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const textWidth = doc.getTextWidth(number);
      doc.text(number, pinX - (textWidth/2), pinY + 0.5);
    } catch (err) {
      console.error(`Failed to draw annotation pin ${index + 1}:`, err instanceof Error ? err.message : 'Unknown error');
    }
  });
};

// Add watermark for completed snags
const addCompletedWatermark = (
  doc: jsPDF,
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
  completionDate: string | Date | null
) => {
  const centerX = imageX + imageWidth / 2;
  const centerY = imageY + imageHeight / 2;
  
  // Calculate text size based on image width
  const fontSize = Math.min(imageWidth * 0.3, 70); // 30% of image width, max 70pt
  
  // Add "COMPLETED" text centered on the image
  doc.setFontSize(fontSize);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 197, 94); // text-green-600
  
  const completedText = "COMPLETED";
  // Move the main text up by half the date height to center the whole watermark
  const dateOffset = completionDate ? fontSize * 0.8 : 0; // Increased spacing for date
  doc.text(
    completedText,
    centerX,
    centerY - (dateOffset / 2),
    {
      align: 'center',
      angle: -30
    }
  );
  
  // Add completion date if available - positioned below the main text
  if (completionDate) {
    try {
      const date = new Date(completionDate);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        doc.setFontSize(fontSize * 0.35); // Increased font size for date
        doc.setFont(undefined, 'bold'); // Made date bold
        const dateText = format(date, 'MMM d, yyyy');
        
        doc.text(
          dateText,
          centerX,
          centerY + (dateOffset / 2),
          {
            align: 'center',
            angle: -30
          }
        );
      }
    } catch (error) {
      console.warn('Error formatting completion date:', error);
    }
  }
};

export function PDFExport({ snags, projectName }: PDFExportProps) {
  const handleExport = async () => {
    if (!snags?.length) {
      alert('Please select at least one snag to export.');
      return;
    }

    try {
      // Initialize PDF in portrait mode (A4)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      
      // Add project title
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text(projectName, margin, margin + 5);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const now = new Date();
      const dateTimeStr = `Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
      doc.text(dateTimeStr, margin, margin + 12);
      doc.line(margin, margin + 15, pageWidth - margin, margin + 15);
      let yPosition = margin + 25;
      
      for (const snag of snags) {
        // Start each snag on a new page
        if (yPosition > margin + 25) {
          doc.addPage();
          yPosition = margin + 25;
        }
        
        // Add snag header with colored background
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 5, contentWidth, 12, 'F');
        doc.setFontSize(16);
        if (snag.status === 'Completed') {
          doc.setTextColor(34, 197, 94); // text-green-600
          doc.setFont(undefined, 'bold');
        } else {
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
        }
        doc.text(`Entry #${snag.snagNumber}: ${snag.name || ''}`, margin + 2, yPosition + 3);
        yPosition += 15;

        // Reset text color and font
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        
        // Add snag details in a grid layout
        doc.setFontSize(10);
        const details = [
          [`Priority: ${snag.priority}`, `Status: ${snag.status}${snag.status === 'Completed' && snag.completionDate ? ` (${format(new Date(snag.completionDate), 'MM/dd/yy')})` : ''}`],
          [`Assigned To: ${snag.assignedTo || 'Unassigned'}`, `Created: ${new Date(snag.createdAt).toLocaleDateString()}`],
          [`Location: ${snag.location || 'No location specified'}`]
        ];
        
        details.forEach(row => {
          row.forEach((detail, index) => {
            doc.text(detail, margin + (index * (contentWidth/2)), yPosition);
          });
          yPosition += 6;
        });
        
        // Add description
        if (snag.description?.trim()) {
          yPosition += 3;
          doc.setFontSize(11);
          doc.setTextColor(60, 60, 60);
          const splitDescription = doc.splitTextToSize(snag.description, contentWidth);
          doc.text(splitDescription, margin, yPosition);
          yPosition += (splitDescription.length * 5) + 8;
        }
        
        // Process and add image with annotations
        try {
          const compressedImage = await compressImage(snag.photoPath);
          
          // Calculate image dimensions
          const img = new Image();
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Image load timeout")), 10000);
            img.onload = () => {
              clearTimeout(timeout);
              resolve(null);
            };
            img.onerror = () => {
              clearTimeout(timeout);
              reject(new Error("Failed to load image"));
            };
            img.src = compressedImage;
          });
          
          // Calculate image dimensions to fit width while maintaining aspect ratio
          let imgWidth = contentWidth;
          let imgHeight = (img.height * contentWidth) / img.width;
          
          // If image is too tall, scale to fit height
          const maxHeight = pageHeight - yPosition - margin - (snag.annotations?.length ? 40 : 20);
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = (img.width * maxHeight) / img.height;
          }

          // Center the image
          const xOffset = (contentWidth - imgWidth) / 2;
          doc.addImage(compressedImage, 'JPEG', margin + xOffset, yPosition, imgWidth, imgHeight);
          
          // Add watermark for completed snags
          if (snag.status === 'Completed') {
            addCompletedWatermark(
              doc,
              margin + xOffset,
              yPosition,
              imgWidth,
              imgHeight,
              snag.completionDate
            );
          }
          
          // Add annotation pins
          if (snag.annotations?.length) {
            drawAnnotationPins(doc, margin + xOffset, yPosition, imgWidth, imgHeight, snag.annotations);
          }
          
          yPosition += imgHeight + 10;
          
          // Add annotation list if there are annotations
          if (snag.annotations?.length) {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Annotations:', margin, yPosition);
            yPosition += 6;
            
            // Calculate remaining space on page
            const remainingSpace = pageHeight - margin - yPosition;
            // Calculate space needed per annotation (including padding)
            const spacePerAnnotation = remainingSpace / snag.annotations.length;
            
            // Start with normal font size and reduce if needed
            let fontSize = 10;
            let lineSpacing = 5;
            
            // If space is tight, adjust font size and spacing
            if (spacePerAnnotation < 8) {
              fontSize = Math.max(6, spacePerAnnotation * 0.8);
              lineSpacing = Math.max(3, spacePerAnnotation * 0.4);
            }
            
            doc.setFontSize(fontSize);
            doc.setTextColor(60, 60, 60);
            
            snag.annotations.forEach((annotation, index) => {
              // Skip if annotation text is empty or undefined
              if (!annotation?.text?.trim()) return;
              
              // Format annotation text with number and content
              const annotationText = `${index + 1}. ${annotation.text}`;
              
              // Calculate max width based on content width and current position
              const maxWidth = contentWidth - 10;
              const splitAnnotation = doc.splitTextToSize(annotationText, maxWidth);
              
              // Calculate total height needed for this annotation
              const annotationHeight = splitAnnotation.length * lineSpacing;
              
              // If this annotation would go beyond page bounds, reduce font size further
              if (yPosition + annotationHeight > pageHeight - margin) {
                const remainingHeight = pageHeight - margin - yPosition;
                const newFontSize = Math.max(6, fontSize * (remainingHeight / annotationHeight));
                fontSize = newFontSize;
                lineSpacing = Math.max(3, newFontSize * 0.4);
                doc.setFontSize(fontSize);
                // Recalculate split text with new font size
                const newSplitAnnotation = doc.splitTextToSize(annotationText, maxWidth);
                doc.text(newSplitAnnotation, margin, yPosition);
                yPosition += newSplitAnnotation.length * lineSpacing;
              } else {
                doc.text(splitAnnotation, margin, yPosition);
                yPosition += splitAnnotation.length * lineSpacing;
              }
            });
            
            // Add minimal space after annotations
            yPosition += 3;
          }
          
          // Add a divider line between snags
          yPosition += 5;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
          yPosition += 10;
          
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          console.error('Error processing image:', errorMessage);
          doc.setTextColor(255, 0, 0);
          doc.text(`Error: ${errorMessage}`, margin, yPosition);
          yPosition += 10;
        }
      }
      
      // Save the PDF
      const formattedDate = now.toISOString()
        .split('T')[0]; // YYYY-MM-DD
      const formattedTime = now.toTimeString()
        .split(' ')[0] // HH:mm:ss
        .replace(/:/g, '-'); // Replace colons with hyphens for filename safety
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_'); // Replace unsafe characters with underscore
      const filename = `Report_${safeProjectName}_${formattedDate}_${formattedTime}.pdf`;
      doc.save(filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Failed to generate PDF:', errorMessage);
      alert(`Failed to generate PDF: ${errorMessage}`);
    }
  };
  
  return (
    <Button
      onClick={handleExport}
      className="flex items-center gap-2"
      variant="outline"
      disabled={!snags?.length}
    >
      <Download className="w-4 h-4" />
      Export PDF {snags?.length > 0 && `(${snags.length})`}
    </Button>
  );
} 