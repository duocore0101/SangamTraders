'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { storeService } from '@/services/store';
import { Category, Unit, Supplier } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '@/lib/validations';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Save, Barcode, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';

type ProductFormData = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCategories(storeService.getCategories());
    setUnits(storeService.getUnits());
    setSuppliers(storeService.getSuppliers());
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      subcategory: '',
      brand: '',
      description: '',
      purchasePrice: 0,
      sellingPrice: 0,
      gstRate: 18,
      unitId: 'unit-pc',
      currentStock: 0,
      minStockLevel: 5,
      supplierId: '',
    },
  });

  const selectedUnitId = watch('unitId');
  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  // Auto-generate a unique SKU suggestion
  const generateSkuSuggestion = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const suggested = `SKU-${new Date().getFullYear()}-${randomSuffix}`;
    setValue('sku', suggested, { shouldValidate: true });
    toast.info(`Generated SKU suggestion: ${suggested}`);
  };

  const generateBarcodeSuggestion = () => {
    const code = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    setValue('barcode', code, { shouldValidate: true });
    toast.info(`Generated Barcode: ${code}`);
  };

  const onSubmit = (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const newProd = storeService.addProduct({
        name: data.name,
        sku: data.sku,
        barcode: data.barcode || undefined,
        categoryId: data.categoryId,
        subcategory: data.subcategory || undefined,
        brand: data.brand || undefined,
        description: data.description || undefined,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        gstRate: data.gstRate,
        unitId: data.unitId,
        currentStock: data.currentStock,
        minStockLevel: data.minStockLevel,
        supplierId: data.supplierId || undefined,
      });

      toast.success(`Product "${newProd.name}" created successfully!`);
      router.push(`/products/${newProd.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating product';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Add New Hardware Product">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products Catalog
          </Link>
          <span className="text-xs text-slate-400">Step 1 of 1: Product Specifications</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Basic Product Information */}
          <Card>
            <CardHeader>
              <CardTitle>1. General Identification</CardTitle>
              <p className="text-xs text-slate-500">
                Core product title, SKU code, category and brand tags
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Product Name"
                    required
                    placeholder="e.g. Tata Tiscon 500D TMT Rebar 12mm"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      SKU / Product Code <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateSkuSuggestion}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <Input
                    placeholder="e.g. TMT-12MM-01"
                    error={errors.sku?.message}
                    {...register('sku')}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Barcode / EAN (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={generateBarcodeSuggestion}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <Barcode className="w-3 h-3" /> Generate
                    </button>
                  </div>
                  <Input
                    placeholder="e.g. 890123456001"
                    leftIcon={<Barcode className="w-4 h-4" />}
                    error={errors.barcode?.message}
                    {...register('barcode')}
                  />
                </div>

                <div>
                  <Select
                    label="Category"
                    required
                    error={errors.categoryId?.message}
                    {...register('categoryId')}
                  >
                    <option value="">Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Input
                    label="Subcategory / Group"
                    placeholder="e.g. TMT Rebars, Valves, Drills"
                    error={errors.subcategory?.message}
                    {...register('subcategory')}
                  />
                </div>

                <div>
                  <Input
                    label="Brand / Manufacturer"
                    placeholder="e.g. Tata Steel, Bosch, Finolex, Asian Paints"
                    error={errors.brand?.message}
                    {...register('brand')}
                  />
                </div>

                <div>
                  <Select
                    label="Primary Supplier (Optional)"
                    error={errors.supplierId?.message}
                    {...register('supplierId')}
                  >
                    <option value="">Select default supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
                    Product Description / Specifications
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add dimensions, material grade, manufacturer warranty details..."
                    {...register('description')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Pricing & Tax Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>2. Pricing & GST Taxation</CardTitle>
              <p className="text-xs text-slate-500">
                Purchase cost, sales counter price and applicable Indian GST tax slab
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Input
                    label="Purchase Cost Price (₹)"
                    type="number"
                    step="0.01"
                    prefixText="₹"
                    required
                    placeholder="0.00"
                    error={errors.purchasePrice?.message}
                    {...register('purchasePrice', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Input
                    label="Selling Counter Price (₹)"
                    type="number"
                    step="0.01"
                    prefixText="₹"
                    required
                    placeholder="0.00"
                    error={errors.sellingPrice?.message}
                    {...register('sellingPrice', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Select
                    label="GST Tax Rate (%)"
                    required
                    error={errors.gstRate?.message}
                    {...register('gstRate', { valueAsNumber: true })}
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={5}>5% GST (Basic)</option>
                    <option value={12}>12% GST (Tools / Pipes)</option>
                    <option value={18}>18% GST (Standard Hardware)</option>
                    <option value={28}>28% GST (Paints / Cement)</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Inventory Units & Initial Stock */}
          <Card>
            <CardHeader>
              <CardTitle>3. Inventory Units & Stock Tracking</CardTitle>
              <p className="text-xs text-slate-500">
                Specify counting unit and initial opening warehouse quantity
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Select
                    label="Measurement Unit"
                    required
                    error={errors.unitId?.message}
                    {...register('unitId')}
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol}) {u.isFractional ? '— Fractional' : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {selectedUnit?.isFractional
                      ? 'Supports decimal measurements (e.g. 1.5 kg, 2.5 m)'
                      : 'Discrete whole item count'}
                  </p>
                </div>

                <div>
                  <Input
                    label="Opening Current Stock"
                    type="number"
                    step={selectedUnit?.isFractional ? '0.001' : '1'}
                    required
                    placeholder="0"
                    suffixText={selectedUnit?.symbol || 'pc'}
                    error={errors.currentStock?.message}
                    {...register('currentStock', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Input
                    label="Minimum Stock Alert Level"
                    type="number"
                    step={selectedUnit?.isFractional ? '0.001' : '1'}
                    required
                    placeholder="5"
                    suffixText={selectedUnit?.symbol || 'pc'}
                    error={errors.minStockLevel?.message}
                    {...register('minStockLevel', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Product to Catalog
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
