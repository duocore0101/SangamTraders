'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { storeService } from '@/services/store';
import { DashboardStats } from '@/types';
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils';
import { 
  Package, 
  Boxes, 
  IndianRupee, 
  TrendingUp, 
  AlertTriangle, 
  Receipt, 
  ArrowUpRight, 
  ShoppingCart, 
  Truck, 
  Clock,
  ArrowRight,
  Trash2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CATEGORY_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month'>('7days');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetBothStores, setResetBothStores] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const activeStore = storeService.getActiveStore();

  useEffect(() => {
    setStats(storeService.getDashboardStats());
    const unsubscribe = storeService.subscribe(() => {
      setStats(storeService.getDashboardStats());
    });
    return unsubscribe;
  }, []);

  const handleConfirmReset = async () => {
    try {
      setIsDeleting(true);
      await storeService.resetAllStoreData(activeStore.id, resetBothStores);
      setStats(storeService.getDashboardStats());
      toast.success('All invoices, products, and reports have been permanently deleted and reset to zero.');
      setShowResetModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset data');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!stats) return null;

  return (
    <AppShell title="Business Dashboard">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Store Performance Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time sales, inventory valuations, stock alerts, and ledger tracking
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-3 sm:flex w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 sm:py-1 font-semibold rounded-lg transition-all text-center ${
                dateFilter === 'today' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 sm:py-1 font-semibold rounded-lg transition-all text-center ${
                dateFilter === '7days' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 sm:py-1 font-semibold rounded-lg transition-all text-center ${
                dateFilter === 'month' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          <Link href="/billing/new" className="hidden sm:inline-block">
            <Button size="sm" variant="primary" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
              Create Invoice
            </Button>
          </Link>

          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowResetModal(true)}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            className="border border-rose-300 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 transition-all shadow-2xs font-bold"
          >
            Reset All Data
          </Button>
        </div>
      </div>

      {/* 8 Top Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats.todaysSales)}
          subtitle={`${stats.todaysBillsCount} bills created today`}
          icon={<IndianRupee className="w-5 h-5" />}
          color="emerald"
        />

        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlySales)}
          subtitle="Current calendar month"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />

        <StatCard
          title="Inventory Value"
          value={formatCurrency(stats.totalInventoryValue)}
          subtitle={`${stats.totalStockItems} total stock units`}
          icon={<Boxes className="w-5 h-5" />}
          color="indigo"
        />

        <StatCard
          title="Low Stock Alert"
          value={stats.lowStockCount}
          subtitle="Products below minimum level"
          icon={<AlertTriangle className="w-5 h-5" />}
          color={stats.lowStockCount > 0 ? 'rose' : 'slate'}
        />

        <StatCard
          title="Active Catalog"
          value={stats.totalProducts}
          subtitle="Catalog hardware items"
          icon={<Package className="w-5 h-5" />}
          color="slate"
        />

        <StatCard
          title="Customer Receivables"
          value={formatCurrency(stats.totalCustomerOutstanding)}
          subtitle="Pending customer balances"
          icon={<Receipt className="w-5 h-5" />}
          color="amber"
        />

        <StatCard
          title="Supplier Payables"
          value={formatCurrency(stats.totalSupplierOutstanding)}
          subtitle="Outstanding vendor dues"
          icon={<Truck className="w-5 h-5" />}
          color="slate"
        />

        <StatCard
          title="Total Bills"
          value={stats.recentInvoices.length}
          subtitle="Recorded customer invoices"
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Daily Sales Trend Chart (Span 2) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Sales Trend</CardTitle>
              <p className="text-xs text-slate-500">Gross revenue trend over past 7 days</p>
            </div>
            <Badge variant="info">Live Feed</Badge>
          </CardHeader>
          <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4 px-2 sm:px-6">
            <div className="h-56 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.dailySalesTrend}
                  margin={{ top: 10, right: 12, left: -14, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={4}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      padding: '6px 10px',
                    }}
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Share Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Sales by Category</CardTitle>
            <p className="text-xs text-slate-500">Revenue split across product types</p>
          </CardHeader>
          <CardContent className="pt-2 px-3 sm:px-6">
            <div className="w-full flex flex-col items-center justify-center">
              {stats.categorySales.length === 0 ? (
                <div className="h-56 sm:h-72 flex items-center justify-center">
                  <p className="text-xs text-slate-400">No category sales recorded yet</p>
                </div>
              ) : (
                <>
                  <div className="h-48 sm:h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.categorySales}
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="amount"
                          nameKey="category"
                        >
                          {stats.categorySales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            color: '#FFF',
                            fontSize: '11px',
                            padding: '6px 10px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Clean responsive category badges below chart */}
                  <div className="mt-2 w-full flex flex-wrap items-center justify-center gap-1.5 max-h-24 overflow-y-auto">
                    {stats.categorySales.map((entry, index) => (
                      <span
                        key={entry.category}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                        />
                        <span className="truncate max-w-[80px] sm:max-w-none">{entry.category}</span>
                        <span className="text-slate-400 font-mono">
                          ₹{entry.amount >= 1000 ? `${(entry.amount / 1000).toFixed(1)}k` : entry.amount}
                        </span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Detailed Feed: Recent Invoices & Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Invoices Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Billing Invoices</CardTitle>
              <p className="text-xs text-slate-500">Latest completed counter & contractor sales</p>
            </div>
            <Link
              href="/billing/invoices"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/billing/invoices/${inv.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 font-mono">
                        {inv.invoiceNumber}
                      </span>
                      <Badge
                        size="sm"
                        variant={
                          inv.paymentStatus === 'paid'
                            ? 'success'
                            : inv.paymentStatus === 'partially_paid'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {inv.customerName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(inv.invoiceDate)} • {inv.paymentMethod.toUpperCase()}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </p>
                    {inv.balanceDue > 0 && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        Due: {formatCurrency(inv.balanceDue)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Low Stock Alerts</CardTitle>
              <p className="text-xs text-slate-500">Products requiring purchase reorder</p>
            </div>
            <Link
              href="/inventory"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                All catalog items have healthy stock levels
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.lowStockProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {prod.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono text-[11px] text-slate-400">{prod.sku}</span>
                        <span>•</span>
                        <span>{prod.categoryName}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          prod.currentStock <= 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {formatQuantity(prod.currentStock, prod.unitSymbol)}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Min: {prod.minStockLevel} {prod.unitSymbol}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Ledger Movements Activity Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent Stock Movement Activity</CardTitle>
            <p className="text-xs text-slate-500">Real-time inventory deduction and addition audit trail</p>
          </div>
          <Link
            href="/inventory/stock-movements"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            Full Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {stats.recentMovements.map((move) => (
              <div
                key={move.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      move.quantityChange > 0
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{move.productName}</p>
                    <p className="text-slate-500 text-[11px]">{move.reason}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold font-mono ${
                      move.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {move.quantityChange > 0 ? `+${move.quantityChange}` : move.quantityChange}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Stock: {move.previousStock} → {move.newStock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal for Reset All Software Data */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon & Heading */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3.5 shadow-inner">
                <AlertTriangle className="w-7 h-7 text-rose-600 animate-pulse" />
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Reset All Software Data?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
                This will permanently delete all records and reset every value, invoice, and report to zero.
              </p>
            </div>

            {/* Red Alert Callout */}
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-rose-700">
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>The following will be completely erased:</span>
              </div>
              <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-rose-800 font-medium pl-1">
                <li>• All Invoices &amp; Bills (₹0.00)</li>
                <li>• All Catalog Products</li>
                <li>• All Categories &amp; Units</li>
                <li>• All Stock Movements</li>
                <li>• All Customer Balances</li>
                <li>• All Supplier Payables</li>
                <li>• Sales Trend (Reset to 0)</li>
                <li>• All Reports &amp; Ledger Logs</li>
              </ul>
            </div>

            {/* Option to Reset Both Stores */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetBothStores}
                  onChange={(e) => setResetBothStores(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800">
                    Delete data for both store logins
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Wipes data for both <strong className="text-slate-700">Sangam Traders</strong> and <strong className="text-slate-700">Sangam Sales and Automobiles</strong> across PC and mobile.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeleting ? 'Deleting Everything...' : 'Delete All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

