import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Snag } from "@/types/snag";
import jsPDF from "jspdf";
import { format } from "date-fns";

interface PDFExportListProps {
  snags: Snag[];
  projectName: string;
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
        
        // Draw the original image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Remove the watermark code from here since it's handled by the PDF generation
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
  const fontSize = Math.min(imageWidth * 0.2, 30); // Smaller font size for list view
  
  // Add "COMPLETED" text centered on the image
  doc.setFontSize(fontSize);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 197, 94); // text-green-600
  
  const completedText = "COMPLETED";
  // Move the main text up by half the date height to center the whole watermark
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
  
  // Add completion date if available
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

export default function PDFExportList({ snags, projectName }: PDFExportListProps) {
  const handleExport = async () => {
    if (!snags?.length) {
      alert('Please select at least one snag to export.');
      return;
    }

    try {
      // Initialize PDF in landscape mode (A4)
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // A4 dimensions in mm (landscape)
      const pageWidth = 297;
      const pageHeight = 210;
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

      // Add summary counts
      const inProgressCount = snags.filter(s => s.status === 'In Progress').length;
      const completedCount = snags.filter(s => s.status === 'Completed').length;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`In Progress Items: ${inProgressCount}    Completed Items: ${completedCount}`, margin, margin + 20);
      
      // Draw header line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, margin + 25, pageWidth - margin, margin + 25);

      // Table header
      let yPosition = margin + 35;
      // Adjust column widths for better layout - giving more space to text columns
      interface ColumnWidths {
        nr: number;
        name: number;
        location: number;
        description: number;
        date: number;
        completion: number;
        status: number;
        photo: number;
        notes: number;
        assigned: number;
      }
      
      const colWidths: ColumnWidths = {
        nr: 12,          // For "Nr"
        name: 45,        // For "Name" (reduced to make space for location)
        location: 35,    // For "Location"
        description: 54, // Reduced for better fit
        date: 18,        // For stacked "Creation\nDate"
        completion: 18,  // For stacked "Completed\nDate"
        status: 22,      // For "Status"
        photo: 45,       // For "Photo"
        notes: 25,       // For "Notes"
        assigned: 38     // For "Assigned"
      };

      // Validate total width matches content width
      const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
      if (totalWidth > contentWidth) {
        const scale = contentWidth / totalWidth;
        (Object.keys(colWidths) as Array<keyof ColumnWidths>).forEach(key => {
          colWidths[key] = Math.floor(colWidths[key] * scale);
        });
      }

      const headers = [
        'Nr', 
        'Name',
        'Location',
        'Description', 
        'Creation\nDate', 
        'Completed\nDate', 
        'Status', 
        'Photo', 
        'Notes', 
        'Assigned'
      ];
      
      // Create a function to draw headers
      const drawTableHeader = (startY: number) => {
        // Add table header with gray background
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, startY - 5, contentWidth, 8, 'F');
        
        // Draw header texts with consistent formatting
        let xPos = margin;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        headers.forEach((header, index) => {
          const colWidth = Object.values(colWidths)[index];
          const alignment = ['Nr', 'Status', 'Creation\nDate', 'Completed\nDate'].includes(header) ? 'center' : 'left';
          const xOffset = alignment === 'center' ? colWidth / 2 : 3;
          doc.text(header, xPos + xOffset, startY - 1, { align: alignment });
          xPos += colWidth;
        });
        return startY + 10; // Return the next Y position
      };

      // Initial header
      yPosition = drawTableHeader(margin + 35);

      // Function to calculate optimal dimensions
      const calculateOptimalDimensions = async (photoBase64: string, baseRowHeight: number, baseColWidth: number) => {
        const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = src;
          });
        };

        try {
          const dimensions = await getImageDimensions(photoBase64);
          const aspectRatio = dimensions.width / dimensions.height;
          
          // Base dimensions with padding
          const maxBaseHeight = baseRowHeight - 6; // 3mm padding top and bottom
          const maxBaseWidth = baseColWidth - 6;  // 3mm padding left and right
          
          let imgWidth, imgHeight, newRowHeight, newColWidth;
          
          if (aspectRatio > 1) {
            // Landscape image
            if (dimensions.width / dimensions.height > maxBaseWidth / maxBaseHeight) {
              // Width constrained
              imgWidth = maxBaseWidth;
              imgHeight = imgWidth / aspectRatio;
              newRowHeight = Math.max(baseRowHeight, imgHeight + 6); // Add padding
              newColWidth = baseColWidth;
            } else {
              // Height constrained
              imgHeight = maxBaseHeight;
              imgWidth = imgHeight * aspectRatio;
              newRowHeight = baseRowHeight;
              newColWidth = Math.max(baseColWidth, imgWidth + 6); // Add padding
            }
          } else {
            // Portrait image
            if (dimensions.height / dimensions.width > maxBaseHeight / maxBaseWidth) {
              // Height constrained
              imgHeight = maxBaseHeight;
              imgWidth = imgHeight * aspectRatio;
              newRowHeight = baseRowHeight;
              newColWidth = Math.max(baseColWidth, imgWidth + 6);
            } else {
              // Width constrained
              imgWidth = maxBaseWidth;
              imgHeight = imgWidth / aspectRatio;
              newRowHeight = Math.max(baseRowHeight, imgHeight + 6);
              newColWidth = baseColWidth;
            }
          }

          return {
            imgWidth,
            imgHeight,
            rowHeight: newRowHeight,
            colWidth: newColWidth
          };
        } catch (error) {
          console.error('Error calculating dimensions:', error);
          return {
            imgWidth: baseColWidth - 6,
            imgHeight: baseRowHeight - 6,
            rowHeight: baseRowHeight,
            colWidth: baseColWidth
          };
        }
      };

      // Add rows
      for (const snag of snags) {
        const baseRowHeight = 35;
        let rowHeight = baseRowHeight;
        let photoWidth = colWidths.photo;
        
        try {
          // Set current snag data for image processing
          (window as any).currentSnagStatus = snag.status;
          (window as any).currentSnagCompletionDate = snag.completionDate;
          (window as any).currentSnagAnnotations = snag.annotations;

          const photoBase64 = await compressImage(snag.photoPath);
          
          // Calculate optimal dimensions for this row
          const { imgWidth, imgHeight, rowHeight: newRowHeight, colWidth: newColWidth } = 
            await calculateOptimalDimensions(photoBase64, baseRowHeight, colWidths.photo);
          
          rowHeight = newRowHeight;
          photoWidth = newColWidth;

          // Check if we need a new page
          if (yPosition + rowHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin + 10;
            yPosition = drawTableHeader(yPosition);
          }

          // Draw row background for completed items
          if (snag.status === 'Completed') {
            doc.setFillColor(240, 255, 240);
            doc.rect(margin, yPosition - 4, contentWidth, rowHeight, 'F');
          }

          // Add row data
          let xPosition = margin;
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');

          // NR - center aligned
          doc.text(snag.snagNumber.toString(), xPosition + (colWidths.nr / 2), yPosition, { align: 'center' });
          xPosition += colWidths.nr;

          // NAME - left aligned with more padding
          doc.setFont(undefined, 'bold');
          const nameLines = doc.splitTextToSize(snag.name || 'Untitled Snag', colWidths.name - 6);
          doc.text(nameLines, xPosition + 3, yPosition);
          xPosition += colWidths.name;

          // LOCATION - left aligned with padding
          doc.setFont(undefined, 'normal');
          const locationLines = doc.splitTextToSize(snag.location || 'No location', colWidths.location - 6);
          doc.text(locationLines, xPosition + 3, yPosition);
          xPosition += colWidths.location;

          // DESCRIPTION - left aligned with more padding
          doc.setFont(undefined, 'normal');
          const descriptionLines = doc.splitTextToSize(snag.description || 'No description', colWidths.description - 6);
          doc.text(descriptionLines, xPosition + 3, yPosition);
          xPosition += colWidths.description;

          // CREATED DATE - center aligned
          const createdDate = format(new Date(snag.createdAt), 'MM/dd/yy');
          doc.text(createdDate, xPosition + (colWidths.date / 2), yPosition, { align: 'center' });
          xPosition += colWidths.date;

          // COMPLETION DATE - center aligned
          if (snag.completionDate) {
            const completionDate = format(new Date(snag.completionDate), 'MM/dd/yy');
            doc.text(completionDate, xPosition + (colWidths.completion / 2), yPosition, { align: 'center' });
          }
          xPosition += colWidths.completion;

          // STATUS - center aligned with color
          const statusColor = snag.status === 'Completed' ? [34, 197, 94] : [255, 140, 0]; // Dark orange for In Progress
          doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.setFont(undefined, 'bold'); // Make status bold
          doc.text(snag.status, xPosition + (colWidths.status / 2), yPosition, { align: 'center' });
          xPosition += colWidths.status;

          // PHOTO - with dynamic sizing
          if (photoBase64) {
            // Center the image in the column
            const xOffset = (photoWidth - imgWidth) / 2;
            const yOffset = (rowHeight - imgHeight) / 2;
            doc.addImage(
              photoBase64, 
              'JPEG', 
              xPosition + xOffset, 
              yPosition - 2 + yOffset, 
              imgWidth, 
              imgHeight
            );

            // Add watermark for completed snags
            if (snag.status === 'Completed') {
              addCompletedWatermark(
                doc,
                xPosition + xOffset,
                yPosition - 2 + yOffset,
                imgWidth,
                imgHeight,
                snag.completionDate
              );
            }

            // Add annotation pins
            if (snag.annotations?.length) {
              drawAnnotationPins(
                doc,
                xPosition + xOffset,
                yPosition - 2 + yOffset,
                imgWidth,
                imgHeight,
                snag.annotations
              );
            }
          }
          xPosition += photoWidth;

          // ANNOTATIONS - left aligned with clear formatting
          if (snag.annotations?.length) {
            doc.setFontSize(7); // Keep annotations smaller
            doc.setTextColor(255, 140, 0); // Orange color for annotations
            doc.setFont(undefined, 'normal'); // Remove bold from annotations
            const annotationText = snag.annotations
              .map((a, i) => `${i + 1}. ${a.text}`)
              .join('\n');
            const annotationLines = doc.splitTextToSize(annotationText, colWidths.notes - 4);
            doc.text(annotationLines, xPosition + 2, yPosition);
          }
          xPosition += colWidths.notes;

          // ASSIGNED - center aligned with better text wrapping
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          const assignedText = snag.assignedTo || 'Unassigned';
          const assignedWidth = colWidths.assigned - 6; // More padding for wrapped text
          const assignedLines = doc.splitTextToSize(assignedText, assignedWidth);
          
          // Calculate vertical position for multi-line text
          const lineHeight = 4; // Approximate line height in mm
          const totalTextHeight = assignedLines.length * lineHeight;
          const textYPosition = yPosition - (totalTextHeight / 2) + (lineHeight / 2);
          
          doc.text(assignedLines, xPosition + (colWidths.assigned / 2), textYPosition, { 
            align: 'center',
            maxWidth: assignedWidth
          });

          // Add light separator line between rows with more spacing
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, yPosition + rowHeight - 1, margin + contentWidth, yPosition + rowHeight - 1);

          yPosition += rowHeight;

          // Clear global state only after image processing is complete
          (window as any).currentSnagStatus = null;
          (window as any).currentSnagCompletionDate = null;
          (window as any).currentSnagAnnotations = null;
        } catch (error) {
          console.error('Error processing snag:', error);
        }
      }
      
      // Save the PDF
      const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const formattedTime = now.toTimeString()
        .split(' ')[0] // HH:mm:ss
        .replace(/:/g, '-'); // Replace colons with hyphens for filename safety
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