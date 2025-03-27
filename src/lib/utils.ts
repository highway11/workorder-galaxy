
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determines if a file is an image based on its name or content type
 */
export function isImageFile(fileName: string | null): boolean {
  if (!fileName) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

/**
 * Determines if a file is a PDF based on its name or content type
 */
export function isPdfFile(fileName: string | null): boolean {
  if (!fileName) return false;
  return fileName.toLowerCase().endsWith('.pdf');
}

/**
 * Creates a public URL for a Supabase storage file
 */
export function getSupabasePublicUrl(bucketName: string, filePath: string | null): string | null {
  if (!filePath) return null;
  return `https://vxqruxwaqmokirlmkmxs.supabase.co/storage/v1/object/public/${bucketName}/${filePath}`;
}
