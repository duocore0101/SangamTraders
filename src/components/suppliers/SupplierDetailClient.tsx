'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Supplier, Purchase, PaymentMethod } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Truck, Phone, MapPin, Building, Eye } from 'lucide-react';
import Link from 'next/link';

export function SupplierDetailClient({ id }: { id: string }) {
  const [supplier, setSupplier] = useState<Supplier | undefined>(undefined);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    const sup = storeService.getSupplierById(id);
    setSupplier(sup);
    if (sup) {
      setPurchases(storeService.getPurchases().filter((p) => p.supplierId === sup.id));
      setAmount(sup.outstandingBalance || 0);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!supplier) {
    return (
      <AppShell title="Supplier Profile">
        <EmptyState
          title="Supplier not found"
          description="The requested vendor record does not exist."
          action={
            <Link href="/suppliers">
              <Button size="sm" variant="primary">
                Return to Suppliers
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    try {
      storeService.recordPayment({
        referenceType: 'direct',
        referenceId: supplier.id,
        referenceNumber: `SUP-${supplier.mobile}`,
        partyType: 'supplier',
        partyId: supplier.id,
        partyName: supplier.name,
        amount: Number(amount),
        paymentMethod,
        notes: notes || 'Direct bank disbursement to vendor account',
      });

      // Update supplier balance
      const newBal = Math.max(0, +((supplier.outstandingBalance || 0) - amount).toFixed(2));
      storeService.updateSupplier(supplier.id, {
        outstandingBalance: newBal,
      });

      toast.success(`Disbursed ₹${amount} to ${supplier.name}`);
      setIsPaymentOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording payment';
      toast.error(msg);
    }
  };

  return (
    <AppShell title={`Supplier: ${supplier.name}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Suppliers
        </Link>

        <div className="flex items-center gap-2">
          {(supplier.outstandingBalance || 0) > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPaymentOpen(true)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Pay Supplier Due
            </Button>
          )}

          <Link href="/purchases/new">
            <Button variant="outline" size="sm" leftIcon={<Truck className="w-4 h-4" />}>
              Create Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Supplier Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{supplier.name}</h2>
              {supplier.gstin && (
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  GSTIN: {supplier.gstin}
                </span>
              )}
            </div>
            {supplier.contactPerson && (
              <p className="text-xs text-slate-500 font-medium">Contact Person: {supplier.contactPerson}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {supplier.mobile}
              </span>
              {supplier.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {supplier.address}
                </span>
              )}
            </div>
          </div>

          <div className="text-right sm:border-l sm:pl-6 border-slate-100 shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Payable Balance Dues
            </span>
            <div
              className={`text-3xl font-black font-mono mt-0.5 ${
                (supplier.outstandingBalance || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {formatCurrency(supplier.outstandingBalance || 0)}
            </div>
            <span className="text-xs text-slate-400">
              Total Business: {formatCurrency(supplier.totalPurchased || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Purchases History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vendor Purchase Orders</CardTitle>
            <p className="text-xs text-slate-500">Inward consignments from {supplier.name}</p>
          </div>
          <Badge variant="neutral">{purchases.length} Orders</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-center">Receiving Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      title="No purchases on record"
                      description="No vendor purchase orders have been logged for this supplier."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {p.purchaseNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(p.purchaseDate)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(p.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">
                      {formatCurrency(p.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">
                      <span className={p.balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(p.balanceDue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        size="sm"
                        variant={p.status === 'received' ? 'success' : 'warning'}
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/purchases/${p.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Disburse Supplier Payment"
        description={`Record outgoing payment to ${supplier.name}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Payment Amount (₹)"
            type="number"
            step="0.01"
            required
            prefixText="₹"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />

          <Select
            label="Payment Channel"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Corporate Card</option>
          </Select>

          <Input
            label="Bank UTR / Transaction Reference"
            placeholder="e.g. UTR / Cheque #987654"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Disbursement
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

