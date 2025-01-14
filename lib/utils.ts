import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Check if date is valid
    if (isNaN(d.getTime())) {
      console.warn('Invalid date:', date);
      return '';
    }
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const compressImage = async (
  imageUrl: string,
  options: {
    maxWidth?: number;
    quality?: number;
    maxSizeMB?: number;
  } = {}
): Promise<string> => {
  const { maxWidth = 1920, quality = 0.8, maxSizeMB = 2 } = options;

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
        
        // Draw image with high quality settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get initial compressed image
        let compressedImage = canvas.toDataURL("image/jpeg", quality);
        
        // If maxSizeMB is specified, try to meet the size requirement
        if (maxSizeMB) {
          let currentQuality = quality;
          while (getBase64Size(compressedImage) > maxSizeMB * 1024 * 1024 && currentQuality > 0.1) {
            currentQuality -= 0.1;
            compressedImage = canvas.toDataURL("image/jpeg", currentQuality);
          }
        }
        
        resolve(compressedImage);
      } catch (err) {
        reject(new Error(`Failed to process image: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
};

// Helper function to calculate base64 string size
const getBase64Size = (base64String: string): number => {
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const padding = (base64String.charAt(base64String.length - 2) === '=') ? 2 : 
                 (base64String.charAt(base64String.length - 1) === '=') ? 1 : 0;
  return (base64Length * 0.75) - padding;
};
