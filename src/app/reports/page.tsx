'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Invoice, Product, Purchase, Customer, Supplier, Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { 
  BarChart3, 
  FileDown, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Truck, 
  CreditCard,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type ReportType =
  | 'daily_sales'
  | 'monthly_sales'
  | 'product_sales'
  | 'category_sales'
  | 'purchases'
  | 'inventory_valuation'
  | 'low_stock'
  | 'profit_estimation'
  | 'customer_outstanding'
  | 'supplier_outstanding'
  | 'payments';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('daily_sales');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    setInvoices(storeService.getInvoices());
    setProducts(storeService.getProducts());
    setPurchases(storeService.getPurchases());
    setCustomers(storeService.getCustomers());
    setSuppliers(storeService.getSuppliers());
    setPayments(storeService.getPayments());
  }, []);

  // Filter finalized invoices by date range
  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const d = i.invoiceDate.slice(0, 10);
      return i.status === 'finalized' && d >= startDate && d <= endDate;
    });
  }, [invoices, startDate, endDate]);

  // Total metrics
  const totalRevenue = filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalPaid = filteredInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const totalDue = filteredInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

  // Profit Estimation Data
  const profitReportData = useMemo(() => {
    const prodCostMap = new Map<string, number>();
    products.forEach((p) => prodCostMap.set(p.id, p.purchasePrice));

    let grossSales = 0;
    let totalCogs = 0;

    const itemized = filteredInvoices.flatMap((inv) =>
      (inv.items || []).map((item) => {
        const costPrice = prodCostMap.get(item.productId) || 0;
        const totalCost = costPrice * item.quantity;
        const profit = item.taxableAmount - totalCost;
        grossSales += item.taxableAmount;
        totalCogs += totalCost;

        return {
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          taxableSales: item.taxableAmount,
          totalCost,
          estimatedGrossProfit: +profit.toFixed(2),
          marginPercent: item.taxableAmount > 0 ? +((profit / item.taxableAmount) * 100).toFixed(1) : 0,
        };
      })
    );

    return {
      items: itemized,
      grossSales: +grossSales.toFixed(2),
      totalCogs: +totalCogs.toFixed(2),
      estimatedGrossProfit: +(grossSales - totalCogs).toFixed(2),
      grossMargin: grossSales > 0 ? +(((grossSales - totalCogs) / grossSales) * 100).toFixed(1) : 0,
    };
  }, [filteredInvoices, products]);

  // Product-wise sales summary
  const productSalesSummary = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        const cur = map.get(item.productId) || {
          name: item.productName,
          sku: item.sku,
          qty: 0,
          revenue: 0,
        };
        cur.qty += item.quantity;
        cur.revenue += item.totalPrice;
        map.set(item.productId, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices]);

  // Category-wise sales
  const categorySalesSummary = useMemo(() => {
    const map = new Map<string, { category: string; revenue: number; itemsSold: number }>();
    const prodCatMap = new Map<string, string>();
    products.forEach((p) => prodCatMap.set(p.id, p.categoryName || 'General'));

    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        const cat = prodCatMap.get(item.productId) || 'General';
        const cur = map.get(cat) || { category: cat, revenue: 0, itemsSold: 0 };
        cur.revenue += item.totalPrice;
        cur.itemsSold += item.quantity;
        map.set(cat, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices, products]);

  // Daily Chart Data
  const dailyChartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredInvoices.forEach((inv) => {
      const d = inv.invoiceDate.slice(0, 10);
      map.set(d, (map.get(d) || 0) + inv.grandTotal);
    });
    return Array.from(map.entries())
      .map(([date, amount]) => ({
        date: formatDate(date),
        amount,
      }))
      .slice(-15);
  }, [filteredInvoices]);

  // Export current active report to Excel
  const handleExportActiveReport = () => {
    try {
      let exportData: Record<string, unknown>[] = [];
      let filename = `Report_${activeReport}_${new Date().toISOString().slice(0, 10)}`;

      if (activeReport === 'daily_sales' || activeReport === 'monthly_sales') {
        exportData = filteredInvoices.map((i) => ({
          'Invoice #': i.invoiceNumber,
          Date: formatDate(i.invoiceDate),
          Customer: i.customerName,
          Mobile: i.customerMobile,
          'Grand Total': i.grandTotal,
          Paid: i.amountPaid,
          Due: i.balanceDue,
          Status: i.paymentStatus,
        }));
      } else if (activeReport === 'profit_estimation') {
        exportData = profitReportData.items.map((item) => ({
          Product: item.productName,
          SKU: item.sku,
          'Sold Qty': item.quantity,
          'Selling Value (₹)': item.taxableSales,
          'Cost of Goods (₹)': item.totalCost,
          'Estimated Gross Profit (₹)': item.estimatedGrossProfit,
          'Margin (%)': `${item.marginPercent}%`,
        }));
      } else if (activeReport === 'product_sales') {
        exportData = productSalesSummary.map((p) => ({
          Product: p.name,
          SKU: p.sku,
          'Quantity Sold': p.qty,
          'Gross Revenue (₹)': p.revenue,
        }));
      } else if (activeReport === 'customer_outstanding') {
        exportData = customers
          .filter((c) => c.outstandingBalance > 0)
          .map((c) => ({
            Customer: c.name,
            Mobile: c.mobile,
            'Total Purchases (₹)': c.totalPurchases,
            'Outstanding Due (₹)': c.outstandingBalance,
          }));
      } else if (activeReport === 'low_stock') {
        exportData = products
          .filter((p) => p.currentStock <= p.minStockLevel)
          .map((p) => ({
            Product: p.name,
            SKU: p.sku,
            Category: p.categoryName,
            'Current Stock': p.currentStock,
            'Min Threshold': p.minStockLevel,
            Unit: p.unitSymbol,
          }));
      } else {
        exportData = filteredInvoices.map((i) => ({ ...i }));
      }

      exportToExcel(exportData, filename);
      toast.success('Report exported to Excel successfully!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      toast.error(msg);
    }
  };

  return (
    <AppShell title="Business Reports & Accounting Analytics">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Financial & Inventory Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade business intelligence, profit margins, receivables, and tax summaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportActiveReport} leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}>
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Date Filter & Report Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <Select
            label="Select Report Type"
            value={activeReport}
            onChange={(e) => setActiveReport(e.target.value as ReportType)}
          >
            <option value="daily_sales">1. Sales Transactions Report</option>
            <option value="product_sales">2. Product-wise Sales Report</option>
            <option value="category_sales">3. Category-wise Sales Report</option>
            <option value="profit_estimation">4. Gross Profit Estimation Report</option>
            <option value="customer_outstanding">5. Customer Receivables (Outstanding) Report</option>
            <option value="supplier_outstanding">6. Supplier Payables (Vendor Due) Report</option>
            <option value="low_stock">7. Low Stock & Reorder Report</option>
            <option value="inventory_valuation">8. Total Inventory Valuation</option>
            <option value="payments">9. Payment Receipts & Inflow Ledger</option>
          </Select>
        </div>

        <div>
          <Input
            label="From Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="To Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase">Period Sales Revenue</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalRevenue)}</p>
          <span className="text-[11px] text-slate-500">{filteredInvoices.length} invoices generated</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase">Collections Paid</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
          <span className="text-[11px] text-slate-500">Realized cash/UPI</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase">Uncollected Credit Due</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{formatCurrency(totalDue)}</p>
          <span className="text-[11px] text-slate-500">Period receivables</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase">Est. Period Gross Profit</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {formatCurrency(profitReportData.estimatedGrossProfit)}
          </p>
          <span className="text-[11px] text-blue-700 font-semibold">
            {profitReportData.grossMargin}% Gross Margin
          </span>
        </div>
      </div>

      {/* Graph Visualizer if sales or profit */}
      {(activeReport === 'daily_sales' || activeReport === 'monthly_sales') && dailyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Volume Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2 px-2 sm:px-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#FFF', fontSize: '11px' }}
                />
                <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Report Table Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="capitalize">
              {activeReport.replace(/_/g, ' ')}
            </CardTitle>
            <p className="text-xs text-slate-500">
              Showing records from {formatDate(startDate)} to {formatDate(endDate)}
            </p>
          </div>
          <Badge variant="info">Verified Records</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {activeReport === 'profit_estimation' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name & SKU</TableHead>
                  <TableHead className="text-center">Units Sold</TableHead>
                  <TableHead className="text-right">Taxable Sales (₹)</TableHead>
                  <TableHead className="text-right">Cost of Goods (₹)</TableHead>
                  <TableHead className="text-right">Est. Gross Profit (₹)</TableHead>
                  <TableHead className="text-center">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitReportData.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <p className="font-bold text-slate-900 text-xs">{item.productName}</p>
                      <p className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</p>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs font-mono">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {formatCurrency(item.taxableSales)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-slate-600">
                      {formatCurrency(item.totalCost)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs font-mono text-emerald-600">
                      +{formatCurrency(item.estimatedGrossProfit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        {item.marginPercent}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeReport === 'product_sales' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name & SKU</TableHead>
                  <TableHead className="text-center">Units Sold</TableHead>
                  <TableHead className="text-right">Gross Revenue (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSalesSummary.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</p>
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs font-mono">
                      {item.qty}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs font-mono text-slate-900">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeReport === 'category_sales' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Total Items Sold</TableHead>
                  <TableHead className="text-right">Total Revenue (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorySalesSummary.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {item.category}
                    </TableCell>
                    <TableCell className="text-center font-bold text-xs font-mono">
                      {item.itemsSold}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs font-mono text-slate-900">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : activeReport === 'customer_outstanding' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Total Lifetime Purchases</TableHead>
                  <TableHead className="text-right">Outstanding Due (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers
                  .filter((c) => c.outstandingBalance > 0)
                  .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-slate-900 text-xs">{c.name}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">{c.mobile}</TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {formatCurrency(c.totalPurchases)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs font-mono text-rose-600">
                        {formatCurrency(c.outstandingBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : activeReport === 'supplier_outstanding' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact / Mobile</TableHead>
                  <TableHead className="text-right">Total Inward Orders</TableHead>
                  <TableHead className="text-right">Payable Balance (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers
                  .filter((s) => (s.outstandingBalance || 0) > 0)
                  .map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold text-slate-900 text-xs">{s.name}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">{s.mobile}</TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {formatCurrency(s.totalPurchased || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs font-mono text-rose-600">
                        {formatCurrency(s.outstandingBalance || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : activeReport === 'low_stock' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name & SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="text-center">Min Threshold</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products
                  .filter((p) => p.currentStock <= p.minStockLevel)
                  .map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">SKU: {p.sku}</p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{p.categoryName}</TableCell>
                      <TableCell className="text-center font-bold text-xs font-mono text-rose-600">
                        {p.currentStock} {p.unitSymbol}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-slate-500">
                        {p.minStockLevel} {p.unitSymbol}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {formatCurrency(p.purchasePrice)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-center">Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-bold text-blue-600">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(inv.invoiceDate)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-900">
                      {inv.customerName}
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-xs text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-emerald-600">
                      {formatCurrency(inv.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-rose-600 font-bold">
                      {formatCurrency(inv.balanceDue)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        size="sm"
                        variant={inv.paymentStatus === 'paid' ? 'success' : inv.paymentStatus === 'partially_paid' ? 'warning' : 'danger'}
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

