'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Product, Category, StockStatus } from '@/types';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { exportToExcel, downloadSampleProductTemplate, parseExcelFile } from '@/lib/excel';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  FileDown, 
  FileUp, 
  FileSpreadsheet, 
  UploadCloud, 
  Trash2, 
  Eye, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  Download, 
  X, 
  Loader2 
} from 'lucide-react';
import Link from 'next/link';

interface ParsedProductRow {
  name: string;
  sku?: string;
  barcode?: string;
  categoryName?: string;
  brand?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  gstRate?: number;
  unitSymbol?: string;
  currentStock?: number;
  minStockLevel?: number;
  description?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('all');
  const [deleteProductCandidate, setDeleteProductCandidate] = useState<Product | null>(null);

  // Bulk Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProductRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setProducts(storeService.getProducts());
    setCategories(storeService.getCategories());
  };

  useEffect(() => {
    reload();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || p.categoryId === selectedCategory;

      const matchStatus =
        selectedStockStatus === 'all' || p.stockStatus === selectedStockStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, selectedCategory, selectedStockStatus]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredProducts.map((p) => ({
        'Product Name': p.name,
        SKU: p.sku,
        Barcode: p.barcode || '',
        Category: p.categoryName || '',
        Brand: p.brand || '',
        'Current Stock': p.currentStock,
        Unit: p.unitSymbol || '',
        'Min Stock Level': p.minStockLevel,
        'Purchase Price (₹)': p.purchasePrice,
        'Selling Price (₹)': p.sellingPrice,
        'GST Rate (%)': p.gstRate,
        'Stock Status': p.stockStatus || '',
      }));
      exportToExcel(exportData, `SangamSales_Products_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Product catalog exported to Excel');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      toast.error(msg);
    }
  };

  // Normalize Excel Row with Synonyms
  const normalizeExcelRow = (row: Record<string, unknown>): ParsedProductRow => {
    const findVal = (keys: string[]): unknown => {
      const lowerKeys = keys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
      for (const prop of Object.keys(row)) {
        const cleanProp = prop.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerKeys.includes(cleanProp)) {
          return row[prop];
        }
      }
      return undefined;
    };

    const name = String(findVal(['Product Name', 'Name', 'Item Name', 'Product', 'Title', 'item_name']) || '').trim();
    const sku = String(findVal(['SKU', 'sku', 'Item Code', 'Product Code', 'Code']) || '').trim();
    const categoryName = String(findVal(['Category', 'category', 'Category Name', 'Department']) || '').trim();
    const brand = String(findVal(['Brand', 'brand', 'Company', 'Manufacturer', 'Make']) || '').trim();
    const sellingPrice = Number(findVal(['Selling Price (₹)', 'Selling Price', 'Price', 'Sale Price', 'Rate', 'MRP', 'selling_price'])) || 0;
    const purchasePrice = Number(findVal(['Purchase Price (₹)', 'Purchase Price', 'Cost Price', 'Cost', 'Buy Price', 'purchase_price'])) || 0;
    const gstRate = Number(findVal(['GST Rate (%)', 'GST Rate', 'GST %', 'GST', 'Tax Rate', 'gst_rate'])) || 18;
    const unitSymbol = String(findVal(['Unit', 'unit', 'Unit Symbol', 'UOM', 'Measure']) || 'pc').trim();
    const currentStock = Number(findVal(['Current Stock', 'Stock', 'Qty', 'Quantity', 'Opening Stock', 'current_stock'])) || 0;
    const minStockLevel = Number(findVal(['Min Stock Level', 'Min Stock', 'min_stock', 'Reorder Level', 'Low Stock Alert'])) || 5;
    const barcode = String(findVal(['Barcode', 'barcode', 'UPC', 'EAN']) || '').trim();
    const description = String(findVal(['Description', 'description', 'Notes']) || '').trim();

    return {
      name,
      sku: sku || undefined,
      categoryName: categoryName || undefined,
      brand: brand || undefined,
      sellingPrice,
      purchasePrice,
      gstRate,
      unitSymbol: unitSymbol || 'pc',
      currentStock,
      minStockLevel,
      barcode: barcode || undefined,
      description: description || undefined,
    };
  };

  // File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      const rawRows = await parseExcelFile(file);
      if (!rawRows || rawRows.length === 0) {
        setFileError('The selected Excel sheet does not contain any data rows.');
        return;
      }

      const normalized = rawRows
        .map(normalizeExcelRow)
        .filter((r) => r.name.length > 0);

      if (normalized.length === 0) {
        setFileError('No valid products found. Ensure your sheet includes a "Product Name" column.');
        return;
      }

      setImportFile(file);
      setParsedProducts(normalized);
      toast.success(`Found ${normalized.length} products in "${file.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse Excel file';
      setFileError(msg);
      toast.error(msg);
    }
  };

  // Execute Bulk Import
  const handleExecuteImport = () => {
    if (parsedProducts.length === 0) return;

    setIsImporting(true);
    try {
      const result = storeService.importProductsBulk(parsedProducts, updateExisting);

      let description = `Added ${result.addedCount} new products`;
      if (result.updatedCount > 0) {
        description += ` and updated ${result.updatedCount} existing products`;
      }
      if (result.skippedCount > 0) {
        description += ` (${result.skippedCount} skipped)`;
      }

      toast.success('Excel Bulk Import Successful!', {
        description,
        duration: 4000,
      });

      setIsImportModalOpen(false);
      setImportFile(null);
      setParsedProducts([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = () => {
    if (!deleteProductCandidate) return;
    try {
      storeService.deleteProduct(deleteProductCandidate.id);
      toast.success(`Product "${deleteProductCandidate.name}" deleted`);
      setDeleteProductCandidate(null);
      reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot delete product';
      toast.error(msg);
      setDeleteProductCandidate(null);
    }
  };

  const getStockBadge = (status?: StockStatus) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="success">In Stock</Badge>;
      case 'low_stock':
        return <Badge variant="warning">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge variant="danger">Out of Stock</Badge>;
      default:
        return <Badge variant="neutral">-</Badge>;
    }
  };

  return (
    <AppShell title="Product Catalog & Inventory">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Products & Hardware Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {products.length} products registered • {filteredProducts.length} filtered
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Import Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<FileUp className="w-4 h-4 text-blue-600" />}
            className="cursor-pointer"
          >
            Import Excel
          </Button>

          {/* Export Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}
            className="cursor-pointer"
          >
            Export Excel
          </Button>

          {/* Add Product Button */}
          <Link href="/products/new">
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} className="cursor-pointer">
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="sm:col-span-2">
          <Input
            placeholder="Search by product name, SKU, barcode, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Select
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value)}
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (Reorder)</option>
            <option value="out_of_stock">Out of Stock</option>
          </Select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product & SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Purchase Cost</TableHead>
              <TableHead className="text-center">Stock Level</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    title="No products found"
                    description="No hardware products matched your query. Try resetting your search filter or add a new product."
                    action={
                      <Link href="/products/new">
                        <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                          Add New Product
                        </Button>
                      </Link>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        SKU: {p.sku} {p.brand ? `• ${p.brand}` : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-700">
                      {p.categoryName || 'General'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900">
                    {formatCurrency(p.sellingPrice)}
                    <span className="block text-[10px] text-slate-400 font-normal">
                      +{p.gstRate}% GST
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-600">
                    {formatCurrency(p.purchasePrice)}
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    <span className={p.currentStock <= p.minStockLevel ? 'text-amber-600' : 'text-slate-900'}>
                      {formatQuantity(p.currentStock, p.unitSymbol)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{getStockBadge(p.stockStatus)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/products/${p.id}`}>
                        <Button variant="ghost" size="sm" title="View details">
                          <Eye className="w-4 h-4 text-slate-600" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteProductCandidate(p)}
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No products found"
            description="No hardware products matched your query."
            action={
              <Link href="/products/new">
                <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                  Add Product
                </Button>
              </Link>
            }
          />
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {p.sku} {p.brand ? `• ${p.brand}` : ''}
                  </p>
                </div>
                {getStockBadge(p.stockStatus)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Selling Price</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrency(p.sellingPrice)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">+{p.gstRate}% GST</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Available Stock</span>
                  <span className="font-bold text-slate-900">
                    {formatQuantity(p.currentStock, p.unitSymbol)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {p.categoryName}
                </span>
                <div className="flex items-center gap-2">
                  <Link href={`/products/${p.id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteProductCandidate(p)}
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* BULK EXCEL IMPORT MODAL                                     */}
      {/* ----------------------------------------------------------- */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!isImporting) {
            setIsImportModalOpen(false);
            setImportFile(null);
            setParsedProducts([]);
            setFileError(null);
          }
        }}
        title="Bulk Import Products from Excel"
        description="Upload an Excel (.xlsx, .xls, .csv) spreadsheet to automatically create and update hardware items."
        size="xl"
      >
        <div className="space-y-5 p-1 sm:p-2">
          {/* Step 1: Download Sample Template Card */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Need the Excel format template?
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Download our ready-to-use template with predefined column headers and example hardware products.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSampleProductTemplate}
              leftIcon={<Download className="w-4 h-4 text-blue-600" />}
              className="shrink-0 bg-white hover:bg-slate-50 font-bold text-xs"
            >
              Download Sample Template
            </Button>
          </div>

          {/* Step 2: File Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Select or Drop Excel Spreadsheet
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {!importFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-2 select-none group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mx-auto text-slate-500 group-hover:text-blue-600 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Click to select file, or drag and drop here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepts Microsoft Excel (.xlsx, .xls) and CSV (.csv) files up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {importFile.name}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{(importFile.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {parsedProducts.length} Products Detected
                      </span>
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportFile(null);
                    setParsedProducts([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="shrink-0 text-xs"
                >
                  Change File
                </Button>
              </div>
            )}

            {fileError && (
              <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {/* Options */}
          {parsedProducts.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between">
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Update product price and stock if SKU already exists</span>
              </label>
              <span className="text-[11px] text-slate-400">
                (New SKUs will be added automatically)
              </span>
            </div>
          )}

          {/* Step 3: Preview Table */}
          {parsedProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Data Preview (First 5 of {parsedProducts.length} items):</span>
                <span className="text-slate-400 font-normal">
                  All {parsedProducts.length} products will be processed
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Selling Price</th>
                      <th className="py-2 px-3 text-right">Cost Price</th>
                      <th className="py-2 px-3 text-center">Stock</th>
                      <th className="py-2 px-3 text-center">Unit</th>
                      <th className="py-2 px-3 text-center">GST%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedProducts.slice(0, 5).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 truncate max-w-[160px]">
                          {p.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {p.sku || <span className="italic text-slate-400">Auto</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{p.categoryName || 'General'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{p.sellingPrice}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          ₹{p.purchasePrice}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-blue-600">
                          {p.currentStock}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-500 uppercase">{p.unitSymbol}</td>
                        <td className="py-2 px-3 text-center font-mono">{p.gstRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
                setParsedProducts([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={parsedProducts.length === 0 || isImporting}
              isLoading={isImporting}
              onClick={handleExecuteImport}
              leftIcon={<FileUp className="w-4 h-4" />}
              className="font-bold px-5"
            >
              {parsedProducts.length > 0
                ? `Import ${parsedProducts.length} Products`
                : 'Select Excel File First'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteProductCandidate)}
        onClose={() => setDeleteProductCandidate(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to permanently delete "${deleteProductCandidate?.name}" (SKU: ${deleteProductCandidate?.sku})? This action cannot be undone.`}
        confirmText="Delete Product"
      />
    </AppShell>
  );
}
