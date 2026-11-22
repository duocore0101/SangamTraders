'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Product, StockStatus } from '@/types';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { 
  Boxes, 
  AlertTriangle, 
  IndianRupee, 
  Search, 
  FileDown, 
  ArrowLeftRight, 
  SlidersHorizontal,
  PackageCheck,
  Eye
} from 'lucide-react';
import Link from 'next/link';

export default function InventoryOverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    setProducts(storeService.getProducts());
  }, []);

  const totalInventoryValue = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const totalStockUnits = products.reduce((sum, p) => sum + p.currentStock, 0);
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockLevel && p.currentStock > 0).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.stockStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExport = () => {
    const data = filteredProducts.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      Category: p.categoryName,
      'Current Stock': p.currentStock,
      Unit: p.unitSymbol,
      'Min Level': p.minStockLevel,
      'Unit Cost (₹)': p.purchasePrice,
      'Total Value (₹)': +(p.currentStock * p.purchasePrice).toFixed(2),
      Status: p.stockStatus,
    }));
    exportToExcel(data, `Inventory_Valuation_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Inventory ledger exported to Excel');
  };

  return (
    <AppShell title="Warehouse Inventory Overview">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Inventory Stock & Valuations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time warehouse counts, low-stock thresholds, and reorder levels
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/inventory/stock-movements">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeftRight className="w-4 h-4 text-blue-600" />}>
              Stock Ledger
            </Button>
          </Link>
          <Link href="/inventory/adjustments">
            <Button variant="outline" size="sm" leftIcon={<SlidersHorizontal className="w-4 h-4 text-purple-600" />}>
              Adjustments
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleExport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
            Export Valuation
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Stock Value"
          value={formatCurrency(totalInventoryValue)}
          subtitle="At purchase cost"
          icon={<IndianRupee className="w-5 h-5" />}
          color="indigo"
        />

        <StatCard
          title="Total Units in Store"
          value={totalStockUnits.toLocaleString()}
          subtitle="Cumulative units count"
          icon={<Boxes className="w-5 h-5" />}
          color="blue"
        />

        <StatCard
          title="Low Stock Warning"
          value={lowStockCount}
          subtitle="Products below min level"
          icon={<AlertTriangle className="w-5 h-5" />}
          color={lowStockCount > 0 ? 'amber' : 'slate'}
        />

        <StatCard
          title="Out of Stock"
          value={outOfStockCount}
          subtitle="Zero inventory balance"
          icon={<PackageCheck className="w-5 h-5" />}
          color={outOfStockCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <CardTitle>Physical Stock Ledger</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Filter by product name, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-44 shrink-0">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="in_stock">In Stock Only</option>
                <option value="low_stock">Low Stock Only</option>
                <option value="out_of_stock">Out of Stock Only</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name & SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Min Threshold</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Inventory Value</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      title="No products found"
                      description="No items match your filter criteria."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p) => {
                  const itemValue = p.currentStock * p.purchasePrice;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Link
                            href={`/products/${p.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs font-mono text-slate-400">SKU: {p.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {p.categoryName}
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-slate-900">
                        {formatQuantity(p.currentStock, p.unitSymbol)}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 font-mono">
                        {formatQuantity(p.minStockLevel, p.unitSymbol)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-600">
                        {formatCurrency(p.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(itemValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            p.stockStatus === 'in_stock'
                              ? 'success'
                              : p.stockStatus === 'low_stock'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {p.stockStatus?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/products/${p.id}`}>
                          <Button variant="ghost" size="icon" title="View details and adjustments">
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

