'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Payment, PaymentMethod, Customer, Supplier } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { CreditCard, Plus, Search, FileDown, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // New Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setPayments(storeService.getPayments());
    setCustomers(storeService.getCustomers());
    setSuppliers(storeService.getSuppliers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      !search ||
      p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.partyName.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase());

    const matchParty = partyTypeFilter === 'all' || p.partyType === partyTypeFilter;
    const matchMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;

    return matchSearch && matchParty && matchMethod;
  });

  const handleExport = () => {
    const data = filteredPayments.map((p) => ({
      'Receipt / Voucher #': p.paymentNumber,
      Date: formatDateTime(p.paymentDate),
      'Party Type': p.partyType.toUpperCase(),
      'Party Name': p.partyName,
      'Reference / Voucher': p.referenceNumber,
      'Amount (₹)': p.amount,
      Method: p.paymentMethod.toUpperCase(),
      Notes: p.notes || '',
    }));
    exportToExcel(data, `Payments_Ledger_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Payments history exported to Excel');
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      toast.error(`Please select a ${partyType}`);
      return;
    }
    if (amount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    const partyName =
      partyType === 'customer'
        ? customers.find((c) => c.id === partyId)?.name || 'Customer'
        : suppliers.find((s) => s.id === partyId)?.name || 'Supplier';

    try {
      storeService.recordPayment({
        referenceType: 'direct',
        referenceId: partyId,
        referenceNumber: `DIRECT-${Date.now().toString().slice(-4)}`,
        partyType,
        partyId,
        partyName,
        amount: Number(amount),
        paymentMethod: method,
        notes: notes || `Direct ${partyType} transaction`,
      });

      // Update balance
      if (partyType === 'customer') {
        const cust = customers.find((c) => c.id === partyId);
        if (cust) {
          cust.outstandingBalance = Math.max(0, +(cust.outstandingBalance - amount).toFixed(2));
          storeService.updateCustomer(cust.id, { outstandingBalance: cust.outstandingBalance });
        }
      } else {
        const sup = suppliers.find((s) => s.id === partyId);
        if (sup) {
          sup.outstandingBalance = Math.max(0, +((sup.outstandingBalance || 0) - amount).toFixed(2));
          storeService.updateSupplier(sup.id, { outstandingBalance: sup.outstandingBalance });
        }
      }

      toast.success(`Payment of ₹${amount} recorded for ${partyName}`);
      setIsModalOpen(false);
      setAmount(0);
      setNotes('');
      setPartyId('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording payment';
      toast.error(msg);
    }
  };

  return (
    <AppShell title="Payment Tracking & Vouchers">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Cash & Bank Payment Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of customer inflows, vendor outflows, and partial collections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
            Export Excel
          </Button>
          <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Record Payment
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="sm:col-span-2">
          <Input
            placeholder="Search by receipt number, customer/supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            value={partyTypeFilter}
            onChange={(e) => setPartyTypeFilter(e.target.value as 'all' | 'customer' | 'supplier')}
          >
            <option value="all">All Party Types</option>
            <option value="customer">Customer Collections (Inflow)</option>
            <option value="supplier">Supplier Disbursements (Outflow)</option>
          </Select>
        </div>

        <div>
          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </Select>
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher / Receipt #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference / Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      title="No payment records found"
                      description="No transactions match your search filter."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => {
                  const isInflow = p.partyType === 'customer';
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-blue-600">
                        {p.paymentNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDateTime(p.paymentDate)}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {p.partyName}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isInflow
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isInflow ? 'Inflow (Collection)' : 'Outflow (Disbursement)'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {p.referenceNumber}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black font-mono text-sm">
                        <span className={isInflow ? 'text-emerald-600' : 'text-slate-900'}>
                          {isInflow ? '+' : '-'} {formatCurrency(p.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Payment Entry"
        description="Add manual collection from customer or payment to vendor"
      >
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPartyType('customer');
                setPartyId('');
              }}
              className={`p-2.5 rounded-lg border text-xs font-bold text-center transition-all ${
                partyType === 'customer'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Customer Inflow
            </button>
            <button
              type="button"
              onClick={() => {
                setPartyType('supplier');
                setPartyId('');
              }}
              className={`p-2.5 rounded-lg border text-xs font-bold text-center transition-all ${
                partyType === 'supplier'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              Supplier Outflow
            </button>
          </div>

          <div>
            <Select
              label={partyType === 'customer' ? 'Select Customer' : 'Select Supplier'}
              required
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
            >
              <option value="">-- Choose Account --</option>
              {partyType === 'customer'
                ? customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: ₹{c.outstandingBalance})
                    </option>
                  ))
                : suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Due: ₹{s.outstandingBalance || 0})
                    </option>
                  ))}
            </Select>
          </div>

          <div>
            <Input
              label="Payment Amount (₹)"
              type="number"
              step="0.01"
              required
              prefixText="₹"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Select
              label="Payment Channel"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="card">Card</option>
            </Select>
          </div>

          <div>
            <Input
              label="Notes / Transaction Details"
              placeholder="e.g. Cleared bill #SS-INV-1002"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

