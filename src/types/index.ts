export type UserRole = 'admin';

export type StoreId = 'sangam-sales-automobiles' | 'sangam-traders';

export interface StoreAccount {
  id: StoreId;
  name: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  ownerName: string;
  mobile: string;
  defaultPassword: string;
  address: string;
  email: string;
  gstin: string;
  invoicePrefix: string;
  state: string;
  pincode: string;
  categoryBadges: string[];
}

export const STORE_ACCOUNTS: StoreAccount[] = [
  {
    id: 'sangam-sales-automobiles',
    name: 'Sangam Sales and Automobiles',
    shortName: 'Sangam Sales & Auto',
    tagline: 'Hardware, Industrial Tools & Automobile Spare Parts',
    logoUrl: '/images/sangam_sales_automobiles_logo_v2.png',
    ownerName: 'MR. Rajendra Gaikwad',
    mobile: '9766551783',
    defaultPassword: 'Sangam@9766',
    address: 'BankarPhata, Otur, Maharashtra',
    email: 'contact@sangamsales.com',
    gstin: '27ANPPG4334F1Z0',
    invoicePrefix: 'SSA-INV-',
    state: 'Maharashtra',
    pincode: '412409',
    categoryBadges: ['Hardware & Tools', 'Auto Parts', 'Lubricants & Oils'],
  },
  {
    id: 'sangam-traders',
    name: 'Sangam Traders',
    shortName: 'Sangam Traders',
    tagline: 'Wholesale Building Materials, Cement, Iron & Steel Trading',
    logoUrl: '/images/sangam_traders_logo_v2.png',
    ownerName: 'MR. Rajendra Gaikwad',
    mobile: '9766551783',
    defaultPassword: 'Traders@9766',
    address: 'BankarPhata, Otur, Maharashtra',
    email: 'contact@sangamtraders.com',
    gstin: '27ANPPG4334F1Z0',
    invoicePrefix: 'ST-INV-',
    state: 'Maharashtra',
    pincode: '412409',
    categoryBadges: ['Cement & Concrete', 'TMT Rebar & Steel', 'Sanitary & Pipes'],
  },
];

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessSettings {
  id: string;
  shopName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  state: string;
  pincode: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultGstRate: number; // e.g. 18
  defaultDiscountRate: number; // e.g. 0
  invoiceFooter: string;
  termsAndConditions: string;
  defaultPaymentMethod: PaymentMethod;
  lowStockNotificationThreshold: number;
  allowNegativeStock: boolean;
  currencySymbol: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount?: number;
  createdAt: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  isFractional: boolean; // true for kg, m, ltr; false for piece, box
  createdAt: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName?: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number; // e.g., 0, 5, 12, 18, 28
  unitId: string;
  unitSymbol?: string;
  currentStock: number;
  minStockLevel: number;
  supplierId?: string;
  supplierName?: string;
  imageUrl?: string;
  stockStatus?: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  totalPurchases: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  notes?: string;
  totalPurchased?: number;
  outstandingBalance?: number;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit';
export type PaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'refunded';
export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId?: string;
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  customerGstin?: string;
  customerState?: string;
  isInterState: boolean;
  isGstBill?: boolean;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  roundingAdjustment: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export type PurchaseStatus = 'draft' | 'received' | 'cancelled';

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseItem[];
}

export interface Payment {
  id: string;
  paymentNumber: string;
  referenceType: 'invoice' | 'purchase' | 'direct';
  referenceId: string;
  referenceNumber: string;
  partyType: 'customer' | 'supplier';
  partyId: string;
  partyName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export type StockMovementType =
  | 'opening_stock'
  | 'purchase'
  | 'sale'
  | 'sale_return'
  | 'purchase_return'
  | 'damaged_stock'
  | 'manual_adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  transactionType: StockMovementType;
  quantityChange: number; // positive for addition, negative for deduction
  previousStock: number;
  newStock: number;
  referenceId?: string;
  referenceNumber?: string;
  userId: string;
  userName?: string;
  reason: string;
  createdAt: string;
}

export type AdjustmentType = 'add' | 'reduce' | 'damage' | 'lost' | 'physical_correction';

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  productId: string;
  productName: string;
  sku: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  details?: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockItems: number;
  todaysSales: number;
  monthlySales: number;
  todaysBillsCount: number;
  lowStockCount: number;
  totalInventoryValue: number;
  totalCustomerOutstanding: number;
  totalSupplierOutstanding: number;
  dailySalesTrend: { date: string; amount: number; bills: number }[];
  categorySales: { category: string; amount: number; count: number }[];
  topSellingProducts: { id: string; name: string; quantity: number; revenue: number }[];
  recentInvoices: Invoice[];
  lowStockProducts: Product[];
  recentPurchases: Purchase[];
  recentMovements: StockMovement[];
}

