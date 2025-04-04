
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

/**
 * Returns a human-readable name for a schedule type
 */
export function getScheduleTypeName(scheduleType: string): string {
  const scheduleNames: Record<string, string> = {
    'weekly': 'Weekly Maintenance (Every 7 Days)',
    '3week': '3 Weeks Maintenance (Every 21 Days)',
    'monthly': 'Monthly Maintenance (Every Month)',
    'bimonthly': 'Bi-Monthly Maintenance (Every 2 Months)',
    'quarterly': 'Quarterly Maintenance (Every 3 Months)',
    'semiannual': 'Semi-Annual Maintenance (Every 6 Months)',
    'annual': 'Annual Maintenance (Every Year)',
    'biannual': 'Bi-Annual Maintenance (Every 2 Years)',
    '5year': '5 Year Maintenance (Every 5 Years)',
    '6year': '6 Year Maintenance (Every 6 Years)'
  };
  
  return scheduleNames[scheduleType] || scheduleType;
}

/**
 * Returns all available schedule types
 */
export function getScheduleTypes(): { value: string; label: string }[] {
  return [
    { value: 'weekly', label: 'Weekly Maintenance (Every 7 Days)' },
    { value: '3week', label: '3 Weeks Maintenance (Every 21 Days)' },
    { value: 'monthly', label: 'Monthly Maintenance (Every Month)' },
    { value: 'bimonthly', label: 'Bi-Monthly Maintenance (Every 2 Months)' },
    { value: 'quarterly', label: 'Quarterly Maintenance (Every 3 Months)' },
    { value: 'semiannual', label: 'Semi-Annual Maintenance (Every 6 Months)' },
    { value: 'annual', label: 'Annual Maintenance (Every Year)' },
    { value: 'biannual', label: 'Bi-Annual Maintenance (Every 2 Years)' },
    { value: '5year', label: '5 Year Maintenance (Every 5 Years)' },
    { value: '6year', label: '6 Year Maintenance (Every 6 Years)' }
  ];
}
