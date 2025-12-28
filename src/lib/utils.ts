import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a phone number to E.164 format with +1 prefix for US numbers
 */
export function formatPhoneE164(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If 10 digits, add +1 prefix (US number)
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If 11 digits starting with 1, add + prefix
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  // If already has country code or other format, just ensure + prefix
  if (digits.length > 10 && !phone.startsWith("+")) {
    return `+${digits}`;
  }
  
  // Return original if already formatted or unknown format
  return phone.startsWith("+") ? phone : digits;
}
