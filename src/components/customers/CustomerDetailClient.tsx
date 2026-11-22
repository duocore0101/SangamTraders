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
import { Customer, Invoice, PaymentMethod } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, ShoppingCart, Phone, MapPin, Building, Eye } from 'lucide-react';
import Link from 'next/link';

export function CustomerDetailClient({ id }: { id: string }) {
  const [customer, setCustomer] = useState<Customer | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    const cust = storeService.getCustomerById(id);
    setCustomer(cust);
    if (cust) {
      setInvoices(storeService.getInvoices().filter((i) => i.customerId === cust.id));
      setAmount(cust.outstandingBalance);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!customer) {
    return (
      <AppShell title="Customer Profile">
        <EmptyState
          title="Customer not found"
          description="The requested customer record does not exist."
          action={
            <Link href="/customers">
              <Button size="sm" variant="primary">
                Return to Customers
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
        referenceId: customer.id,
        referenceNumber: `CUST-${customer.mobile}`,
        partyType: 'customer',
        partyId: customer.id,
        partyName: customer.name,
        amount: Number(amount),
        paymentMethod,
        notes: notes || 'Direct counter collection towards account balance',
      });

      // Update customer balance directly
      customer.outstandingBalance = Math.max(0, +(customer.outstandingBalance - amount).toFixed(2));
      storeService.updateCustomer(customer.id, {
        outstandingBalance: customer.outstandingBalance,
      });

      toast.success(`Payment of ₹${amount} applied to ${customer.name}'s account`);
      setIsPaymentOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording payment';
      toast.error(msg);
    }
  };

  return (
    <AppShell title={`Customer: ${customer.name}`}>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>

        <div className="flex items-center gap-2">
          {customer.outstandingBalance > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPaymentOpen(true)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Collect Due Payment
            </Button>
          )}

          <Link href="/billing/new">
            <Button variant="outline" size="sm" leftIcon={<ShoppingCart className="w-4 h-4" />}>
              Create New Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{customer.name}</h2>
              {customer.gstin && (
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  GSTIN: {customer.gstin}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.mobile}
              </span>
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.address}, {customer.state}
                </span>
              )}
            </div>
          </div>

          <div className="text-right sm:border-l sm:pl-6 border-slate-100 shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <div
              className={`text-3xl font-black font-mono mt-0.5 ${
                customer.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(customer.outstandingBalance)}
            </div>
            <span className="text-xs text-slate-400">
              Total Purchases: {formatCurrency(customer.totalPurchases)}
            </span>
          </div>
        </div>
      </div>

      {/* Invoices History for this Customer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sales Invoices History</CardTitle>
            <p className="text-xs text-slate-500">All bills issued to {customer.name}</p>
          </div>
          <Badge variant="neutral">{invoices.length} Bills</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      title="No invoices yet"
                      description="No purchases have been billed to this customer."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(inv.invoiceDate)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(inv.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">
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
                        variant={inv.paymentStatus === 'paid' ? 'success' : inv.paymentStatus === 'partially_paid' ? 'warning' : 'danger'}
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/billing/invoices/${inv.id}`}>
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
        title="Collect Customer Payment"
        description={`Record credit collection from ${customer.name}`}
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
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
            <option value="card">Card</option>
          </Select>

          <Input
            label="Notes / Receipt Reference"
            placeholder="e.g. Cleared pending dues for January"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Receipt
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

