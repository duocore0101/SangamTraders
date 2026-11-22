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
import { StockAdjustment, Product, AdjustmentType } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Plus, SlidersHorizontal, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [productId, setProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('add');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');

  const loadData = () => {
    setAdjustments(storeService.getStockAdjustments());
    setProducts(storeService.getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error('Please select a product');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (!reason.trim()) {
      toast.error('Audit reason is required');
      return;
    }

    try {
      storeService.adjustStock({
        productId,
        adjustmentType,
        quantity,
        reason: reason.trim(),
      });
      toast.success('Stock adjustment processed and audit logged');
      setIsModalOpen(false);
      setProductId('');
      setQuantity(1);
      setReason('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Adjustment failed';
      toast.error(msg);
    }
  };

  return (
    <AppShell title="Stock Adjustments">
      {/* Top Banner */}
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
            Manual Stock Adjustments & Corrections
          </h2>
          <p className="text-xs text-slate-500">
            Log damaged items, stock shrinkage, physical audit discrepancies, and manual restocks
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          New Adjustment
        </Button>
      </div>

      {/* Adjustments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher #</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Product & SKU</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Adjusted Qty</TableHead>
                <TableHead className="text-center">Stock: Before → After</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Authorised User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      title="No manual adjustments yet"
                      description="Click 'New Adjustment' above to record physical count corrections or damaged stock."
                      action={
                        <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                          Record Adjustment
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                adjustments.map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {adj.adjustmentNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDateTime(adj.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          href={`/products/${adj.productId}`}
                          className="font-bold text-slate-900 hover:text-blue-600"
                        >
                          {adj.productName}
                        </Link>
                        <p className="text-[11px] font-mono text-slate-400">SKU: {adj.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {adj.adjustmentType.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold font-mono">
                      {adj.quantity}
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-slate-600">
                      {adj.previousStock} → <span className="font-bold text-slate-900">{adj.newStock}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {adj.reason}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {adj.createdByName || 'Admin'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Adjustment"
        description="Every adjustment requires a mandatory reason and updates the stock ledger"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Select
              label="Select Product"
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">-- Choose hardware item --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (SKU: {p.sku}) — Available: {p.currentStock} {p.unitSymbol}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Select
              label="Adjustment Nature"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
            >
              <option value="add">Add Stock (Found during warehouse check / Free sample)</option>
              <option value="reduce">Reduce Stock (Physical count lower than recorded)</option>
              <option value="damage">Damaged Stock (Broken in storage or transit)</option>
              <option value="lost">Lost / Misplaced Product</option>
              <option value="physical_correction">Physical Audit Stock Reconciliation</option>
            </Select>
          </div>

          <div>
            <Input
              label="Quantity to Adjust"
              type="number"
              step={selectedProduct?.unitSymbol === 'kg' || selectedProduct?.unitSymbol === 'm' ? '0.001' : '1'}
              min="0.001"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              suffixText={selectedProduct?.unitSymbol || 'unit'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
              Audit Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Month-end physical warehouse recount, Damaged packaging during loading..."
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Commit Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

