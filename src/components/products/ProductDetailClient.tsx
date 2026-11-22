'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Product, StockMovement, Category, Unit, AdjustmentType } from '@/types';
import { formatCurrency, formatQuantity, formatDate, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Edit3, 
  SlidersHorizontal, 
  History, 
  Package, 
  TrendingUp, 
  Barcode, 
  Building,
  Save
} from 'lucide-react';
import Link from 'next/link';

export function ProductDetailClient({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Adjustment Modal State
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<AdjustmentType>('add');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState(0);
  const [editPurchasePrice, setEditPurchasePrice] = useState(0);
  const [editMinStock, setEditMinStock] = useState(5);

  const loadData = () => {
    const prod = storeService.getProductById(id);
    setProduct(prod);
    if (prod) {
      setMovements(storeService.getStockMovements(prod.id));
      setEditName(prod.name);
      setEditSellingPrice(prod.sellingPrice);
      setEditPurchasePrice(prod.purchasePrice);
      setEditMinStock(prod.minStockLevel);
    }
    setCategories(storeService.getCategories());
    setUnits(storeService.getUnits());
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!product) {
    return (
      <AppShell title="Product Details">
        <EmptyState
          title="Product not found"
          description="The requested hardware item does not exist or was deleted."
          action={
            <Link href="/products">
              <Button size="sm" variant="primary">
                Return to Product Catalog
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const profitAmount = product.sellingPrice - product.purchasePrice;
  const profitMargin = product.sellingPrice > 0 ? (profitAmount / product.sellingPrice) * 100 : 0;

  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustQty <= 0) {
      toast.error('Adjustment quantity must be greater than zero');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('Please enter an adjustment reason for audit records');
      return;
    }

    try {
      storeService.adjustStock({
        productId: product.id,
        adjustmentType: adjustType,
        quantity: adjustQty,
        reason: adjustReason.trim(),
      });
      toast.success('Stock adjusted and audit record created successfully');
      setIsAdjustOpen(false);
      setAdjustReason('');
      setAdjustQty(1);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Adjustment failed';
      toast.error(msg);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      storeService.updateProduct(product.id, {
        name: editName,
        sellingPrice: Number(editSellingPrice),
        purchasePrice: Number(editPurchasePrice),
        minStockLevel: Number(editMinStock),
      });
      toast.success('Product details updated');
      setIsEditOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error(msg);
    }
  };

  return (
    <AppShell title={`Product: ${product.name}`}>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Edit Product
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAdjustOpen(true)}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                {product.sku}
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {product.categoryName}
              </span>
              {product.brand && (
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {product.brand}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{product.name}</h2>
            {product.description && (
              <p className="text-xs text-slate-500 max-w-2xl">{product.description}</p>
            )}
          </div>

          <div className="text-right sm:border-l sm:pl-6 border-slate-100 shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Current Available Stock
            </span>
            <div className="text-3xl font-black text-slate-900 mt-0.5">
              {formatQuantity(product.currentStock, product.unitSymbol)}
            </div>
            <div className="mt-1">
              <Badge
                variant={
                  product.stockStatus === 'in_stock'
                    ? 'success'
                    : product.stockStatus === 'low_stock'
                    ? 'warning'
                    : 'danger'
                }
              >
                {product.stockStatus === 'in_stock'
                  ? 'Healthy Inventory'
                  : product.stockStatus === 'low_stock'
                  ? 'Reorder Warning'
                  : 'Out of Stock'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Pricing Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 font-medium">Selling Rate</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(product.sellingPrice)}
            </p>
            <span className="text-[11px] text-slate-400">Excl. GST</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 font-medium">Purchase Cost</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {formatCurrency(product.purchasePrice)}
            </p>
            <span className="text-[11px] text-slate-400">Supplier cost</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 font-medium">Estimated Gross Profit</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              +{formatCurrency(profitAmount)}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold">
              {profitMargin.toFixed(1)}% margin
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 font-medium">Tax Slab</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{product.gstRate}% GST</p>
            <span className="text-[11px] text-slate-400">
              CGST {(product.gstRate / 2).toFixed(1)}% + SGST {(product.gstRate / 2).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stock Ledger History for this Product */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Product Stock Ledger & Audit Movements</CardTitle>
            <p className="text-xs text-slate-500">
              Complete transaction-by-transaction history for {product.name}
            </p>
          </div>
          <Badge variant="neutral">{movements.length} Entries</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Transaction Type</TableHead>
                <TableHead className="text-center">Quantity Change</TableHead>
                <TableHead className="text-center">Stock Before → After</TableHead>
                <TableHead>Reference / Invoice</TableHead>
                <TableHead>Audit Reason</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      title="No stock movements recorded"
                      description="No sales, purchases, or adjustments have altered this product stock yet."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-slate-600 font-medium">
                      {formatDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {m.transactionType.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold font-mono">
                      <span
                        className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono text-slate-600">
                      {m.previousStock} → <span className="font-bold">{m.newStock}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600">
                      {m.referenceNumber || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {m.reason}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {m.userName || 'System'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Manual Stock Adjustment"
        description={`Adjust physical warehouse quantity for "${product.name}"`}
      >
        <form onSubmit={handleStockAdjustmentSubmit} className="space-y-4">
          <div>
            <Select
              label="Adjustment Type"
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as AdjustmentType)}
            >
              <option value="add">Add Stock (Received without PO / Found)</option>
              <option value="reduce">Reduce Stock (Physical Count Lower)</option>
              <option value="damage">Record Damaged Product</option>
              <option value="lost">Record Lost / Stolen Item</option>
              <option value="physical_correction">Physical Audit Correction</option>
            </Select>
          </div>

          <div>
            <Input
              label="Quantity to Adjust"
              type="number"
              step={product.unitSymbol === 'kg' || product.unitSymbol === 'm' ? '0.001' : '1'}
              min="0.001"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
              suffixText={product.unitSymbol || 'pc'}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Current Stock: <strong>{product.currentStock} {product.unitSymbol}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
              Reason for Adjustment <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Physical inventory count correction, Broken carton during unloading, Sample demonstration..."
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Product Details"
        description="Update pricing and minimum stock alert levels"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Product Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Price (₹)"
              type="number"
              step="0.01"
              required
              value={editPurchasePrice}
              onChange={(e) => setEditPurchasePrice(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              step="0.01"
              required
              value={editSellingPrice}
              onChange={(e) => setEditSellingPrice(parseFloat(e.target.value) || 0)}
            />
          </div>

          <Input
            label="Minimum Stock Alert Level"
            type="number"
            required
            value={editMinStock}
            onChange={(e) => setEditMinStock(parseFloat(e.target.value) || 0)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

