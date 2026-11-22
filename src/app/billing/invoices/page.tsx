'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Invoice, PaymentMethod } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateInvoicePdf } from '@/lib/pdf/invoicePdf';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { 
  FileText, 
  Search, 
  FileDown, 
  Printer, 
  Download, 
  Eye, 
  CreditCard, 
  Ban, 
  PlusCircle 
} from 'lucide-react';
import Link from 'next/link';

export default function InvoicesHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Cancel Modal State
  const [cancelCandidate, setCancelCandidate] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Payment Modal State
  const [paymentCandidate, setPaymentCandidate] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadData = () => {
    setInvoices(storeService.getInvoices());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storeService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerMobile.includes(search);

    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchPayment = paymentFilter === 'all' || inv.paymentStatus === paymentFilter;

    return matchSearch && matchStatus && matchPayment;
  });

  const handleExport = () => {
    const data = filteredInvoices.map((i) => ({
      'Invoice #': i.invoiceNumber,
      Date: formatDate(i.invoiceDate),
      Customer: i.customerName,
      Mobile: i.customerMobile,
      'Grand Total (₹)': i.grandTotal,
      'Amount Paid (₹)': i.amountPaid,
      'Balance Due (₹)': i.balanceDue,
      'Payment Status': i.paymentStatus,
      'Payment Method': i.paymentMethod,
      'Invoice Status': i.status,
      'Billed By': i.createdByName || '',
    }));
    exportToExcel(data, `Invoices_Report_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Invoices history exported to Excel');
  };

  const handlePrint = (inv: Invoice) => {
    generateInvoicePdf(inv, storeService.getSettings(), true);
  };

  const handleDownload = (inv: Invoice) => {
    generateInvoicePdf(inv, storeService.getSettings(), false);
  };

  // Record additional payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCandidate) return;
    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }
    if (paymentAmount > paymentCandidate.balanceDue) {
      toast.error(`Amount cannot exceed balance due of ₹${paymentCandidate.balanceDue}`);
      return;
    }

    try {
      storeService.recordPayment({
        referenceType: 'invoice',
        referenceId: paymentCandidate.id,
        referenceNumber: paymentCandidate.invoiceNumber,
        partyType: 'customer',
        partyId: paymentCandidate.customerId || 'walk-in',
        partyName: paymentCandidate.customerName,
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes || `Counter receipt towards ${paymentCandidate.invoiceNumber}`,
      });

      toast.success(`Payment of ₹${paymentAmount} recorded successfully!`);
      setPaymentCandidate(null);
      setPaymentAmount(0);
      setPaymentNotes('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment';
      toast.error(msg);
    }
  };

  // Cancel invoice with atomic stock reversal
  const handleCancelConfirm = () => {
    if (!cancelCandidate) return;
    try {
      storeService.cancelInvoice(cancelCandidate.id, cancelReason.trim() || 'Customer returned/cancelled');
      toast.success(`Invoice ${cancelCandidate.invoiceNumber} cancelled and stock reversed to inventory!`);
      setCancelCandidate(null);
      setCancelReason('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot cancel invoice';
      toast.error(msg);
    }
  };

  return (
    <AppShell title="Invoices & Billing History">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Sales Invoices History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {invoices.length} invoices generated • {filteredInvoices.length} filtered
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
            Export Excel
          </Button>
          <Link href="/billing/new">
            <Button size="sm" variant="primary" leftIcon={<PlusCircle className="w-4 h-4" />}>
              New Sale Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="sm:col-span-2">
          <Input
            placeholder="Search by invoice number, customer name, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid (Fully Cleared)</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid / Credit</option>
            <option value="refunded">Refunded / Cancelled</option>
          </Select>
        </div>

        <div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Invoice Statuses</option>
            <option value="finalized">Finalized</option>
            <option value="cancelled">Cancelled (Stock Restored)</option>
          </Select>
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      title="No invoices found"
                      description="No sales invoices match your search query."
                      action={
                        <Link href="/billing/new">
                          <Button size="sm" variant="primary">
                            Create First Sale Bill
                          </Button>
                        </Link>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link
                        href={`/billing/invoices/${inv.id}`}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(inv.invoiceDate)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 text-xs">{inv.customerName}</p>
                        {inv.customerMobile && (
                          <p className="text-[11px] text-slate-400 font-mono">{inv.customerMobile}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(inv.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600 font-medium">
                      {formatCurrency(inv.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">
                      <span className={inv.balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(inv.balanceDue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        size="sm"
                        variant={
                          inv.paymentStatus === 'paid'
                            ? 'success'
                            : inv.paymentStatus === 'partially_paid'
                            ? 'warning'
                            : inv.paymentStatus === 'refunded'
                            ? 'neutral'
                            : 'danger'
                        }
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          inv.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(inv)}
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(inv)}
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                        </Button>
                        <Link href={`/billing/invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" title="View details">
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                        {inv.status === 'finalized' && inv.balanceDue > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPaymentCandidate(inv);
                              setPaymentAmount(inv.balanceDue);
                            }}
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4 text-purple-600" />
                          </Button>
                        )}
                        {inv.status === 'finalized' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancelCandidate(inv)}
                            title="Cancel Invoice & Restore Stock"
                          >
                            <Ban className="w-4 h-4 text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Additional Payment Modal */}
      <Modal
        isOpen={Boolean(paymentCandidate)}
        onClose={() => setPaymentCandidate(null)}
        title="Record Invoice Payment"
        description={`Record incoming collection for ${paymentCandidate?.invoiceNumber} (${paymentCandidate?.customerName})`}
      >
        {paymentCandidate && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between">
                <span>Grand Total:</span>
                <span className="font-bold">{formatCurrency(paymentCandidate.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Paid:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(paymentCandidate.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Remaining Balance Due:</span>
                <span>{formatCurrency(paymentCandidate.balanceDue)}</span>
              </div>
            </div>

            <Input
              label="Payment Amount (₹)"
              type="number"
              step="0.01"
              required
              prefixText="₹"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            />

            <Select
              label="Payment Channel"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="cash">Cash Counter</option>
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="card">Card (POS Terminal)</option>
              <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
            </Select>

            <Input
              label="Notes / Transaction ID (Optional)"
              placeholder="e.g. UTR #12345678"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentCandidate(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm & Apply Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Invoice Confirmation Modal with Stock Reversal */}
      <Modal
        isOpen={Boolean(cancelCandidate)}
        onClose={() => setCancelCandidate(null)}
        title="Cancel Invoice & Reverse Stock"
        description="Cancelling an invoice restores all deducted product stock and logs sale return in audit ledger"
      >
        {cancelCandidate && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs space-y-1 border border-rose-200">
              <p className="font-bold">⚠️ Warning: Irreversible Cancellation Action</p>
              <p>
                Cancelling invoice <strong>{cancelCandidate.invoiceNumber}</strong> ({formatCurrency(cancelCandidate.grandTotal)}) will return {cancelCandidate.items?.length || 0} items back into physical store inventory.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer returned items, Billed wrong items by mistake..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCancelCandidate(null)}>
                Keep Invoice
              </Button>
              <Button type="button" variant="danger" onClick={handleCancelConfirm}>
                Confirm Cancellation & Reversal
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

