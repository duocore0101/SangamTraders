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
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Save, Truck } from 'lucide-react';
import Link from 'next/link';

export default function NewPurchasePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'draft' | 'received'>('received');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Items State
  const [items, setItems] = useState<
    Omit<PurchaseItem, 'id' | 'purchaseId'>[]
  >([]);

  useEffect(() => {
    setSuppliers(storeService.getSuppliers());
    setProducts(storeService.getProducts());
  }, []);

  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const taxAmount = +(prod.purchasePrice * (prod.gstRate / 100)).toFixed(2);
    const totalAmount = +(prod.purchasePrice + taxAmount).toFixed(2);

    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: 1,
        unit: prod.unitSymbol || 'pc',
        purchaseRate: prod.purchasePrice,
        taxRate: prod.gstRate,
        taxAmount,
        totalAmount,
      },
    ]);
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'purchaseRate' | 'taxRate',
    val: number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index], [field]: val };
      const sub = cur.quantity * cur.purchaseRate;
      cur.taxAmount = +(sub * (cur.taxRate / 100)).toFixed(2);
      cur.totalAmount = +(sub + cur.taxAmount).toFixed(2);
      updated[index] = cur;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.purchaseRate, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = +(subtotal + taxAmount).toFixed(2);

  // Default amountPaid to total
  useEffect(() => {
    if (paymentMethod !== 'credit') {
      setAmountPaid(totalAmount);
    }
  }, [totalAmount, paymentMethod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one product item');
      return;
    }

    setIsSubmitting(true);
    const supplier = suppliers.find((s) => s.id === supplierId);

    try {
      const created = storeService.createPurchase({
        supplierId,
        supplierName: supplier?.name || 'Supplier',
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        purchaseDate,
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        amountPaid: Number(amountPaid),
        balanceDue: Math.max(0, +(totalAmount - amountPaid).toFixed(2)),
        paymentMethod,
        paymentStatus: amountPaid >= totalAmount ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid',
        status,
        notes: notes.trim() || undefined,
        items: items as PurchaseItem[],
      });

      toast.success(
        `Purchase ${created.purchaseNumber} created${
          status === 'received' ? ' and warehouse stock updated!' : ''
        }`
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
    <AppShell title="Create Inward Purchase">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/purchases"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Purchases
          </Link>
          <span className="text-xs text-slate-400">Inventory Inward</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Supplier & PO Details */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier & Consignment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Select
                    label="Supplier / Vendor"
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.mobile})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Input
                    label="Vendor Invoice # (Optional)"
                    placeholder="e.g. TATA-INV-8910"
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                  />
                </div>

                <div>
                  <Input
                    label="Purchase Date"
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Items List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchased Products</CardTitle>
              <div className="w-64">
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddItem(e.target.value);
                  }}
                >
                  <option value="">+ Add product to order...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  Select a product from the dropdown above to add line items.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-4">
                        <p className="text-xs font-bold text-slate-900">{item.productName}</p>
                        <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</p>
                      </div>

                      <div className="sm:col-span-2">
                        <Input
                          label="Quantity"
                          type="number"
                          step="0.001"
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          suffixText={item.unit}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Input
                          label="Rate (₹)"
                          type="number"
                          step="0.01"
                          required
                          value={item.purchaseRate}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'purchaseRate', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Input
                          label="GST %"
                          type="number"
                          value={item.taxRate}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase block">Total</span>
                          <span className="font-bold text-slate-900 font-mono text-xs">
                            {formatCurrency(item.totalAmount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Receiving Status & Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Receiving & Payment Settlement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Select
                    label="Receiving Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'received')}
                  >
                    <option value="received">Received (Add to stock now)</option>
                    <option value="draft">Draft (Stock not added yet)</option>
                  </Select>
                </div>

                <div>
                  <Select
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Credit / Payable Later</option>
                  </Select>
                </div>

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
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-50 border flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Subtotal: {formatCurrency(subtotal)}</span> •{' '}
                  <span className="text-slate-500">GST: {formatCurrency(taxAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 mr-2">Grand Total:</span>
                  <span className="text-lg font-black text-blue-600 font-mono">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Link href="/purchases">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Commit Purchase Order
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

