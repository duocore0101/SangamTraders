'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { storeService } from '@/services/store';
import { Supplier, Product, PurchaseItem, PaymentMethod } from '@/types';
import { formatCurrency, numberToWords } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Save, Sparkles, Building2, PackagePlus, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface EditableItemRow {
  productId?: string;
  productName: string;
  sku?: string;
  hsnCode: string;
  partNo: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  discountPercent: number;
  taxRate: number;
  sellingPrice: number;
  isExistingProduct?: boolean;
}

const COMMON_UNITS = [
  { value: 'Pcs.', label: 'Pcs. (Pieces)' },
  { value: 'MTR.', label: 'MTR. (Meters)' },
  { value: 'Kg', label: 'Kg (Kilogram)' },
  { value: 'Roll', label: 'Roll' },
  { value: 'Bag', label: 'Bag' },
  { value: 'Box', label: 'Box' },
  { value: 'Set', label: 'Set' },
  { value: 'Nos.', label: 'Nos. (Numbers)' },
  { value: 'Carton', label: 'Carton' },
];

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Section 1: Supplier & Consignment State
  const [supplierId, setSupplierId] = useState('');
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierMobile, setSupplierMobile] = useState('');
  const [supplierState, setSupplierState] = useState('Maharashtra');
  const [supplierStateCode, setSupplierStateCode] = useState('27');

  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierRef, setSupplierRef] = useState('');
  const [buyersOrderNo, setBuyersOrderNo] = useState('');
  const [otherReferences, setOtherReferences] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState('');
  const [paymentModeTerms, setPaymentModeTerms] = useState('Bank Transfer');

  // Section 2: Items State
  const [items, setItems] = useState<EditableItemRow[]>([
    {
      productName: '',
      hsnCode: '',
      partNo: '',
      quantity: 1,
      unit: 'Pcs.',
      purchaseRate: 0,
      discountPercent: 0,
      taxRate: 18,
      sellingPrice: 0,
    },
  ]);

  // Section 3: Settlement State
  const [status, setStatus] = useState<'draft' | 'received'>('received');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const sups = storeService.getSuppliers();
    const prods = storeService.getProducts();
    setSuppliers(sups);
    setProducts(prods);

    // Auto-select Aarti Sales if available, or first supplier
    const aarti = sups.find((s) => s.name.toLowerCase().includes('aarti'));
    if (aarti) {
      applySupplier(aarti);
    } else if (sups.length > 0) {
      applySupplier(sups[0]);
    }
  }, []);

  const applySupplier = (sup: Supplier) => {
    setSupplierId(sup.id);
    setCustomSupplierName(sup.name);
    setSupplierAddress(sup.address || '');
    setSupplierGstin(sup.gstin || '');
    setSupplierMobile(sup.mobile || '');
    setSupplierState(sup.state || 'Maharashtra');
    setSupplierStateCode(sup.stateCode || '27');
  };

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    if (id === 'custom') {
      setCustomSupplierName('');
      setSupplierAddress('');
      setSupplierGstin('');
      setSupplierMobile('');
      return;
    }
    const found = suppliers.find((s) => s.id === id);
    if (found) {
      applySupplier(found);
    }
  };

  // Add blank manual item row
  const handleAddManualRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: '',
        hsnCode: '',
        partNo: '',
        quantity: 1,
        unit: 'Pcs.',
        purchaseRate: 0,
        discountPercent: 0,
        taxRate: 18,
        sellingPrice: 0,
      },
    ]);
  };

  // Add existing product from catalog
  const handleAddFromCatalog = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        hsnCode: prod.hsnCode || '',
        partNo: prod.partNo || '',
        quantity: 1,
        unit: prod.unitSymbol || 'Pcs.',
        purchaseRate: prod.purchasePrice || 0,
        discountPercent: 0,
        taxRate: prod.gstRate ?? 18,
        sellingPrice: prod.sellingPrice || +(prod.purchasePrice * 1.25).toFixed(2),
        isExistingProduct: true,
      },
    ]);
  };

  // Auto-fill from catalog if name matches typed input
  const handleNameChange = (index: number, name: string) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], productName: name };
      const matched = products.find(
        (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (matched) {
        cur.productId = matched.id;
        cur.sku = matched.sku;
        if (!cur.hsnCode && matched.hsnCode) cur.hsnCode = matched.hsnCode;
        if (!cur.partNo && matched.partNo) cur.partNo = matched.partNo;
        if (cur.purchaseRate === 0) cur.purchaseRate = matched.purchasePrice;
        if (cur.sellingPrice === 0) cur.sellingPrice = matched.sellingPrice;
        cur.unit = matched.unitSymbol || cur.unit;
        cur.taxRate = matched.gstRate ?? cur.taxRate;
        cur.isExistingProduct = true;
      } else {
        cur.isExistingProduct = false;
        cur.productId = undefined;
      }
      updated[index] = cur;
      return updated;
    });
  };

  const handleUpdateItem = <K extends keyof EditableItemRow>(
    index: number,
    field: K,
    val: EditableItemRow[K]
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: val };

      // Auto update selling price if rate is changed and selling price was 0 or default
      if (field === 'purchaseRate') {
        const rate = Number(val) || 0;
        if (!cur.sellingPrice || cur.sellingPrice === 0) {
          cur.sellingPrice = +(rate * 1.25).toFixed(2);
        }
      }

      updated[index] = cur;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Load sample bill matching the user's reference image
  const handleLoadSampleAartiBill = () => {
    const aarti = suppliers.find((s) => s.name.toLowerCase().includes('aarti'));
    if (aarti) {
      applySupplier(aarti);
    } else {
      setSupplierId('custom');
      setCustomSupplierName('AARTI SALES AGENCIES');
      setSupplierAddress('2, GANGOTRI APP, INDRAKUND, PANCHVATI, NASHIK 422003');
      setSupplierGstin('27ABTPM0336P1Z0');
      setSupplierMobile('9822620910');
      setSupplierState('Maharashtra');
      setSupplierStateCode('27');
    }

    setSupplierInvoiceNumber('389');
    setPurchaseDate('2026-10-22');
    setOtherReferences('2 Roll 1box 2bag');
    setTermsOfDelivery('Vighnar Trans');
    setPaymentModeTerms('Bank Transfer');

    const sampleItems: EditableItemRow[] = [
      { productName: 'SILVER SUPER HOSE PIPE 2.1/2"', hsnCode: '39173100', partNo: '', quantity: 60, unit: 'MTR.', purchaseRate: 184.00, discountPercent: 0, taxRate: 18, sellingPrice: 220 },
      { productName: 'G.I. REDUCE CONECTORE 1" X 9"', hsnCode: '73072900', partNo: '', quantity: 20, unit: 'Pcs.', purchaseRate: 50.00, discountPercent: 0, taxRate: 18, sellingPrice: 70 },
      { productName: 'G.I. REDUCE CONNECTORE 1.1/4" X 9"', hsnCode: '7307', partNo: '', quantity: 20, unit: 'Pcs.', purchaseRate: 60.00, discountPercent: 0, taxRate: 18, sellingPrice: 85 },
      { productName: 'C.I. FLANGES ROUND 1.500 2.1/2"', hsnCode: '73071900', partNo: '', quantity: 20, unit: 'Pcs.', purchaseRate: 163.00, discountPercent: 0, taxRate: 18, sellingPrice: 215 },
      { productName: 'DEV HOSE CLAMP "REG" 3/4"', hsnCode: '7307', partNo: '', quantity: 100, unit: 'Pcs.', purchaseRate: 7.50, discountPercent: 0, taxRate: 18, sellingPrice: 12 },
      { productName: 'G.I.SOCKET 1.1/4"', hsnCode: '73079210', partNo: '', quantity: 12, unit: 'Pcs.', purchaseRate: 47.00, discountPercent: 20, taxRate: 18, sellingPrice: 65 },
      { productName: 'C.I. HOSE NIPPLE L "CP" 1"', hsnCode: '73079990', partNo: '', quantity: 25, unit: 'Pcs.', purchaseRate: 19.00, discountPercent: 0, taxRate: 18, sellingPrice: 30 },
      { productName: '2.1/2" X 6" G.I.B/NIPPLE', hsnCode: '73071110', partNo: '', quantity: 6, unit: 'Pcs.', purchaseRate: 103.00, discountPercent: 0, taxRate: 18, sellingPrice: 140 },
      { productName: 'C.I. FLANGES REDUCE 2.200 2.1/2" X 4"', hsnCode: '73071900', partNo: '', quantity: 12, unit: 'Pcs.', purchaseRate: 224.00, discountPercent: 0, taxRate: 18, sellingPrice: 290 },
      { productName: 'RBI EXTENTION NIPPLE "M" 1/2" X 1"', hsnCode: '84811000', partNo: '', quantity: 72, unit: 'Pcs.', purchaseRate: 38.50, discountPercent: 0, taxRate: 18, sellingPrice: 55 },
      { productName: 'R O VALVE SET 60GM 1/4"', hsnCode: '8481', partNo: '', quantity: 10, unit: 'Pcs.', purchaseRate: 130.00, discountPercent: 0, taxRate: 18, sellingPrice: 175 },
      { productName: 'EAGLE PVC NRV SOLID "FLANGE" 2.1/2"', hsnCode: '3917', partNo: '', quantity: 24, unit: 'Pcs.', purchaseRate: 212.00, discountPercent: 0, taxRate: 18, sellingPrice: 275 },
    ];

    setItems(sampleItems);
    toast.success('Loaded sample bill matching Aarti Sales Agencies reference invoice!');
  };

  // Calculations
  const calculatedItems = items.map((item) => {
    const gross = item.quantity * item.purchaseRate;
    const disc = gross * ((item.discountPercent || 0) / 100);
    const taxable = +(gross - disc).toFixed(2);
    const tax = +(taxable * ((item.taxRate || 0) / 100)).toFixed(2);
    const total = +(taxable + tax).toFixed(2);
    return {
      ...item,
      taxableAmount: taxable,
      discountAmount: disc,
      taxAmount: tax,
      totalAmount: total,
    };
  });

  const subtotal = +calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0).toFixed(2);
  const taxAmount = +calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0).toFixed(2);
  const cgstAmount = +(taxAmount / 2).toFixed(2);
  const sgstAmount = +(taxAmount / 2).toFixed(2);
  const exactTotal = +(subtotal + taxAmount).toFixed(2);
  const grandTotal = Math.round(exactTotal);
  const roundOff = +(grandTotal - exactTotal).toFixed(2);

  // Sync amountPaid
  useEffect(() => {
    if (paymentMethod !== 'credit') {
      setAmountPaid(grandTotal);
    }
  }, [grandTotal, paymentMethod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalSupplierName =
      customSupplierName.trim() ||
      suppliers.find((s) => s.id === supplierId)?.name ||
      '';

    if (!finalSupplierName) {
      toast.error('Please select or enter a supplier name');
      return;
    }

    const validItems = calculatedItems.filter((i) => i.productName.trim().length > 0);
    if (validItems.length === 0) {
      toast.error('Please enter at least one product line item with a name');
      return;
    }

    setIsSubmitting(true);
    const supplierObj = suppliers.find((s) => s.id === supplierId);

    const purchaseItemsPayload: PurchaseItem[] = validItems.map((item) => ({
      id: '',
      purchaseId: '',
      productId: item.productId || '',
      productName: item.productName.trim(),
      sku: item.sku || '',
      hsnCode: item.hsnCode?.trim() || undefined,
      partNo: item.partNo?.trim() || undefined,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'Pcs.',
      purchaseRate: Number(item.purchaseRate) || 0,
      discountPercent: Number(item.discountPercent) || 0,
      discountAmount: item.discountAmount,
      taxRate: Number(item.taxRate) || 18,
      taxAmount: item.taxAmount,
      totalAmount: item.totalAmount,
      sellingPrice: Number(item.sellingPrice) || +(Number(item.purchaseRate) * 1.25).toFixed(2),
    }));

    try {
      const created = storeService.createPurchase({
        supplierId: supplierId === 'custom' ? `sup-${Date.now()}` : (supplierId || `sup-${Date.now()}`),
        supplierName: finalSupplierName,
        supplierAddress: supplierAddress.trim() || supplierObj?.address || undefined,
        supplierGstin: supplierGstin.trim() || supplierObj?.gstin || undefined,
        supplierMobile: supplierMobile.trim() || supplierObj?.mobile || undefined,
        supplierState: supplierState.trim() || 'Maharashtra',
        supplierStateCode: supplierStateCode.trim() || '27',
        purchaseDate: purchaseDate || new Date().toISOString().slice(0, 10),
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        supplierRef: supplierRef.trim() || undefined,
        buyersOrderNo: buyersOrderNo.trim() || undefined,
        otherReferences: otherReferences.trim() || undefined,
        termsOfDelivery: termsOfDelivery.trim() || undefined,
        paymentModeTerms: paymentModeTerms.trim() || undefined,
        subtotal,
        taxAmount,
        cgstAmount,
        sgstAmount,
        roundOff,
        discountAmount: 0,
        totalAmount: grandTotal,
        amountPaid: Number(amountPaid),
        balanceDue: Math.max(0, +(grandTotal - amountPaid).toFixed(2)),
        paymentMethod,
        paymentStatus: amountPaid >= grandTotal ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid',
        status,
        notes: notes.trim() || undefined,
        bankDetails: supplierObj?.bankDetails || {
          bankName: 'BANK OF MAHARASHTRA',
          accountNo: '20118504756',
          ifscCode: 'MAHB0000332',
          branch: 'PANCHVATI',
        },
        items: purchaseItemsPayload,
      });

      toast.success(
        `Purchase bill ${created.purchaseNumber} saved! Products added/updated in store catalog.`
      );
      router.push(`/purchases/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating purchase';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Create Inward Purchase Bill">
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/purchases"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Purchases
            </Link>
            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-md border border-blue-200">
              Tax Invoice Inward & Auto-Catalog Sync
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSampleAartiBill}
              leftIcon={<Sparkles className="w-4 h-4 text-amber-500" />}
              className="text-xs font-semibold bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
            >
              Load Aarti Sales Sample Bill (Reference)
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Supplier & Consignment Information */}
          <Card>
            <CardHeader className="bg-slate-50/60 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Supplier & Consignment Information
                </CardTitle>
                <span className="text-[11px] text-slate-400">Box 1: Tax Invoice Details</span>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Select
                    label="Select Supplier / Vendor"
                    value={supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                  >
                    <option value="">-- Choose Existing Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.state || 'MH'})
                      </option>
                    ))}
                    <option value="custom">+ Type New / Custom Supplier</option>
                  </Select>
                </div>

                <div>
                  <Input
                    label="Supplier / Firm Name *"
                    required
                    placeholder="e.g. AARTI SALES AGENCIES"
                    value={customSupplierName}
                    onChange={(e) => setCustomSupplierName(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Supplier GSTIN / UIN"
                    placeholder="e.g. 27ABTPM0336P1Z0"
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Supplier Address"
                    placeholder="e.g. 2, GANGOTRI APP, INDRAKUND, PANCHVATI, NASHIK 422003"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Supplier Phone / Mobile"
                    placeholder="e.g. 0253-2512270 / 9822620910"
                    value={supplierMobile}
                    onChange={(e) => setSupplierMobile(e.target.value)}
                  />
                </div>
              </div>

              {/* Consignment and Bill references */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Input
                    label="Vendor Invoice No."
                    placeholder="e.g. 389"
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Invoice Dated *"
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Terms of Delivery"
                    placeholder="e.g. Vighnar Trans"
                    value={termsOfDelivery}
                    onChange={(e) => setTermsOfDelivery(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Other Reference(s)"
                    placeholder="e.g. 2 Roll 1box 2bag"
                    value={otherReferences}
                    onChange={(e) => setOtherReferences(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Purchased Products (Manual Filling + Catalog) */}
          <Card className="border-blue-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border-b border-blue-100/80 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-blue-600" />
                    Purchased Products (Manual Entry & Auto-Add to Store)
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Type new products manually or select existing items. Any newly typed products are automatically saved into your store catalog!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-56">
                    <Select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFromCatalog(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">+ Pick from Catalog...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddManualRow}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="text-xs font-semibold whitespace-nowrap"
                  >
                    Add Product Row
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <datalist id="catalog-products-list">
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.sku} • {formatCurrency(p.purchasePrice)}
                  </option>
                ))}
              </datalist>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[260px]">Description of Goods / Item Name *</th>
                      <th className="py-2.5 px-2 w-28">HSN / SAC</th>
                      <th className="py-2.5 px-2 w-24">Part No.</th>
                      <th className="py-2.5 px-2 w-20 text-center">Qty *</th>
                      <th className="py-2.5 px-2 w-24">Unit</th>
                      <th className="py-2.5 px-2 w-28 text-right">Rate (₹) *</th>
                      <th className="py-2.5 px-2 w-16 text-center">Disc %</th>
                      <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                      <th className="py-2.5 px-2 w-28 text-right">Selling Price (₹)</th>
                      <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const gross = item.quantity * item.purchaseRate;
                      const disc = gross * ((item.discountPercent || 0) / 100);
                      const taxable = +(gross - disc).toFixed(2);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>

                          {/* Description of Goods */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              list="catalog-products-list"
                              placeholder="e.g. SILVER SUPER HOSE PIPE 2.1/2&quot;"
                              className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.productName}
                              onChange={(e) => handleNameChange(idx, e.target.value)}
                            />
                            <div className="flex items-center gap-1.5 mt-1">
                              {item.isExistingProduct ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Catalog: {item.sku}
                                </span>
                              ) : item.productName.trim() ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                                  + New Product (Will auto-add to store)
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* HSN / SAC */}
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              placeholder="39173100"
                              className="w-full text-xs font-mono text-slate-700 bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.hsnCode}
                              onChange={(e) => handleUpdateItem(idx, 'hsnCode', e.target.value)}
                            />
                          </td>

                          {/* Part No */}
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              placeholder="Optional"
                              className="w-full text-xs font-mono text-slate-700 bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.partNo}
                              onChange={(e) => handleUpdateItem(idx, 'partNo', e.target.value)}
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="any"
                              required
                              className="w-full text-xs font-bold font-mono text-center text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>

                          {/* Unit */}
                          <td className="py-2 px-2">
                            <select
                              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.unit}
                              onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                            >
                              {COMMON_UNITS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.value}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Rate */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              className="w-full text-xs font-mono text-right font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.purchaseRate === 0 ? '' : item.purchaseRate}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'purchaseRate', parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>

                          {/* Disc % */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              className="w-full text-xs font-mono text-center text-slate-700 bg-white border border-slate-300 rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.discountPercent === 0 ? '' : item.discountPercent}
                              onChange={(e) =>
                                handleUpdateItem(
                                  idx,
                                  'discountPercent',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </td>

                          {/* GST % */}
                          <td className="py-2 px-2">
                            <select
                              className="w-full text-xs font-mono text-center text-slate-700 bg-white border border-slate-300 rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.taxRate}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)
                              }
                            >
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                              <option value="12">12%</option>
                              <option value="5">5%</option>
                              <option value="0">0%</option>
                            </select>
                          </td>

                          {/* Selling Price */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Markup ₹"
                              title="Store selling price for this product"
                              className="w-full text-xs font-mono text-right text-emerald-700 bg-emerald-50/50 border border-emerald-300/80 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              value={item.sellingPrice === 0 ? '' : item.sellingPrice}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'sellingPrice', parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>

                          {/* Amount */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                            {formatCurrency(taxable)}
                          </td>

                          {/* Remove */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add row footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualRow}
                  leftIcon={<Plus className="w-4 h-4 text-blue-600" />}
                  className="text-xs font-semibold bg-white"
                >
                  + Add Another Product Row
                </Button>

                <div className="text-xs text-slate-500">
                  Total Items: <strong className="text-slate-800">{items.length}</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Receiving, Payment & Tax Totals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Receiving & Payment Options */}
            <div className="lg:col-span-7 space-y-6">
              <Card>
                <CardHeader className="bg-slate-50/60 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Receiving & Settlement
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="Receiving Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'draft' | 'received')}
                      >
                        <option value="received">Received (Add to physical stock now)</option>
                        <option value="draft">Draft (Do not add to stock yet)</option>
                      </Select>
                    </div>

                    <div>
                      <Select
                        label="Payment Method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      >
                        <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                        <option value="upi">UPI / Online</option>
                        <option value="cash">Cash</option>
                        <option value="credit">Credit / Payable Later</option>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Amount Paid to Supplier (₹)"
                        type="number"
                        step="0.01"
                        prefixText="₹"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Input
                        label="Payment Terms / Mode"
                        placeholder="e.g. Bank Transfer / 30 Days"
                        value={paymentModeTerms}
                        onChange={(e) => setPaymentModeTerms(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Internal Notes / Remarks"
                      placeholder="e.g. Goods verified at warehouse counter"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 5 cols: GST Tax Breakdown & Grand Total */}
            <div className="lg:col-span-5">
              <Card className="border-blue-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
                <CardHeader className="bg-slate-100/70 border-b border-slate-200/80 py-3">
                  <CardTitle className="text-xs uppercase font-mono tracking-wider text-slate-700">
                    TAX INVOICE VALUATION (GST BREAKDOWN)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>C GST @ 9 %:</span>
                    <span className="font-mono">{formatCurrency(cgstAmount)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>S GST @ 9 %:</span>
                    <span className="font-mono">{formatCurrency(sgstAmount)}</span>
                  </div>

                  {roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>ROUND OFF:</span>
                      <span className="font-mono">
                        {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-black text-slate-900 block">TOTAL AMOUNT</span>
                      <span className="text-[10px] text-slate-400 font-mono">E. & O.E</span>
                    </div>
                    <span className="text-2xl font-black text-blue-700 font-mono">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>

                  {/* Words */}
                  <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-100 text-[11px] text-blue-900">
                    <span className="font-bold block uppercase tracking-wide text-[10px] text-blue-600 mb-0.5">
                      Amount Chargeable (in words):
                    </span>
                    <span className="font-medium italic">{numberToWords(grandTotal)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Amount Paid:</span>
                      <span className="font-mono">{formatCurrency(amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700 font-semibold">
                      <span>Balance Due:</span>
                      <span className="font-mono">
                        {formatCurrency(Math.max(0, +(grandTotal - amountPaid).toFixed(2)))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href="/purchases">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
              className="px-8 font-bold shadow-md shadow-blue-500/20"
            >
              Commit Purchase Order & Sync Catalog
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
