'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Category } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Tags, Layers } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadData = () => {
    setCategories(storeService.getCategories());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setName('');
    setDescription('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      storeService.addCategory(name.trim(), description.trim() || undefined);
      toast.success(`Category "${name}" created`);
      setIsAddOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add category';
      toast.error(msg);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      storeService.updateCategory(editingCategory.id, name.trim(), description.trim() || undefined);
      toast.success(`Category "${name}" updated`);
      setEditingCategory(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update category';
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteCandidate) return;
    try {
      storeService.deleteCategory(deleteCandidate.id);
      toast.success(`Category "${deleteCandidate.name}" deleted`);
      setDeleteCandidate(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot delete category';
      toast.error(msg);
      setDeleteCandidate(null);
    }
  };

  return (
    <AppShell title="Category Management">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Product Categories
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize hardware stock into department categories and groups
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
          Add Category
        </Button>
      </div>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Associated Products</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState
                      title="No categories found"
                      description="Create your first hardware category to organize your inventory."
                      action={
                        <Button size="sm" variant="primary" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
                          Add Category
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Tags className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-sm">
                      {c.description || '—'}
                    </TableCell>
                    <TableCell className="text-center font-bold font-mono">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full text-xs">
                        {c.productCount || 0} items
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Category"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteCandidate(c)}
                          title="Delete Category"
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
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Category"
        description="Add a new hardware department category"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sanitary & Bath Fittings"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Faucets, showers, cisterns, brass angle valves..."
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        title="Edit Category"
        description="Modify category information"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Update Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deleteCandidate?.name}"? If there are any products attached, the operation will be rejected.`}
        confirmText="Delete Category"
      />
    </AppShell>
  );
}

