'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { StockMovement, StockMovementType } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { ArrowLeft, Search, FileDown, ArrowLeftRight, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    setMovements(storeService.getStockMovements());
  }, []);

  const filteredMovements = movements.filter((m) => {
    const matchSearch =
      !search ||
      m.productName.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.referenceNumber && m.referenceNumber.toLowerCase().includes(search.toLowerCase())) ||
      m.reason.toLowerCase().includes(search.toLowerCase());

    const matchType = typeFilter === 'all' || m.transactionType === typeFilter;

    return matchSearch && matchType;
  });

  const handleExport = () => {
    const data = filteredMovements.map((m) => ({
      'Date & Time': formatDateTime(m.createdAt),
      Product: m.productName,
      SKU: m.sku,
      'Transaction Type': m.transactionType,
      'Qty Change': m.quantityChange,
      'Previous Stock': m.previousStock,
      'New Stock': m.newStock,
      'Reference No': m.referenceNumber || '',
      Reason: m.reason,
      'Recorded By': m.userName || '',
    }));
    exportToExcel(data, `Stock_Ledger_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Stock movement ledger exported to Excel');
  };

  const getTransactionBadge = (type: StockMovementType) => {
    const styles: Record<StockMovementType, { bg: string; text: string }> = {
      opening_stock: { bg: 'bg-slate-100', text: 'text-slate-700' },
      purchase: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
      sale: { bg: 'bg-blue-50', text: 'text-blue-700' },
      sale_return: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
      purchase_return: { bg: 'bg-amber-50', text: 'text-amber-700' },
      damaged_stock: { bg: 'bg-rose-50', text: 'text-rose-700' },
      manual_adjustment: { bg: 'bg-purple-50', text: 'text-purple-700' },
    };
    const s = styles[type] || { bg: 'bg-slate-100', text: 'text-slate-700' };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  return (
    <AppShell title="Stock Movement Ledger">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/inventory"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
            </Link>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Inventory Audit Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Immutable audit record of every stock addition, deduction, sale and return
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={handleExport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
          Export Ledger Excel
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="sm:col-span-2">
          <Input
            placeholder="Search by product, SKU, invoice/PO number, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Transaction Types</option>
            <option value="sale">Sale (Invoice Deduction)</option>
            <option value="purchase">Purchase (Stock Addition)</option>
            <option value="sale_return">Sale Return (Reversal)</option>
            <option value="damaged_stock">Damaged Stock</option>
            <option value="manual_adjustment">Manual Adjustment</option>
            <option value="opening_stock">Opening Balance</option>
          </Select>
        </div>
      </div>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Product Name & SKU</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-center">Quantity Change</TableHead>
                <TableHead className="text-center">Stock: Old → New</TableHead>
                <TableHead>Reference / Voucher</TableHead>
                <TableHead>Audit Reason</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      title="No stock movements found"
                      description="No records matched your search or transaction type filter."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-slate-600 font-medium">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          href={`/products/${m.productId}`}
                          className="font-bold text-slate-900 hover:text-blue-600"
                        >
                          {m.productName}
                        </Link>
                        <p className="text-[11px] font-mono text-slate-400">SKU: {m.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTransactionBadge(m.transactionType)}</TableCell>
                    <TableCell className="text-center font-bold font-mono">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantityChange > 0 ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5" /> +{m.quantityChange}
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3.5 h-3.5" /> {m.quantityChange}
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-slate-600">
                      {m.previousStock} → <span className="font-bold text-slate-900">{m.newStock}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600">
                      {m.referenceNumber || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {m.reason}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {m.userName || 'Admin'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

