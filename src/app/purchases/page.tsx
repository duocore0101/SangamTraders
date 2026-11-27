'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Purchase } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { Truck, Plus, Search, FileDown, Eye, CheckCircle2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = () => {
    setPurchases(storeService.getPurchases());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPurchases = purchases.filter((p) => {
    const matchSearch =
      !search ||
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplierInvoiceNumber && p.supplierInvoiceNumber.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleExport = () => {
    const data = filteredPurchases.map((p) => ({
      'PO Number': p.purchaseNumber,
      Date: formatDate(p.purchaseDate),
      Supplier: p.supplierName,
      'Supplier Invoice #': p.supplierInvoiceNumber || '',
      'Total Amount (₹)': p.totalAmount,
      'Amount Paid (₹)': p.amountPaid,
      'Balance Due (₹)': p.balanceDue,
      'Status': p.status,
      'Payment Status': p.paymentStatus,
    }));
    exportToExcel(data, `Purchases_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Purchases exported to Excel');
  };

  const handleReceivePurchase = (id: string, number: string) => {
    try {
      storeService.receivePurchase(id);
      toast.success(`Purchase ${number} marked as received! Quantities added to warehouse stock.`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error receiving purchase';
      toast.error(msg);
    }
  };

  const handleDeletePurchase = () => {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    try {
      storeService.deletePurchase(purchaseToDelete.id);
      toast.success(`Purchase ${purchaseToDelete.purchaseNumber} deleted successfully!`);
      setPurchaseToDelete(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting purchase';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell title="Purchase Orders & Inward Inventory">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Supplier Purchases & Stock Inward
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log vendor purchases, receive inventory shipments, and track accounts payable
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
            Export Excel
          </Button>
          <Link href="/purchases/new">
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Purchase
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="sm:col-span-2">
          <Input
            placeholder="Search by PO number, supplier name, vendor invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Purchase Statuses</option>
            <option value="received">Received (Stock Added)</option>
            <option value="draft">Draft (Pending Receiving)</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="text-center">Receiving Status</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      title="No purchases found"
                      description="No vendor purchase orders found matching your search."
                      action={
                        <Link href="/purchases/new">
                          <Button size="sm" variant="primary">
                            Create First Purchase
                          </Button>
                        </Link>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/purchases/${p.id}`}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {p.purchaseNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(p.purchaseDate)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 text-xs">{p.supplierName}</p>
                        {p.supplierInvoiceNumber && (
                          <p className="text-[11px] font-mono text-slate-400">
                            Inv: {p.supplierInvoiceNumber}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(p.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-emerald-600 font-medium">
                      {formatCurrency(p.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold">
                      <span className={p.balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(p.balanceDue)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        size="sm"
                        variant={p.status === 'received' ? 'success' : p.status === 'draft' ? 'warning' : 'danger'}
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        size="sm"
                        variant={p.paymentStatus === 'paid' ? 'success' : p.paymentStatus === 'partially_paid' ? 'warning' : 'danger'}
                      >
                        {p.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleReceivePurchase(p.id, p.purchaseNumber)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Receive
                          </Button>
                        )}
                        <Link href={`/purchases/${p.id}`}>
                          <Button variant="ghost" size="icon" title="View purchase details">
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete purchase bill"
                          onClick={() => setPurchaseToDelete(p)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!purchaseToDelete}
        onClose={() => setPurchaseToDelete(null)}
        onConfirm={handleDeletePurchase}
        title="Delete Purchase Bill"
        message={`Are you sure you want to delete purchase ${purchaseToDelete?.purchaseNumber} from ${purchaseToDelete?.supplierName}? If already received, stock quantities will be safely restored.`}
        confirmText="Delete Purchase"
        variant="danger"
        isLoading={isDeleting}
      />
    </AppShell>
  );
}

