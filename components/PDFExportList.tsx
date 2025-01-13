import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Snag } from "@/types/snag";
import jsPDF from "jspdf";
import { GState } from "jspdf";
import { format } from "date-fns";

interface PDFExportListProps {
  snags: Snag[];
  projectName: string;
  isDarkMode?: boolean;
  onClose: () => void;
}

const compressImage = async (imageUrl: string, maxWidth = 800): Promise<string> => {
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
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
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
  const fontSize = Math.min(imageWidth * 0.15, 24);
  
  doc.setFontSize(fontSize);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 197, 94); // Green color (text-green-600) without opacity
  
  const completedText = "COMPLETED";
  const dateOffset = completionDate ? fontSize * 0.8 : 0;
  doc.text(
    completedText,
    centerX,
    centerY - (dateOffset / 2),
    {
      align: 'center',
      angle: -30
    }
  );
  
  if (completionDate) {
    doc.setFontSize(fontSize * 0.35);
    doc.setFont(undefined, 'bold');
    const dateText = format(new Date(completionDate), 'MMM d, yyyy');
    
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
};

// Add function to draw annotation pins
const drawAnnotationPins = (
  doc: jsPDF,
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number,
  annotations: any[]
) => {
  if (!annotations?.length) return;

  annotations.forEach((pin, index) => {
    const pinX = imageX + (pin.x * imageWidth) / 100;
    const pinY = imageY + (pin.y * imageHeight) / 100;
    
    // Draw pin circle with border
    doc.setFillColor(255, 0, 0);
    doc.circle(pinX, pinY, 1.5, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.circle(pinX, pinY, 1.5, 'S');
    
    // Draw pin number
    const number = (index + 1).toString();
    doc.setFillColor(255, 255, 255);
    doc.circle(pinX, pinY, 1.2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0);
    const textWidth = doc.getTextWidth(number);
    doc.text(number, pinX - (textWidth/2), pinY + 0.5);
  });
};

export default function PDFExportList({ snags, projectName, isDarkMode = false, onClose }: PDFExportListProps) {
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

      // A4 dimensions in mm (portrait)
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      
      // Add project title and metadata
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text(projectName, margin, margin + 5);
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const now = new Date();
      const dateTimeStr = `Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
      doc.text(dateTimeStr, margin, margin + 12);

      // Add summary counts
      const inProgressCount = snags.filter(s => s.status === 'In Progress').length;
      const completedCount = snags.filter(s => s.status === 'Completed').length;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`In Progress Items: ${inProgressCount}    Completed Items: ${completedCount}`, margin, margin + 20);
      
      // Draw header line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, margin + 25, pageWidth - margin, margin + 25);

      // Define column widths for portrait layout
      const colWidths = {
        nr: 15,         // Keep for bold numbers
        photo: 45,      // Keep for good photo size
        details: 45,    // Keep
        dates: 20,      // Keep
        status: 20,     // Keep
        assigned: 35    // Keep
      };

      // Define standard font sizes
      const fontSizes = {
        heading: 10,    // Header font size
        body: 8,        // Body text font size (2 points smaller)
        small: 7        // Small text (for annotations)
      };

      // Draw box around content with spacing
      const drawContentBox = (y: number, height: number, isCompleted: boolean = false) => {
        const boxPadding = 4;
        if (isCompleted) {
          // Draw green background for completed items
          doc.setFillColor(240, 255, 240);
          doc.rect(margin, y - boxPadding, contentWidth, height + (boxPadding * 2), 'F');
        }
        // Draw border box
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(margin, y - boxPadding, contentWidth, height + (boxPadding * 2));
      };

      // Table headers
      let yPosition = margin + 35;
      const headers = ['Nr', 'Photo', 'Details', 'Dates', 'Status', 'Assigned'];
      
      const drawTableHeader = (startY: number) => {
        // Header background
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, startY - 5, contentWidth, 8, 'F');
        
        let xPos = margin;
        doc.setFontSize(fontSizes.heading);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        
        headers.forEach((header, index) => {
          const colWidth = Object.values(colWidths)[index];
          const alignment = ['Nr', 'Status', 'Dates', 'Assigned'].includes(header) ? 'center' : 'left';
          const xOffset = alignment === 'center' ? colWidth / 2 : 3;
          doc.text(header, xPos + xOffset, startY - 1, { align: alignment });
          xPos += colWidth;
        });

        return startY + 10;
      };

      // Initial header
      yPosition = drawTableHeader(margin + 35);

      // Add rows
      for (let i = 0; i < snags.length; i++) {
        const snag = snags[i];
        const baseRowHeight = 40;
        let rowHeight = baseRowHeight;
        let photoWidth = colWidths.photo;
        
        try {
          const photoBase64 = await compressImage(snag.photoPath);
          
          // Calculate optimal photo dimensions for portrait layout
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = photoBase64;
          });
          
          const imgAspectRatio = img.width / img.height;
          const maxPhotoHeight = baseRowHeight - 8;
          const maxPhotoWidth = colWidths.photo - 6;
          
          let imgWidth = maxPhotoWidth;
          let imgHeight = imgWidth / imgAspectRatio;
          
          if (imgHeight > maxPhotoHeight) {
            imgHeight = maxPhotoHeight;
            imgWidth = imgHeight * imgAspectRatio;
          }

          // Check if we need a new page - add more padding for boxes
          if (yPosition + rowHeight + 12 > pageHeight - margin) {
            doc.addPage();
            yPosition = margin + 10;
            yPosition = drawTableHeader(yPosition);
          }

          // Draw box and background
          drawContentBox(yPosition, rowHeight, snag.status === 'Completed');

          if (snag.status === 'Completed') {
            // Add large "Completed" watermark
            const watermarkFontSize = 20;
            doc.setFontSize(watermarkFontSize);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(34, 197, 94);
            
            const watermarkX = margin + contentWidth - 5;
            const watermarkY = yPosition + (rowHeight / 2) + 2;
            
            doc.text("COMPLETED", watermarkX, watermarkY, { 
              align: 'right',
              baseline: 'middle'
            });
            
            doc.setTextColor(0, 0, 0);
          }

          // Add row data
          let xPosition = margin;
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);

          // Snag number - center aligned with bold and larger font
          doc.setFont(undefined, 'bold');
          doc.setFontSize(fontSizes.heading);
          doc.text(snag.snagNumber.toString(), xPosition + (colWidths.nr / 2), yPosition, { align: 'center' });
          xPosition += colWidths.nr;

          // Name - left aligned with photo
          doc.setFontSize(fontSizes.heading);
          doc.setFont(undefined, 'bold');
          doc.text(snag.name || 'Untitled Entry', xPosition + 3, yPosition);

          // Photo with annotations
          if (photoBase64) {
            // Calculate maximum possible dimensions while maintaining aspect ratio
            const maxPhotoWidth = colWidths.photo - 6;  // 3mm padding on each side
            const maxPhotoHeight = rowHeight - 4;       // 2mm padding top and bottom
            
            let imgWidth = maxPhotoWidth;
            let imgHeight = imgWidth / imgAspectRatio;
            
            if (imgHeight > maxPhotoHeight) {
              imgHeight = maxPhotoHeight;
              imgWidth = imgHeight * imgAspectRatio;
            }

            // Left align with header (3mm from column start)
            const xOffset = xPosition + 3;
            const yOffset = yPosition + 2;
            
            doc.addImage(
              photoBase64,
              'JPEG',
              xOffset,
              yOffset,
              imgWidth,
              imgHeight
            );

            if (snag.status === 'Completed') {
              addCompletedWatermark(
                doc,
                xOffset,
                yOffset,
                imgWidth,
                imgHeight,
                snag.completionDate
              );
            }

            if (snag.annotations?.length) {
              drawAnnotationPins(
                doc,
                xOffset,
                yOffset,
                imgWidth,
                imgHeight,
                snag.annotations
              );
            }
          }
          xPosition += colWidths.photo;

          // Details section with standardized font sizes (without name since it's moved)
          doc.setFontSize(fontSizes.body);
          doc.setFont(undefined, 'normal');
          doc.text(`Location: ${snag.location || 'No location'}`, xPosition + 3, yPosition + 6);
          
          const description = doc.splitTextToSize(snag.description || 'No description', colWidths.details - 6);
          doc.text(description, xPosition + 3, yPosition + 11);
          
          // Annotations with smaller font
          if (snag.annotations?.length) {
            let annotationY = yPosition + 16 + (description.length * 4);
            doc.setFontSize(fontSizes.small);
            doc.setTextColor(100, 100, 100);
            snag.annotations.forEach((ann, idx) => {
              const annotText = doc.splitTextToSize(`${idx + 1}. ${ann.text}`, colWidths.details - 10);
              doc.text(annotText, xPosition + 5, annotationY);
              annotationY += annotText.length * 3;
            });
          }
          xPosition += colWidths.details;

          // Dates - center aligned
          doc.setFontSize(fontSizes.body);
          doc.setTextColor(0, 0, 0);
          const createdDate = format(new Date(snag.createdAt), 'MM/dd/yy');
          doc.text(createdDate, xPosition + (colWidths.dates / 2), yPosition, { align: 'center' });
          
          if (snag.completionDate) {
            const completionDate = format(new Date(snag.completionDate), 'MM/dd/yy');
            doc.text(completionDate, xPosition + (colWidths.dates / 2), yPosition + 5, { align: 'center' });
          }
          xPosition += colWidths.dates;

          // Status - center aligned with color
          doc.setFontSize(fontSizes.body);
          const statusColor = snag.status === 'Completed' ? [34, 197, 94] : [255, 140, 0];
          doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.setFont(undefined, 'bold');
          doc.text(snag.status, xPosition + (colWidths.status / 2), yPosition, { align: 'center' });
          
          // Add completion date under status if completed
          if (snag.status === 'Completed' && snag.completionDate) {
            doc.setFontSize(fontSizes.small);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(34, 197, 94);
            const statusCompletionDate = format(new Date(snag.completionDate), 'MM/dd/yy');
            doc.text(statusCompletionDate, xPosition + (colWidths.status / 2), yPosition + 4, { align: 'center' });
          }
          xPosition += colWidths.status;

          // Assigned To - center aligned with smaller font if needed
          doc.setFontSize(fontSizes.body);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          const assignedText = snag.assignedTo || 'Unassigned';
          doc.text(assignedText, xPosition + (colWidths.assigned / 2), yPosition, { 
            align: 'center',
            maxWidth: colWidths.assigned - 6
          });

          // Adjust spacing between boxes
          yPosition += rowHeight + 8; // Increased spacing between boxes
        } catch (error) {
          console.error('Error processing snag:', error);
        }
      }

      // Save the PDF
      const formattedDate = now.toISOString().split('T')[0];
      const formattedTime = now.toTimeString()
        .split(' ')[0]
        .replace(/:/g, '-');
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `List_Report_${safeProjectName}_${formattedDate}_${formattedTime}.pdf`;
      
      doc.save(filename);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      Export List PDF {snags?.length > 0 && `(${snags.length})`}
    </Button>
  );
} 