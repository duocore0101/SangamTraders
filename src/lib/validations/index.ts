import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU / Product code is required'),
  barcode: z.string().optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Please select a category'),
  subcategory: z.string().optional().or(z.literal('')),
  brand: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  gstRate: z.number().min(0).max(100, 'GST rate must be between 0 and 100'),
  unitId: z.string().min(1, 'Please select a unit'),
  currentStock: z.number().min(0, 'Current stock must be non-negative'),
  minStockLevel: z.number().min(0, 'Minimum stock level must be non-negative'),
  supplierId: z.string().optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
});

export const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string(),
  sku: z.string(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string(),
  unitPrice: z.number().min(0, 'Price must be non-negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().default(0),
  taxableAmount: z.number(),
  gstRate: z.number().min(0),
  cgstRate: z.number().default(0),
  cgstAmount: z.number().default(0),
  sgstRate: z.number().default(0),
  sgstAmount: z.number().default(0),
  igstRate: z.number().default(0),
  igstAmount: z.number().default(0),
  totalPrice: z.number(),
});

export const invoiceSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  customerMobile: z.string().min(10, 'Valid 10-digit mobile number required'),
  customerAddress: z.string().optional().or(z.literal('')),
  customerGstin: z.string().optional().or(z.literal('')),
  customerState: z.string().default('Maharashtra'),
  isInterState: z.boolean().default(false),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'credit']),
  amountPaid: z.coerce.number().min(0, 'Amount paid cannot be negative'),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(invoiceItemSchema).min(1, 'At least one product item is required'),
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  state: z.string().optional().default('Maharashtra'),
});

export const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  contactPerson: z.string().optional().or(z.literal('')),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  state: z.string().optional().default('Maharashtra'),
  notes: z.string().optional().or(z.literal('')),
});

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string(),
  sku: z.string(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string(),
  purchaseRate: z.number().min(0, 'Purchase rate must be non-negative'),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().default(0),
  totalAmount: z.number(),
});

export const purchaseSchema = z.object({
  supplierId: z.string().min(1, 'Please select a supplier'),
  supplierInvoiceNumber: z.string().optional().or(z.literal('')),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'credit']),
  amountPaid: z.coerce.number().min(0, 'Amount paid cannot be negative'),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  adjustmentType: z.enum(['add', 'reduce', 'damage', 'lost', 'physical_correction']),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  reason: z.string().min(3, 'A reason for adjustment is required for audit trail'),
});

export const paymentSchema = z.object({
  referenceType: z.enum(['invoice', 'purchase', 'direct']),
  referenceId: z.string().min(1, 'Reference ID is required'),
  referenceNumber: z.string().min(1, 'Reference number is required'),
  partyType: z.enum(['customer', 'supplier']),
  partyId: z.string().min(1, 'Party ID is required'),
  partyName: z.string().min(1, 'Party name is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'credit']),
  notes: z.string().optional().or(z.literal('')),
});

export const businessSettingsSchema = z.object({
  shopName: z.string().min(2, 'Shop name is required'),
  tagline: z.string().optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(8, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  gstin: z.string().optional().or(z.literal('')),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Pincode is required'),
  invoicePrefix: z.string().min(1, 'Invoice prefix is required'),
  defaultGstRate: z.coerce.number().min(0).max(100),
  defaultDiscountRate: z.coerce.number().min(0).max(100),
  invoiceFooter: z.string().optional().or(z.literal('')),
  termsAndConditions: z.string().optional().or(z.literal('')),
  defaultPaymentMethod: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'credit']),
  lowStockNotificationThreshold: z.coerce.number().min(1),
  allowNegativeStock: z.boolean(),
});
