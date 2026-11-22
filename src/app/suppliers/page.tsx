'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Supplier } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { Building2, Plus, Search, FileDown, Eye, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    setSuppliers(storeService.getSuppliers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.mobile.includes(search) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (s.gstin && s.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExport = () => {
    const data = filteredSuppliers.map((s) => ({
      'Supplier Name': s.name,
      'Contact Person': s.contactPerson || '',
      Mobile: s.mobile,
      Email: s.email || '',
      Address: s.address || '',
      GSTIN: s.gstin || '',
      'Total Purchased (₹)': s.totalPurchased || 0,
      'Outstanding Balance (₹)': s.outstandingBalance || 0,
    }));
    exportToExcel(data, `Suppliers_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Suppliers list exported to Excel');
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      toast.error('Supplier name and mobile number are required');
      return;
    }

    try {
      storeService.addSupplier({
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        gstin: gstin.trim() || undefined,
        state: state.trim() || 'Maharashtra',
        notes: notes.trim() || undefined,
      });
      toast.success(`Supplier "${name}" registered successfully!`);
      setIsAddOpen(false);
      setName('');
      setContactPerson('');
      setMobile('');
      setEmail('');
      setAddress('');
      setGstin('');
      setNotes('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding supplier';
      toast.error(msg);
    }
  };

  return (
    <AppShell title="Supplier & Vendor Management">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Suppliers & Vendors
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage hardware distributors, manufacturers, and track payables
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
            Export Excel
          </Button>
          <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <Input
          placeholder="Search suppliers by company name, contact person, phone, GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company & Contact</TableHead>
                <TableHead>Phone / Email</TableHead>
                <TableHead>GSTIN / Location</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
                <TableHead className="text-right">Payable Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      title="No suppliers found"
                      description="No vendor records match your search."
                      action={
                        <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                          Add First Supplier
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 block text-xs"
                      >
                        {s.name}
                      </Link>
                      {s.contactPerson && (
                        <span className="text-[11px] text-slate-500">Contact: {s.contactPerson}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <p className="font-mono text-slate-700 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {s.mobile}
                        </p>
                        {s.email && <p className="text-slate-400">{s.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {s.gstin && (
                          <span className="font-mono font-bold text-blue-600 block">
                            {s.gstin}
                          </span>
                        )}
                        {s.address && (
                          <span className="text-slate-500 truncate max-w-xs block">
                            {s.address}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(s.totalPurchased || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-xs">
                      <span className={(s.outstandingBalance || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(s.outstandingBalance || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/suppliers/${s.id}`}>
                        <Button variant="ghost" size="icon" title="View supplier ledger">
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

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Hardware Supplier"
        description="Register new distributor, mill, or vendor profile"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <Input
            label="Supplier / Distributor Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tata Steel North Distributors"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person Name"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Ashok Gupta"
            />
            <Input
              label="Mobile Number"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@distributor.com"
            />
            <Input
              label="GSTIN (Optional)"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="07AAACT1122D1Z0"
            />
          </div>

          <Input
            label="Warehouse / Depot Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Loha Mandi, Naraina, Delhi"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

