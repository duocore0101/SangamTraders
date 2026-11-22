'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Invoice } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { generateInvoicePdf } from '@/lib/pdf/invoicePdf';
import { ArrowLeft, Printer, Download, CreditCard, Ban } from 'lucide-react';
import Link from 'next/link';

export function InvoiceDetailClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);

  const loadData = () => {
    setInvoice(storeService.getInvoiceById(id));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!invoice) {
    return (
      <AppShell title="Invoice Details">
        <EmptyState
          title="Invoice not found"
          description="The requested sales bill could not be found."
          action={
            <Link href="/billing/invoices">
              <Button size="sm" variant="primary">
                Return to Invoices
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const settings = storeService.getSettings();

  return (
    <AppShell title={`Invoice: ${invoice.invoiceNumber}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/billing/invoices"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices History
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateInvoicePdf(invoice, settings, true)}
            leftIcon={<Printer className="w-4 h-4 text-slate-600" />}
          >
            Print Invoice
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => generateInvoicePdf(invoice, settings, false)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
          <div>
            <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${
              invoice.isGstBill !== false && invoice.taxTotal > 0 ? 'text-blue-600' : 'text-emerald-600'
            }`}>
              {invoice.isGstBill !== false && invoice.taxTotal > 0 ? 'TAX INVOICE' : 'RETAIL INVOICE / CASH MEMO (NON-GST)'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {invoice.invoiceNumber}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Date: <strong>{formatDateTime(invoice.invoiceDate)}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="flex items-center sm:justify-end gap-2">
              <Badge
                variant={
                  invoice.paymentStatus === 'paid'
                    ? 'success'
                    : invoice.paymentStatus === 'partially_paid'
                    ? 'warning'
                    : 'danger'
                }
              >
                Payment: {invoice.paymentStatus.toUpperCase()}
              </Badge>
              <Badge variant={invoice.status === 'finalized' ? 'info' : 'danger'}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Payment Method: <strong className="uppercase">{invoice.paymentMethod}</strong>
            </p>
          </div>
        </div>

        {/* Addresses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div>
            <p className="font-bold text-slate-900 uppercase tracking-wide text-[11px] mb-1">
              Billed From (Store):
            </p>
            <p className="font-bold text-slate-800 text-sm">{settings.shopName}</p>
            <p className="text-slate-700 font-medium">Owner: MR. Rajendra Gaikwad</p>
            <p className="text-slate-600">{settings.address || 'BankarPhata, Otur, Maharashtra'}</p>
            <p className="text-slate-600">{settings.state || 'Maharashtra'} - {settings.pincode || '412409'}</p>
            <p className="text-slate-600">Phone: {settings.phone || '9766551783'}</p>
            <p className="font-mono text-blue-700 font-bold">GSTIN: {settings.gstin || '27ANPPG4334F1Z0'}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 uppercase tracking-wide text-[11px] mb-1">
              Billed To (Customer):
            </p>
            <p className="font-bold text-slate-800 text-sm">{invoice.customerName}</p>
            <p className="text-slate-600">Mobile: {invoice.customerMobile}</p>
            {invoice.customerAddress && <p className="text-slate-600">Address: {invoice.customerAddress}</p>}
            {invoice.customerState && <p className="text-slate-600">State: {invoice.customerState}</p>}
            {invoice.customerGstin && <p className="font-mono text-slate-700">Customer GSTIN: {invoice.customerGstin}</p>}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Itemized Goods & Services
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Product & SKU</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Rate</TableHead>
                <TableHead className="text-center">Discount</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-center">GST Rate</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items?.map((item, idx) => (
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
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono text-slate-500">
                    {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {formatCurrency(item.taxableAmount)}
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono">
                    {item.gstRate}%
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-slate-600">
                    {formatCurrency(item.cgstAmount + item.sgstAmount + item.igstAmount)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs font-mono text-slate-900">
                    {formatCurrency(item.totalPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals & Notes Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div className="space-y-4">
            {invoice.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border text-xs">
                <p className="font-bold text-slate-700 mb-0.5">Invoice Notes:</p>
                <p className="text-slate-600">{invoice.notes}</p>
              </div>
            )}

            <div className="p-3 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">Terms & Conditions:</p>
              <p className="whitespace-pre-line text-[11px]">{settings.termsAndConditions}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/90 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(invoice.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxable Amount:</span>
              <span className="font-mono">{formatCurrency(invoice.taxableAmount)}</span>
            </div>
            {invoice.cgstTotal > 0 && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST Total:</span>
                  <span className="font-mono">{formatCurrency(invoice.cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST Total:</span>
                  <span className="font-mono">{formatCurrency(invoice.sgstTotal)}</span>
                </div>
              </>
            )}
            {invoice.igstTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>IGST Total:</span>
                <span className="font-mono">{formatCurrency(invoice.igstTotal)}</span>
              </div>
            )}
            {invoice.roundingAdjustment !== 0 && (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Rounding Adjustment:</span>
                <span className="font-mono">{formatCurrency(invoice.roundingAdjustment)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-xl font-black text-blue-600 font-mono">
                {formatCurrency(invoice.grandTotal)}
              </span>
            </div>

            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatCurrency(invoice.amountPaid)}</span>
            </div>

            <div className="flex justify-between text-rose-600 font-bold text-sm">
              <span>Balance Due:</span>
              <span className="font-mono">{formatCurrency(invoice.balanceDue)}</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

