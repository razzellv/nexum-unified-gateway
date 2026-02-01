
import { clsx, type ClassValue } from "clsx";

import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {

  return twMerge(clsx(inputs));

}

/**

 * Auto-resizes images before base64 conversion (all-in-one function)

 */

export async function fileToBase64WithResize(file: File): Promise<string> {

  const maxSizeKB = 8000;

  const sizeKB = file.size / 1024;

  

  let imageFile = file;

  

  // Check if resize needed

  if (sizeKB > maxSizeKB) {

    console.log('📸 Resizing image...');

    console.log   Original: ${Math.round(sizeKB)}KB);

    

    try {

      // Resize inline

      imageFile = await new Promise<File>((resolve, reject) => {

        const reader = new FileReader();

        reader.onerror = () => reject(new Error('Failed to read file'));

        reader.onload = (e) => {

          const img = new Image();

          img.onerror = () => reject(new Error('Failed to load image'));

          img.onload = () => {

            let width = img.width;

            let height = img.height;

            const maxWidth = 1920;

            const maxHeight = 1080;

            

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

              0.85

            );

          };

          img.src = e.target?.result as string;

        };

        reader.readAsDataURL(file);

      });

      

      console.log   Resized: ${Math.round(imageFile.size / 1024)}KB);

      console.log('✅ Resized successfully');

    } catch (error) {

      console.error('⚠️ Resize failed:', error);

    }

  } else {

    console.log('✅ Image size OK, no resize needed');

  }

  

  // Convert to base64

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = () => resolve(reader.result as string);

    reader.readAsDataURL(imageFile);

  });

}

