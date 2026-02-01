import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Auto-resizes images before base64 conversion
 */
export async function fileToBase64WithResize(file: File): Promise<string> {
  let imageFile = file;
  
  if (shouldResizeImage(file)) {
    console.log('📸 Resizing image...');
    try {
      imageFile = await resizeImage(file);
      console.log('✅ Resized successfully');
    } catch (error) {
      console.error('⚠️ Resize failed:', error);
    }
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(imageFile);
  });
}
