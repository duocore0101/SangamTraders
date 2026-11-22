'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Customer } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { Users, Plus, Search, FileDown, Eye, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');

  const loadData = () => {
    setCustomers(storeService.getCustomers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      (c.gstin && c.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExport = () => {
    const data = filteredCustomers.map((c) => ({
      'Customer Name': c.name,
      Mobile: c.mobile,
      Email: c.email || '',
      Address: c.address || '',
      GSTIN: c.gstin || '',
      'Total Purchases (₹)': c.totalPurchases,
      'Outstanding Balance (₹)': c.outstandingBalance,
      Registered: formatDate(c.createdAt),
    }));
    exportToExcel(data, `Customers_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Customer list exported to Excel');
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      toast.error('Customer name and mobile number are required');
      return;
    }

    try {
      storeService.addCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim() || undefined,
        state: state.trim() || 'Maharashtra',
      });
      toast.success(`Customer "${name}" registered successfully!`);
      setIsAddOpen(false);
      setName('');
      setMobile('');
      setEmail('');
      setAddress('');
      setGstin('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding customer';
      toast.error(msg);
    }
  };

  return (
    <AppShell title="Customer Accounts & Ledger">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Customer Accounts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage regular contractors, builders, homeowners, and track credit balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
            Export Excel
          </Button>
          <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <Input
          placeholder="Search customers by name, phone number, GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Contact & Phone</TableHead>
                <TableHead>GSTIN / Location</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
                <TableHead className="text-right">Outstanding Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      title="No customers found"
                      description="No customer accounts match your search."
                      action={
                        <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                          Register Customer
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 block text-xs"
                      >
                        {c.name}
                      </Link>
                      <span className="text-[11px] text-slate-400">Added: {formatDate(c.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p className="font-mono text-slate-700 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {c.mobile}
                        </p>
                        {c.email && <p className="text-slate-400">{c.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {c.gstin && (
                          <span className="font-mono font-bold text-blue-600 block">
                            {c.gstin}
                          </span>
                        )}
                        {c.address && (
                          <span className="text-slate-500 truncate max-w-xs block">
                            {c.address}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(c.totalPurchases)}
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-xs">
                      <span className={c.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {formatCurrency(c.outstandingBalance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/customers/${c.id}`}>
                        <Button variant="ghost" size="icon" title="View customer profile & invoices">
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register New Customer"
        description="Add contractor or regular store customer profile"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Customer / Business Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Sharma (Contractor)"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mobile Number"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile"
            />
            <Input
              label="Email Address (Optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="GSTIN (Optional)"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="07AAAAA0000A1Z5"
            />
            <Input
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Delhi"
            />
          </div>

          <Input
            label="Address / Site Location (Optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Sector 15, Rohini, Delhi"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Customer
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

