import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Snag } from "@/types/snag";
import jsPDF from "jspdf";

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
  annotations: Snag['annotations'],
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number
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
        doc.setTextColor(0, 0, 0);
        doc.text(`Snag #${snag.snagNumber}`, margin + 2, yPosition + 3);
        yPosition += 15;
        
        // Add snag details in a grid layout
        doc.setFontSize(10);
        const details = [
          [`Priority: ${snag.priority}`, `Status: ${snag.status}`],
          [`Assigned To: ${snag.assignedTo || 'Unassigned'}`, `Created: ${new Date(snag.createdAt).toLocaleDateString()}`]
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
          
          // Add annotation pins
          if (snag.annotations?.length) {
            drawAnnotationPins(doc, snag.annotations, margin + xOffset, yPosition, imgWidth, imgHeight);
          }
          
          yPosition += imgHeight + 10;
          
          // Add annotation list if there are annotations
          if (snag.annotations?.length) {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text('Annotations:', margin, yPosition);
            yPosition += 6;
            
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            snag.annotations.forEach((annotation, index) => {
              // Skip if annotation text is empty or undefined
              if (!annotation?.text?.trim()) return;
              
              // Format annotation text with number and content
              const annotationText = `${index + 1}. ${annotation.text}`;
              const splitAnnotation = doc.splitTextToSize(annotationText, contentWidth - 10); // Reduced width for better readability
              
              // Check if we need a new page for this annotation
              if (yPosition + (splitAnnotation.length * 5) > pageHeight - margin) {
                doc.addPage();
                yPosition = margin + 10;
              }
              
              // Add the annotation text
              doc.text(splitAnnotation, margin, yPosition);
              yPosition += (splitAnnotation.length * 5) + 3;
            });
            
            // Add extra space after annotations
            yPosition += 5;
          }
          
          // Add a divider line between snags
          yPosition += 10;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);
          yPosition += 15;
          
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