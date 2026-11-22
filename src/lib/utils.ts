import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatQuantity(quantity: number | undefined | null, unitSymbol?: string): string {
  const num = quantity ?? 0;
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
  return unitSymbol ? `${formatted} ${unitSymbol}` : formatted;
}

export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateString);
  }
}

export interface TaxCalculationParams {
  rate: number;
  quantity: number;
  discountPercent?: number;
  gstRate: number;
  isInterState?: boolean;
}

export interface TaxCalculationResult {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  taxAmount: number;
  totalPrice: number;
}

export function calculateItemTax({
  rate,
  quantity,
  discountPercent = 0,
  gstRate,
  isInterState = false,
}: TaxCalculationParams): TaxCalculationResult {
  const grossAmount = +(rate * quantity).toFixed(2);
  const discountAmount = +(grossAmount * (discountPercent / 100)).toFixed(2);
  const taxableAmount = +(grossAmount - discountAmount).toFixed(2);

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;
  let taxAmount = 0;

  if (gstRate > 0) {
    if (isInterState) {
      igstRate = gstRate;
      igstAmount = +(taxableAmount * (igstRate / 100)).toFixed(2);
      taxAmount = igstAmount;
    } else {
      cgstRate = +(gstRate / 2).toFixed(2);
      sgstRate = +(gstRate / 2).toFixed(2);
      cgstAmount = +(taxableAmount * (cgstRate / 100)).toFixed(2);
      sgstAmount = +(taxableAmount * (sgstRate / 100)).toFixed(2);
      taxAmount = +(cgstAmount + sgstAmount).toFixed(2);
    }
  }

  const totalPrice = +(taxableAmount + taxAmount).toFixed(2);

  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    taxAmount,
    totalPrice,
  };
}

export function getStockStatus(currentStock: number, minStockLevel: number = 5): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minStockLevel) return 'low_stock';
  return 'in_stock';
}

