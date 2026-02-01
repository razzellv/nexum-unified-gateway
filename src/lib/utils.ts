
import { clsx, type ClassValue } from "clsx";

import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {

  return twMerge(clsx(inputs));

}

/**

 * Check if image needs resizing

 */

export function shouldResizeImage(file: File, maxSizeKB = 8000): boolean {

  const sizeKB = file.size / 1024;

  return sizeKB > maxSizeKB;

}

/**

 * Resize an image file to fit within max dimensions

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

        

        const canvas = document.createElement('canvas');

        canvas.width = width;

        canvas.height = height;

        

        const ctx = canvas.getContext('2d');

        if (!ctx) {

          reject(new Error('Failed to get canvas context'));

          return;

        }

        

        ctx.imageSmoothingEnabled = true;

        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        

        canvas.toBlob(

          (blob) => {

            if (!blob) {

              reject(new Error('Failed to create blob'));

              return;

            }

            resolve(new File([blob], file.name, {

              type: 'image/jpeg',

              lastModified: Date.now()

            }));

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

 * Auto-resizes images before base64 conversion

 */

export async function fileToBase64WithResize(file: File): Promise<string> {

  let imageFile = file;

  

  if (shouldResizeImage(file)) {

    console.log('📸 Resizing image...');

    console.log   Original: ${Math.round(file.size / 1024)}KB);

    try {

      imageFile = await resizeImage(file);

      console.log   Resized: ${Math.round(imageFile.size / 1024)}KB);

      console.log('✅ Resized successfully');

    } catch (error) {

      console.error('⚠️ Resize failed:', error);

    }

  } else {

    console.log('✅ Image size OK, no resize needed');

  }

  

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = () => resolve(reader.result as string);

    reader.readAsDataURL(imageFile);

  });

}

