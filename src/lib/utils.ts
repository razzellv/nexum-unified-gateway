// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// IMAGE UTILITIES
// ============================================

/**
 * Resize an image file to fit within max dimensions
 * @param file - The image file to resize
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1080)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Promise<File> - Resized image as File
 */
export async function resizeImage(
  file: File, 
  maxWidth = 1920, 
  maxHeight = 1080, 
  quality = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            // Create new file from blob
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log('✅ Image resized:', {
              original: `${Math.round(file.size / 1024)}KB`,
              resized: `${Math.round(resizedFile.size / 1024)}KB`,
              dimensions: `${width}x${height}`
            });
            
            resolve(resizedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Check if image needs resizing based on file size
 * @param file - The image file to check
 * @param maxSizeKB - Maximum size in KB (default: 8000 = 8MB)
 * @returns boolean - True if image should be resized
 */
export function shouldResizeImage(file: File, maxSizeKB = 8000): boolean {
  const sizeKB = file.size / 1024;
  return sizeKB > maxSizeKB;
}
