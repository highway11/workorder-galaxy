
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

/**
 * Formats a number as currency (USD)
 */
export function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Helper function to invalidate related queries for a workorder
 */
export function invalidateWorkOrderQueries(queryClient: any, workOrderId: string) {
  queryClient.invalidateQueries({ queryKey: ['workorder-details', workOrderId] });
  queryClient.invalidateQueries({ queryKey: ['workorder-totals', workOrderId] });
  queryClient.invalidateQueries({ queryKey: ['workorder', workOrderId] });
}
