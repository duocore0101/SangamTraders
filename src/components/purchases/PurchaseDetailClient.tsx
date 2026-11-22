'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Purchase } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Truck, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function PurchaseDetailClient({ id }: { id: string }) {
  const [purchase, setPurchase] = useState<Purchase | undefined>(undefined);

  const loadData = () => {
    setPurchase(storeService.getPurchaseById(id));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!purchase) {
    return (
      <AppShell title="Purchase Order Details">
        <EmptyState
          title="Purchase not found"
          description="The requested purchase order record could not be found."
          action={
            <Link href="/purchases">
              <Button size="sm" variant="primary">
                Return to Purchases
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const handleReceive = () => {
    try {
      storeService.receivePurchase(purchase.id);
      toast.success(`Purchase ${purchase.purchaseNumber} marked as received! Quantities added to physical stock.`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error receiving purchase';
      toast.error(msg);
    }
  };

  return (
    <AppShell title={`Purchase: ${purchase.purchaseNumber}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/purchases"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchases
        </Link>

        {purchase.status === 'draft' && (
          <Button
            variant="success"
            size="sm"
            onClick={handleReceive}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Mark as Received & Add Stock
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-1">
              PURCHASE CONSIGNMENT
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-mono">
              {purchase.purchaseNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Order Date: <strong>{formatDate(purchase.purchaseDate)}</strong>
            </p>
          </div>

          <div className="space-y-1 text-left sm:text-right">
            <div className="flex items-center sm:justify-end gap-2">
              <Badge variant={purchase.status === 'received' ? 'success' : 'warning'}>
                {purchase.status.toUpperCase()}
              </Badge>
              <Badge
                variant={
                  purchase.paymentStatus === 'paid'
                    ? 'success'
                    : purchase.paymentStatus === 'partially_paid'
                    ? 'warning'
                    : 'danger'
                }
              >
                {purchase.paymentStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Supplier: <strong>{purchase.supplierName}</strong>
            </p>
            {purchase.supplierInvoiceNumber && (
              <p className="text-xs text-slate-500 font-mono">
                Vendor Bill: {purchase.supplierInvoiceNumber}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Purchased Line Items
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Product Name & SKU</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Purchase Rate</TableHead>
                <TableHead className="text-center">Tax %</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Total Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items?.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-slate-400 font-mono">{idx + 1}</TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-900 text-xs">{item.productName}</p>
                    <p className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</p>
                  </TableCell>
                  <TableCell className="text-center font-bold text-xs font-mono">
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {formatCurrency(item.purchaseRate)}
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono">
                    {item.taxRate}%
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-slate-600">
                    {formatCurrency(item.taxAmount)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs font-mono text-slate-900">
                    {formatCurrency(item.totalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div>
            {purchase.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border text-xs">
                <p className="font-bold text-slate-700">Notes:</p>
                <p className="text-slate-600">{purchase.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(purchase.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax Amount:</span>
              <span className="font-mono">{formatCurrency(purchase.taxAmount)}</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Total Purchase Value:</span>
              <span className="text-xl font-black text-blue-600 font-mono">
                {formatCurrency(purchase.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatCurrency(purchase.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Balance Due to Supplier:</span>
              <span className="font-mono">{formatCurrency(purchase.balanceDue)}</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

