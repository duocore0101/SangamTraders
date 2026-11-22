'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { storeService } from '@/services/store';
import { Product, Customer, InvoiceItem, PaymentMethod, Invoice } from '@/types';
import { formatCurrency, formatQuantity, calculateItemTax } from '@/lib/utils';
import { generateInvoicePdf } from '@/lib/pdf/invoicePdf';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  UserPlus, 
  CheckCircle2, 
  Printer, 
  Download, 
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  RotateCcw,
  ShoppingBag,
  User,
  UserCheck,
  ArrowDown,
  Phone,
  MapPin,
  AlertCircle,
  Tag,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

interface CartItem extends InvoiceItem {
  maxStock: number;
}

// ----------------------------------------------------
// Reusable Customer Section (Mobile & Desktop)
// ----------------------------------------------------
interface CustomerSectionProps {
  customers: Customer[];
  selectedCustomerId: string;
  onCustomerSelect: (id: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerMobile: string;
  setCustomerMobile: (mobile: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  customerGstin: string;
  setCustomerGstin: (gstin: string) => void;
  customerState: string;
  setCustomerState: (state: string) => void;
  isInterState: boolean;
  setIsInterState: (inter: boolean) => void;
  storeState: string;
  onQuickAddOpen: () => void;
  isMobileLayout?: boolean;
}

function CustomerSection({
  customers,
  selectedCustomerId,
  onCustomerSelect,
  customerName,
  setCustomerName,
  customerMobile,
  setCustomerMobile,
  customerAddress,
  setCustomerAddress,
  customerGstin,
  setCustomerGstin,
  customerState,
  setCustomerState,
  isInterState,
  setIsInterState,
  storeState,
  onQuickAddOpen,
  isMobileLayout = false,
}: CustomerSectionProps) {
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4 ${isMobileLayout ? 'border-blue-200 ring-2 ring-blue-500/10' : ''}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            1
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              Customer Information
              {isMobileLayout && (
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                  Step 1
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              Select registered contractor or enter walk-in details
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onQuickAddOpen}
          className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 shrink-0 active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Quick Add</span>
        </button>
      </div>

      {/* Customer Mode Selection Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => onCustomerSelect('')}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            !selectedCustomerId
              ? 'bg-white text-blue-600 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Walk-in (Cash)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!selectedCustomerId && customers.length > 0) {
              onCustomerSelect(customers[0].id);
            }
          }}
          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            selectedCustomerId
              ? 'bg-white text-blue-600 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Registered Client</span>
        </button>
      </div>

      {/* Active Mode Form Body */}
      {selectedCustomerId ? (
        // Registered Customer Dropdown & Detail Card
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Select Client / Contractor
            </label>
            <Select
              value={selectedCustomerId}
              onChange={(e) => onCustomerSelect(e.target.value)}
              className="text-xs sm:text-sm font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile}) {c.outstandingBalance > 0 ? `[Due: ₹${c.outstandingBalance}]` : ''}
                </option>
              ))}
            </Select>
          </div>

          {selectedCustomer && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</p>
                  <p className="text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedCustomer.mobile}
                  </p>
                  {selectedCustomer.address && (
                    <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {selectedCustomer.address}
                    </p>
                  )}
                  {selectedCustomer.gstin && (
                    <p className="text-slate-500 text-[10px] font-mono mt-0.5">
                      GSTIN: {selectedCustomer.gstin}
                    </p>
                  )}
                </div>

                {selectedCustomer.outstandingBalance > 0 && (
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                      <AlertCircle className="w-3 h-3" /> Due: ₹{selectedCustomer.outstandingBalance}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Walk-in Customer Form
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Customer Name
              </label>
              <input
                type="text"
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Mobile Number (For Bill SMS/WhatsApp)
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Optional Site Address & GSTIN Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-1 cursor-pointer"
            >
              {showOptionalFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showOptionalFields ? 'Hide Address & GSTIN' : '+ Add Site Address / GSTIN (Optional)'}</span>
            </button>

            {showOptionalFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="Site / Delivery Location"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Customer GSTIN (e.g. 07AAAAA0000A1Z5)"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tax / Interstate GST Toggle */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span>Tax Region:</span>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-800 select-none bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
          <input
            type="checkbox"
            checked={isInterState}
            onChange={(e) => setIsInterState(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-[11px] font-bold">
            {isInterState ? 'Inter-State (IGST)' : `Intra-State (${storeState} CGST+SGST)`}
          </span>
        </label>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main POS Billing Page
// ----------------------------------------------------
export default function NewBillPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerState, setCustomerState] = useState('Maharashtra');
  const [isInterState, setIsInterState] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // With GST vs Without GST Bill Mode
  const [isGstBill, setIsGstBill] = useState<boolean>(true);

  // Finalization State
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizedInvoice, setFinalizedInvoice] = useState<Invoice | null>(null);

  // Quick Customer Modal
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setProducts(storeService.getProducts());
    setCustomers(storeService.getCustomers());
  };

  useEffect(() => {
    reload();
  }, []);

  const categories = useMemo(() => storeService.getCategories(), []);
  const storeSettings = useMemo(() => storeService.getSettings(), []);

  // Filter products for catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || p.categoryId === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  // Handle Customer Selection
  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    if (!id) {
      setCustomerName('Walk-in Customer');
      setCustomerMobile('');
      setCustomerAddress('');
      setCustomerGstin('');
      setCustomerState(storeSettings.state || 'Maharashtra');
      setIsInterState(false);
      return;
    }
    const cust = customers.find((c) => c.id === id);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerMobile(cust.mobile);
      setCustomerAddress(cust.address || '');
      setCustomerGstin(cust.gstin || '');
      setCustomerState(cust.state || storeSettings.state || 'Maharashtra');
      setIsInterState(cust.state ? cust.state.toLowerCase() !== storeSettings.state.toLowerCase() : false);
    }
  };

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      toast.error(`"${product.name}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      const originalGstRate = product.gstRate;
      const effectiveGstRate = isGstBill ? originalGstRate : 0;

      if (existing) {
        if (existing.quantity + 1 > product.currentStock) {
          toast.warning(`Only ${product.currentStock} ${product.unitSymbol} available in stock`);
          return prev;
        }
        return prev.map((item) => {
          if (item.productId === product.id) {
            const newQty = item.quantity + 1;
            const tax = calculateItemTax({
              rate: item.unitPrice,
              quantity: newQty,
              discountPercent: item.discountPercent,
              gstRate: effectiveGstRate,
              isInterState,
            });
            return {
              ...item,
              quantity: newQty,
              gstRate: effectiveGstRate,
              discountAmount: tax.discountAmount,
              taxableAmount: tax.taxableAmount,
              cgstRate: tax.cgstRate,
              cgstAmount: tax.cgstAmount,
              sgstRate: tax.sgstRate,
              sgstAmount: tax.sgstAmount,
              igstRate: tax.igstRate,
              igstAmount: tax.igstAmount,
              totalPrice: tax.totalPrice,
            };
          }
          return item;
        });
      }

      // Fresh Cart Item
      const tax = calculateItemTax({
        rate: product.sellingPrice,
        quantity: 1,
        discountPercent: 0,
        gstRate: effectiveGstRate,
        isInterState,
      });

      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        invoiceId: '',
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unit: product.unitSymbol || 'pc',
        unitPrice: product.sellingPrice,
        discountPercent: 0,
        discountAmount: tax.discountAmount,
        taxableAmount: tax.taxableAmount,
        gstRate: effectiveGstRate,
        cgstRate: tax.cgstRate,
        cgstAmount: tax.cgstAmount,
        sgstRate: tax.sgstRate,
        sgstAmount: tax.sgstAmount,
        igstRate: tax.igstRate,
        igstAmount: tax.igstAmount,
        totalPrice: tax.totalPrice,
        maxStock: product.currentStock,
      };

      toast.success(`Added: ${product.name}`, { duration: 1200 });
      return [...prev, newItem];
    });
  };

  // Barcode Scan / Keydown Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query) ||
        p.sku.toLowerCase() === query
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      toast.error(`No hardware item found matching: ${barcodeInput}`);
    }
  };

  // Modify Quantity
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          if (newQty > item.maxStock) {
            toast.warning(`Cannot exceed available stock (${item.maxStock} ${item.unit})`);
            return item;
          }
          const prod = products.find((p) => p.id === productId);
          const originalGstRate = prod?.gstRate ?? item.gstRate;
          const effectiveGstRate = isGstBill ? originalGstRate : 0;

          const tax = calculateItemTax({
            rate: item.unitPrice,
            quantity: newQty,
            discountPercent: item.discountPercent,
            gstRate: effectiveGstRate,
            isInterState,
          });
          return {
            ...item,
            quantity: newQty,
            gstRate: effectiveGstRate,
            discountAmount: tax.discountAmount,
            taxableAmount: tax.taxableAmount,
            cgstRate: tax.cgstRate,
            cgstAmount: tax.cgstAmount,
            sgstRate: tax.sgstRate,
            sgstAmount: tax.sgstAmount,
            igstRate: tax.igstRate,
            igstAmount: tax.igstAmount,
            totalPrice: tax.totalPrice,
          };
        }
        return item;
      })
    );
  };

  // Modify Discount %
  const updateDiscount = (productId: string, discountPercent: number) => {
    const clampedDiscount = Math.max(0, Math.min(100, discountPercent));
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const prod = products.find((p) => p.id === productId);
          const originalGstRate = prod?.gstRate ?? item.gstRate;
          const effectiveGstRate = isGstBill ? originalGstRate : 0;

          const tax = calculateItemTax({
            rate: item.unitPrice,
            quantity: item.quantity,
            discountPercent: clampedDiscount,
            gstRate: effectiveGstRate,
            isInterState,
          });
          return {
            ...item,
            discountPercent: clampedDiscount,
            gstRate: effectiveGstRate,
            discountAmount: tax.discountAmount,
            taxableAmount: tax.taxableAmount,
            cgstRate: tax.cgstRate,
            cgstAmount: tax.cgstAmount,
            sgstRate: tax.sgstRate,
            sgstAmount: tax.sgstAmount,
            igstRate: tax.igstRate,
            igstAmount: tax.igstAmount,
            totalPrice: tax.totalPrice,
          };
        }
        return item;
      })
    );
  };

  // Remove Item
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setAmountPaid(0);
  };

  // Re-calculate all cart items whenever isGstBill, isInterState, or products change
  useEffect(() => {
    setCart((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const originalGstRate = prod?.gstRate ?? 18;
        const effectiveGstRate = isGstBill ? originalGstRate : 0;

        const tax = calculateItemTax({
          rate: item.unitPrice,
          quantity: item.quantity,
          discountPercent: item.discountPercent,
          gstRate: effectiveGstRate,
          isInterState,
        });
        return {
          ...item,
          gstRate: effectiveGstRate,
          discountAmount: tax.discountAmount,
          taxableAmount: tax.taxableAmount,
          cgstRate: tax.cgstRate,
          cgstAmount: tax.cgstAmount,
          sgstRate: tax.sgstRate,
          sgstAmount: tax.sgstAmount,
          igstRate: tax.igstRate,
          igstAmount: tax.igstAmount,
          totalPrice: tax.totalPrice,
        };
      })
    );
  }, [isGstBill, isInterState, products]);

  // Cart Totals Calculation
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + +(item.unitPrice * item.quantity).toFixed(2), 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxableAmount = cart.reduce((sum, item) => sum + item.taxableAmount, 0);
    const cgstTotal = isGstBill ? cart.reduce((sum, item) => sum + item.cgstAmount, 0) : 0;
    const sgstTotal = isGstBill ? cart.reduce((sum, item) => sum + item.sgstAmount, 0) : 0;
    const igstTotal = isGstBill ? cart.reduce((sum, item) => sum + item.igstAmount, 0) : 0;
    const taxTotal = +(cgstTotal + sgstTotal + igstTotal).toFixed(2);
    const exactGrandTotal = +(taxableAmount + taxTotal).toFixed(2);
    const roundedGrandTotal = Math.round(exactGrandTotal);
    const roundingAdjustment = +(roundedGrandTotal - exactGrandTotal).toFixed(2);

    return {
      subtotal: +subtotal.toFixed(2),
      totalDiscount: +totalDiscount.toFixed(2),
      taxableAmount: +taxableAmount.toFixed(2),
      cgstTotal: +cgstTotal.toFixed(2),
      sgstTotal: +sgstTotal.toFixed(2),
      igstTotal: +igstTotal.toFixed(2),
      taxTotal,
      roundingAdjustment,
      grandTotal: roundedGrandTotal,
    };
  }, [cart, isGstBill]);

  // Keep amountPaid synchronized with grand total by default if not credit
  useEffect(() => {
    if (paymentMethod !== 'credit') {
      setAmountPaid(cartTotals.grandTotal);
    }
  }, [cartTotals.grandTotal, paymentMethod]);

  const balanceDue = Math.max(0, +(cartTotals.grandTotal - amountPaid).toFixed(2));

  // Quick Customer Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustMobile.trim()) {
      toast.error('Customer name and mobile number are required');
      return;
    }
    try {
      const created = storeService.addCustomer({
        name: newCustName.trim(),
        mobile: newCustMobile.trim(),
        address: newCustAddress.trim() || undefined,
        gstin: newCustGstin.trim() || undefined,
        state: storeSettings.state || 'Maharashtra',
      });
      toast.success(`Customer "${created.name}" created`);
      setCustomers(storeService.getCustomers());
      handleCustomerSelect(created.id);
      setIsNewCustomerOpen(false);
      setNewCustName('');
      setNewCustMobile('');
      setNewCustAddress('');
      setNewCustGstin('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add customer';
      toast.error(msg);
    }
  };

  // Finalize Bill
  const handleFinalizeBill = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Please add products to create a bill.');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Please enter customer name or select a customer');
      return;
    }

    setIsFinalizing(true);

    try {
      const invoice = storeService.finalizeInvoice({
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim() || '0000000000',
        customerAddress: customerAddress.trim() || undefined,
        customerGstin: customerGstin.trim() || undefined,
        customerState,
        isInterState,
        isGstBill,
        customerId: selectedCustomerId || undefined,
        subtotal: cartTotals.subtotal,
        totalDiscount: cartTotals.totalDiscount,
        taxableAmount: cartTotals.taxableAmount,
        cgstTotal: cartTotals.cgstTotal,
        sgstTotal: cartTotals.sgstTotal,
        igstTotal: cartTotals.igstTotal,
        taxTotal: cartTotals.taxTotal,
        roundingAdjustment: cartTotals.roundingAdjustment,
        grandTotal: cartTotals.grandTotal,
        amountPaid: Number(amountPaid),
        paymentMethod,
        notes: notes.trim() || undefined,
        items: cart,
        paymentStatus: amountPaid >= cartTotals.grandTotal ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid',
      });

      toast.success(
        isGstBill
          ? `GST Tax Invoice ${invoice.invoiceNumber} finalized successfully!`
          : `Non-GST Bill ${invoice.invoiceNumber} finalized successfully!`,
        {
          description: `Stock deducted automatically across ${cart.length} line items.`,
        }
      );

      setFinalizedInvoice(invoice);
      clearCart();
      reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error finalizing invoice';
      toast.error(msg);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handlePrintPdf = (invoice: Invoice) => {
    const settings = storeService.getSettings();
    generateInvoicePdf(invoice, settings, true);
  };

  const handleDownloadPdf = (invoice: Invoice) => {
    const settings = storeService.getSettings();
    generateInvoicePdf(invoice, settings, false);
  };

  return (
    <AppShell title="POS Billing Counter">
      <div className="space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                POS Billing Counter
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Next Bill #:</span>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {storeService.generateNextInvoiceNumber()}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">Store: {storeSettings.state}</span>
              <span className="text-slate-300">•</span>
              <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${isGstBill ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isGstBill ? 'GST Bill Mode' : 'Non-GST Bill Mode'}
              </span>
            </p>
          </div>

          {/* Quick Barcode Form (Header Desktop / Tablet) */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode or type SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="shrink-0 h-10 px-4">
              Scan
            </Button>
          </form>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* MOBILE VIEW: STEP 1 - CUSTOMER INFORMATION FIRST            */}
        {/* (Rendered prominently on mobile screens < lg)                */}
        {/* ----------------------------------------------------------- */}
        <div className="block lg:hidden">
          <CustomerSection
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onCustomerSelect={handleCustomerSelect}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerMobile={customerMobile}
            setCustomerMobile={setCustomerMobile}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            customerGstin={customerGstin}
            setCustomerGstin={setCustomerGstin}
            customerState={customerState}
            setCustomerState={setCustomerState}
            isInterState={isInterState}
            setIsInterState={setIsInterState}
            storeState={storeSettings.state || 'Maharashtra'}
            onQuickAddOpen={() => setIsNewCustomerOpen(true)}
            isMobileLayout={true}
          />
        </div>

        {/* ----------------------------------------------------------- */}
        {/* MAIN POS GRID (Product Catalog + Cart / Checkout)          */}
        {/* ----------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* --------------------------------------------------------- */}
          {/* STEP 2: PRODUCT ADDING & CATALOG (Span 7 on Desktop)       */}
          {/* On Mobile: Appears SECOND, right after Customer Info!      */}
          {/* --------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
              
              {/* Product Adding Section Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                      Add Hardware Products
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Step 2
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Search hardware catalog, filter by category or tap to add
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  {filteredProducts.length} items
                </span>
              </div>

              {/* Product Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by title, SKU code, or brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills (Horizontal Scroll) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs -mx-1 px-1 touch-pan-x">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-2 rounded-xl font-bold shrink-0 transition-all text-xs cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                >
                  All Products
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3.5 py-2 rounded-xl font-semibold shrink-0 transition-all text-xs cursor-pointer ${
                      selectedCategory === c.id
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
                  <Search className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No hardware products match your search</p>
                  <p className="text-xs text-slate-400">Try searching with a different keyword, category, or SKU.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.currentStock <= 0;
                  const cartItem = cart.find((item) => item.productId === p.id);
                  const isLowStock = !isOutOfStock && p.currentStock <= p.minStockLevel;

                  return (
                    <div
                      key={p.id}
                      className={`bg-white p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                        isOutOfStock
                          ? 'border-slate-200 opacity-60 bg-slate-50'
                          : cartItem
                          ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                          : 'border-slate-200/90 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold font-mono text-slate-400 uppercase">
                            {p.sku}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isOutOfStock
                              ? 'Out of Stock'
                              : `${formatQuantity(p.currentStock, p.unitSymbol)} left`}
                          </span>
                        </div>

                        {/* Product Title & Brand */}
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.categoryName} {p.brand ? `• ${p.brand}` : ''}
                        </p>
                      </div>

                      {/* Price & Action Row */}
                      <div className="flex items-center justify-between pt-3 mt-2.5 border-t border-slate-100">
                        <div>
                          <span className="text-base font-black text-slate-900 font-mono">
                            {formatCurrency(p.sellingPrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 block -mt-0.5">
                            {isGstBill ? `+${p.gstRate}% GST` : 'Non-GST Price'}
                          </span>
                        </div>

                        {/* Interactive Add or In-Cart Stepper */}
                        {isOutOfStock ? (
                          <Button size="sm" variant="secondary" disabled className="h-9 px-3 text-xs">
                            Out of Stock
                          </Button>
                        ) : cartItem ? (
                          <div className="flex items-center bg-blue-50 border border-blue-200 rounded-xl overflow-hidden shadow-xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(p.id, cartItem.quantity - 1)}
                              className="w-8 h-9 flex items-center justify-center text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-colors cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-9 text-center font-bold font-mono text-xs text-blue-900">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(p.id, cartItem.quantity + 1)}
                              className="w-8 h-9 flex items-center justify-center text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-colors cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => addToCart(p)}
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                            className="h-9 px-3.5 text-xs font-bold rounded-xl active:scale-95 transition-transform"
                          >
                            + Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* RIGHT / CHECKOUT AREA (Span 5 on Desktop)                  */}
          {/* On Desktop: Customer Info Card + Cart + Summary           */}
          {/* On Mobile: Step 3 (Bill Items & Checkout)                 */}
          {/* --------------------------------------------------------- */}
          <div
            id="cart-checkout-section"
            className="lg:col-span-5 space-y-4 lg:sticky lg:top-20 scroll-mt-20"
          >
            {/* Desktop Only Customer Information Card */}
            <div className="hidden lg:block">
              <CustomerSection
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onCustomerSelect={handleCustomerSelect}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerMobile={customerMobile}
                setCustomerMobile={setCustomerMobile}
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                customerGstin={customerGstin}
                setCustomerGstin={setCustomerGstin}
                customerState={customerState}
                setCustomerState={setCustomerState}
                isInterState={isInterState}
                setIsInterState={setIsInterState}
                storeState={storeSettings.state || 'Maharashtra'}
                onQuickAddOpen={() => setIsNewCustomerOpen(true)}
                isMobileLayout={false}
              />
            </div>

            {/* Cart Items & Bill Checkout Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-5 space-y-4">
              
              {/* Cart Section Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                      Bill Items & Payment
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                        {cart.length} items
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Verify bill items, select bill type, and finalize sale
                    </p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">Bill is currently empty</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Select products from catalog above or scan barcode to add hardware items.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div key={item.id} className="pt-2.5 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.productName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.sku} • ₹{item.unitPrice}/{item.unit} • {isGstBill ? `${item.gstRate}% GST` : 'Non-GST'}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>

                      {/* Stepper + Discount + Delete */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Qty Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-600 active:bg-slate-300 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                            className="w-12 h-8 text-center text-xs font-bold font-mono bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-600 active:bg-slate-300 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Item Discount % */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                          <span>Disc%:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                            className="w-10 h-6 px-1 text-center font-mono font-bold border rounded border-slate-300 text-xs bg-white"
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Payment Method
                </label>
                <div className="grid grid-cols-5 gap-1.5 text-xs">
                  {(
                    [
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'upi', label: 'UPI', icon: Smartphone },
                      { id: 'card', label: 'Card', icon: CreditCard },
                      { id: 'bank_transfer', label: 'Bank', icon: Building },
                      { id: 'credit', label: 'Credit', icon: RotateCcw },
                    ] as const
                  ).map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-xs ring-1 ring-blue-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-0.5" />
                        <span className="text-[10px]">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Paid & Due */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Amount Paid (₹)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmountPaid(cartTotals.grandTotal)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                    >
                      Exact
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 pl-7 pr-3 text-xs sm:text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Balance Due (₹)
                  </label>
                  <div
                    className={`h-10 px-3 flex items-center rounded-xl border font-mono font-bold text-sm ${
                      balanceDue > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}
                  >
                    {formatCurrency(balanceDue)}
                  </div>
                </div>
              </div>

              {/* Calculations Summary Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-mono">{formatCurrency(cartTotals.subtotal)}</span>
                </div>
                {cartTotals.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Total Discount:</span>
                    <span className="font-mono">-{formatCurrency(cartTotals.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span className="font-mono">{formatCurrency(cartTotals.taxableAmount)}</span>
                </div>

                {/* GST Tax Breakdown or Non-GST Notification */}
                {isGstBill ? (
                  isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST Total:</span>
                      <span className="font-mono text-blue-600 font-bold">{formatCurrency(cartTotals.igstTotal)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST Total:</span>
                        <span className="font-mono text-blue-600">{formatCurrency(cartTotals.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST Total:</span>
                        <span className="font-mono text-blue-600">{formatCurrency(cartTotals.sgstTotal)}</span>
                      </div>
                    </>
                  )
                ) : (
                  <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <span className="font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      GST Tax (Waived / Non-GST):
                    </span>
                    <span className="font-mono font-bold">₹0.00</span>
                  </div>
                )}

                {cartTotals.roundingAdjustment !== 0 && (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Rounding Adjustment:</span>
                    <span className="font-mono">{formatCurrency(cartTotals.roundingAdjustment)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <div className="flex flex-col">
                    <span>Grand Total:</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {isGstBill ? 'Includes all GST taxes' : 'Excludes GST (Cash Memo)'}
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-blue-600 font-mono">
                    {formatCurrency(cartTotals.grandTotal)}
                  </span>
                </div>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* 2 BUTTONS BEFORE FINALIZE: WITH GST vs WITHOUT GST BUTTONS  */}
              {/* ----------------------------------------------------------- */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select Bill Type</span>
                  </label>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isGstBill
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isGstBill ? '✓ GST Bill Active' : '✓ Non-GST Bill Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* BUTTON 1: WITH GST BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGstBill(true);
                      toast.info('Switched to With-GST Tax Invoice', {
                        description: 'GST tax (CGST/SGST/IGST) added to bill.',
                        duration: 1800,
                      });
                    }}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] ${
                      isGstBill
                        ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-1.5 rounded-lg ${isGstBill ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <Receipt className="w-4 h-4" />
                      </div>
                      {isGstBill ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Add GST</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <h4 className={`text-xs font-black tracking-tight ${isGstBill ? 'text-blue-950 font-bold' : 'text-slate-700'}`}>
                        WITH GST BILL
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Tax Invoice • GST Added
                      </p>
                    </div>
                  </button>

                  {/* BUTTON 2: WITHOUT GST BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGstBill(false);
                      toast.info('Switched to Without-GST Bill', {
                        description: '0% tax applied. Retail Cash Memo / Estimate.',
                        duration: 1800,
                      });
                    }}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] ${
                      !isGstBill
                        ? 'border-emerald-600 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-1.5 rounded-lg ${!isGstBill ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        <Banknote className="w-4 h-4" />
                      </div>
                      {!isGstBill ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Waive GST</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <h4 className={`text-xs font-black tracking-tight ${!isGstBill ? 'text-emerald-950 font-bold' : 'text-slate-700'}`}>
                        WITHOUT GST BILL
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        Cash Memo • No GST Added
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Finalize Button */}
              <Button
                type="button"
                variant={isGstBill ? 'primary' : 'success'}
                className={`w-full h-12 text-sm sm:text-base font-bold rounded-xl shadow-lg active:scale-[0.99] transition-all cursor-pointer ${
                  isGstBill
                    ? 'shadow-blue-600/30'
                    : 'shadow-emerald-600/30 bg-emerald-600 hover:bg-emerald-700'
                }`}
                disabled={cart.length === 0 || isFinalizing}
                isLoading={isFinalizing}
                onClick={handleFinalizeBill}
              >
                {isGstBill
                  ? `FINALIZE GST TAX INVOICE (${formatCurrency(cartTotals.grandTotal)})`
                  : `FINALIZE NON-GST BILL (${formatCurrency(cartTotals.grandTotal)})`}
              </Button>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* MOBILE FLOATING QUICK-CART BAR                              */}
        {/* Docked above mobile bottom navigation when cart has items   */}
        {/* ----------------------------------------------------------- */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700/80 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                {cart.length}
              </div>
              <div>
                <p className="text-[11px] text-slate-400 leading-none">
                  Total {isGstBill ? '(With GST)' : '(Without GST)'}
                </p>
                <p className="text-base font-black text-white font-mono leading-tight">
                  {formatCurrency(cartTotals.grandTotal)}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                document.getElementById('cart-checkout-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>Review & Pay</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* Bill Finalization Success Modal                             */}
        {/* ----------------------------------------------------------- */}
        <Modal
          isOpen={Boolean(finalizedInvoice)}
          onClose={() => setFinalizedInvoice(null)}
          title="Invoice Finalized Successfully!"
          description="Inventory stock was deducted and stock movements were recorded in audit ledger"
        >
          {finalizedInvoice && (
            <div className="space-y-5 text-center p-2">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-bold text-blue-600 font-mono bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {finalizedInvoice.invoiceNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    finalizedInvoice.isGstBill !== false
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {finalizedInvoice.isGstBill !== false ? 'GST Tax Invoice' : 'Non-GST Cash Memo'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 pt-1">
                  {finalizedInvoice.customerName}
                </h3>
                <p className="text-xs text-slate-500">
                  Grand Total: <strong>{formatCurrency(finalizedInvoice.grandTotal)}</strong> • Paid: <strong>{formatCurrency(finalizedInvoice.amountPaid)}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={() => handlePrintPdf(finalizedInvoice)}
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Print Invoice
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPdf(finalizedInvoice)}
                  leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
                >
                  Download PDF
                </Button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link href={`/billing/invoices/${finalizedInvoice.id}`}>
                  <Button variant="ghost" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                    View Details
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFinalizedInvoice(null)}
                >
                  Create Next Bill
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ----------------------------------------------------------- */}
        {/* Quick Add Customer Modal                                    */}
        {/* ----------------------------------------------------------- */}
        <Modal
          isOpen={isNewCustomerOpen}
          onClose={() => setIsNewCustomerOpen(false)}
          title="Quick Add Customer"
          description="Register contractor, builder, or client details"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <Input
              label="Customer Name"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Verma Constructions"
            />

            <Input
              label="Mobile Number"
              required
              value={newCustMobile}
              onChange={(e) => setNewCustMobile(e.target.value)}
              placeholder="10-digit mobile number"
            />

            <Input
              label="Address / Site Location"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              placeholder="e.g. Sector 12, Dwarka, Delhi"
            />

            <Input
              label="GSTIN (Optional)"
              value={newCustGstin}
              onChange={(e) => setNewCustGstin(e.target.value)}
              placeholder="07AAAAA0000A1Z5"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewCustomerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save & Select
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
