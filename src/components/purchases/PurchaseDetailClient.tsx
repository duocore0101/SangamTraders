'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Table';
import { storeService } from '@/services/store';
import { Purchase, StoreAccount } from '@/types';
import { formatCurrency, formatDate, numberToWords } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, Printer, CheckCircle2, Download, PackageCheck } from 'lucide-react';
import Link from 'next/link';

export function PurchaseDetailClient({ id }: { id: string }) {
  const [purchase, setPurchase] = useState<Purchase | undefined>(undefined);
  const [activeStore, setActiveStore] = useState<StoreAccount | undefined>(undefined);

  const loadData = () => {
    setPurchase(storeService.getPurchaseById(id));
    setActiveStore(storeService.getActiveStore());
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!purchase) {
    return (
      <AppShell title="Purchase Order Details">
        <EmptyState
          title="Purchase invoice not found"
          description="The requested purchase order record could not be found."
          action={
            <Link href="/purchases">
              <Button size="sm" variant="primary">
                Return to Purchases
              </Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const handleReceive = () => {
    try {
      storeService.receivePurchase(purchase.id);
      toast.success(
        `Purchase ${purchase.purchaseNumber} marked as received! Quantities added to physical stock.`
      );
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error receiving purchase';
      toast.error(msg);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    toast.info("In the print dialog, select 'Save as PDF' under Destination to save.");
    window.print();
  };

  // Buyer details from active store
  const buyerName = activeStore?.name?.toUpperCase() || 'SANGAM SALES AND SANGAM AUTOMOBILES';
  const buyerAddress = 'BANKAR PHATA, OTUR, MAHARASHTRA';
  const buyerGstin = '27ANPPG4334F1Z0';
  const buyerState = 'Maharashtra, Code : 27';

  // Calculations for bill view
  const items = purchase.items || [];
  const subtotal = purchase.subtotal || 0;
  const taxAmount = purchase.taxAmount || 0;
  const cgst = purchase.cgstAmount !== undefined ? purchase.cgstAmount : +(taxAmount / 2).toFixed(2);
  const sgst = purchase.sgstAmount !== undefined ? purchase.sgstAmount : +(taxAmount / 2).toFixed(2);
  const totalAmount = purchase.totalAmount || 0;
  const roundOff = purchase.roundOff || 0;

  // Supplier Bank Details
  const bank = purchase.bankDetails || {
    bankName: 'BANK OF MAHARASHTRA',
    accountNo: '20118504756',
    ifscCode: 'MAHB0000332',
    branch: 'PANCHVATI',
  };

  return (
    <AppShell title={`Tax Invoice: ${purchase.supplierInvoiceNumber || purchase.purchaseNumber}`}>
      {/* Print CSS to render pure paper Tax Invoice on A4 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, aside, .print-hide, .no-print {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1.5px solid #000000 !important;
            box-shadow: none !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      {/* Screen Action Bar (Hidden during printing) */}
      <div className="print-hide flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/purchases"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Purchases
          </Link>

          <Badge variant={purchase.status === 'received' ? 'success' : 'warning'}>
            {purchase.status === 'received' ? 'STOCK RECEIVED' : 'DRAFT'}
          </Badge>
          <Badge
            variant={
              purchase.paymentStatus === 'paid'
                ? 'success'
                : purchase.paymentStatus === 'partially_paid'
                ? 'warning'
                : 'danger'
            }
          >
            {purchase.paymentStatus.toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {purchase.status === 'draft' && (
            <Button
              variant="success"
              size="sm"
              onClick={handleReceive}
              leftIcon={<PackageCheck className="w-4 h-4" />}
            >
              Mark Received & Add Stock
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            leftIcon={<Download className="w-4 h-4" />}
            className="bg-white border-slate-300 text-slate-700"
          >
            Download PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
            className="shadow-sm font-semibold"
          >
            Print Tax Invoice
          </Button>
        </div>
      </div>

      {/* TAX INVOICE CONTAINER MATCHING REFERENCE IMAGE 1:1 */}
      <div className="print-area max-w-4xl mx-auto bg-white border-[1.5px] border-black text-black font-sans text-[11px] leading-tight shadow-sm mb-12">
        {/* Top Header */}
        <div className="relative py-2 border-b-[1.5px] border-black text-center">
          <h1 className="text-base font-extrabold tracking-wide uppercase">
            TAX INVOICE
          </h1>
          <span className="absolute right-3 top-2.5 text-[10px] font-bold tracking-tight uppercase">
            (ORIGINAL FOR RECIPIENT)
          </span>
        </div>

        {/* Supplier & Consignment Split Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border-b-[1.5px] border-black divide-y sm:divide-y-0 sm:divide-x-[1.5px] divide-black">
          {/* Top Left: Supplier Information */}
          <div className="p-3 space-y-1">
            <h2 className="text-sm font-black uppercase tracking-tight text-black">
              {purchase.supplierName}
            </h2>
            <p className="text-[10px] leading-snug uppercase text-slate-800">
              {purchase.supplierAddress || '2, GANGOTRI APP, INDRAKUND, PANCHVATI, NASHIK 422003'}
            </p>
            {purchase.supplierMobile && (
              <p className="text-[10px] font-mono">
                TELE: 0253-2512270 | M: {purchase.supplierMobile}
              </p>
            )}
            <p className="text-[10px] font-mono font-bold mt-1">
              GSTIN/UIN : {purchase.supplierGstin || '27ABTPM0336P1Z0'}
            </p>
            <p className="text-[10px]">
              State Name : {purchase.supplierState || 'Maharashtra'}, Code :{' '}
              {purchase.supplierStateCode || '27'}
            </p>
          </div>

          {/* Top Right: Consignment Mini-Table */}
          <div className="text-[10px] divide-y divide-black">
            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-1.5">
                <span className="text-slate-600 block text-[9px]">Invoice No.</span>
                <span className="font-bold font-mono text-[11px]">
                  {purchase.supplierInvoiceNumber || purchase.purchaseNumber}
                </span>
              </div>
              <div className="p-1.5">
                <span className="text-slate-600 block text-[9px]">Dated</span>
                <span className="font-bold font-mono text-[11px]">
                  {formatDate(purchase.purchaseDate)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-1.5">
                <span className="text-slate-600 block text-[9px]">Supplier&apos;s Ref.</span>
                <span className="font-mono text-[10px]">{purchase.supplierRef || '-'}</span>
              </div>
              <div className="p-1.5">
                <span className="text-slate-600 block text-[9px]">Mode/Terms of Payment</span>
                <span className="font-semibold text-[10px]">
                  {purchase.paymentModeTerms || purchase.paymentMethod?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-black">
              <div className="p-1.5">
                <span className="text-slate-600 block text-[9px]">Buyer&apos;s Order No.</span>
                <span className="font-mono text-[10px]">
                  {purchase.buyersOrderNo || purchase.purchaseNumber}
                </span>
              </div>
              <div className="p-1.5">
                <span className="text-slate-600 block text-[9px]">Dated</span>
                <span className="font-mono text-[10px]">{formatDate(purchase.purchaseDate)}</span>
              </div>
            </div>

            <div className="p-1.5">
              <span className="text-slate-600 block text-[9px]">Other Reference(s)</span>
              <span className="font-semibold text-[10px]">
                {purchase.otherReferences || '2 Roll 1box 2bag'}
              </span>
            </div>

            <div className="p-1.5">
              <span className="text-slate-600 block text-[9px]">Terms of Delivery</span>
              <span className="font-semibold text-[10px]">
                {purchase.termsOfDelivery || 'Vighnar Trans'}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Box: Buyer (Billed To) */}
        <div className="p-3 border-b-[1.5px] border-black space-y-0.5">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
            Buyer
          </span>
          <h3 className="text-xs font-black uppercase text-black tracking-wide">
            {buyerName}
          </h3>
          <p className="text-[10px] uppercase">{buyerAddress}</p>
          <div className="flex flex-wrap items-center gap-4 text-[10px] pt-0.5">
            <span className="font-mono font-bold">GSTIN/UIN : {buyerGstin}</span>
            <span>State Name : {buyerState}</span>
          </div>
        </div>

        {/* Items Table with Classic Solid Borders */}
        <div className="border-b-[1.5px] border-black overflow-x-auto">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b-[1.5px] border-black font-bold uppercase text-[9px] bg-slate-50 print:bg-transparent">
                <th className="py-1.5 px-2 w-8 text-center border-r border-black">Sl.</th>
                <th className="py-1.5 px-2 border-r border-black min-w-[200px]">
                  Description of Goods
                </th>
                <th className="py-1.5 px-2 w-20 text-center border-r border-black">
                  HSN/SAC
                </th>
                <th className="py-1.5 px-1.5 w-16 text-center border-r border-black">
                  Part No.
                </th>
                <th className="py-1.5 px-2 w-20 text-right border-r border-black">
                  Quantity
                </th>
                <th className="py-1.5 px-2 w-16 text-right border-r border-black">
                  Rate
                </th>
                <th className="py-1.5 px-1.5 w-12 text-center border-r border-black">
                  per
                </th>
                <th className="py-1.5 px-1.5 w-14 text-center border-r border-black">
                  Disc. %
                </th>
                <th className="py-1.5 px-2 w-24 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineAmount = item.totalAmount
                  ? item.totalAmount - (item.taxAmount || 0)
                  : item.quantity * item.purchaseRate;

                return (
                  <tr key={idx} className="border-b border-slate-200 print:border-slate-300">
                    <td className="py-1.5 px-2 text-center border-r border-black font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black font-semibold uppercase text-black">
                      {item.productName}
                    </td>
                    <td className="py-1.5 px-2 text-center border-r border-black font-mono">
                      {item.hsnCode || '-'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center border-r border-black font-mono text-[9px]">
                      {item.partNo || ''}
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-black font-mono font-bold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-black font-mono">
                      {Number(item.purchaseRate).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1.5 text-center border-r border-black text-[9px]">
                      {item.unit}
                    </td>
                    <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">
                      {item.discountPercent ? `${item.discountPercent} %` : ''}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-black">
                      {Number(lineAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Row */}
              <tr className="border-t-[1.5px] border-black">
                <td colSpan={8} className="py-1.5 px-3 text-right font-bold uppercase border-r border-black">
                  Subtotal (Taxable Value)
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-bold">
                  {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* CGST Row */}
              {cgst > 0 && (
                <tr className="border-t border-black">
                  <td colSpan={7} className="py-1 px-3 text-right font-bold uppercase border-r border-black">
                    C GST @ 9 %
                  </td>
                  <td className="py-1 px-1.5 text-center font-mono border-r border-black">
                    9 %
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* SGST Row */}
              {sgst > 0 && (
                <tr className="border-t border-black">
                  <td colSpan={7} className="py-1 px-3 text-right font-bold uppercase border-r border-black">
                    S GST @ 9 %
                  </td>
                  <td className="py-1 px-1.5 text-center font-mono border-r border-black">
                    9 %
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* Round Off Row */}
              {roundOff !== 0 && (
                <tr className="border-t border-black">
                  <td colSpan={8} className="py-1 px-3 text-right font-bold uppercase border-r border-black">
                    ROUND OFF
                  </td>
                  <td className="py-1 px-2 text-right font-mono">
                    {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                  </td>
                </tr>
              )}

              {/* Total Grand Bar with E. & O.E */}
              <tr className="border-t-[1.5px] border-b-[1.5px] border-black bg-slate-50/50 print:bg-transparent font-bold">
                <td colSpan={8} className="py-2 px-3 text-right text-xs uppercase tracking-wide border-r border-black">
                  Total
                </td>
                <td className="py-2 px-2 text-right">
                  <div className="font-mono text-sm font-black text-black">
                    ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[8px] font-mono font-normal text-slate-500">
                    E. &amp; O.E
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount Chargeable in Words */}
        <div className="p-2.5 border-b-[1.5px] border-black">
          <span className="text-[9px] text-slate-500 uppercase block font-semibold">
            Amount Chargeable (in words)
          </span>
          <span className="text-[11px] font-bold uppercase text-black font-sans">
            {numberToWords(totalAmount)}
          </span>
        </div>

        {/* Bottom Section: Declaration & Bank Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-[1.5px] divide-black">
          {/* Bottom Left: Declaration & Jurisdiction */}
          <div className="p-3 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[9px] font-bold uppercase block mb-1">
                Declaration
              </span>
              <p className="text-[9px] leading-relaxed text-slate-700">
                We declare that this invoice shows the actual price of the goods described
                and that all particulars are true and correct.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-300 text-[9px] text-center font-bold tracking-wider uppercase text-slate-800">
              <p>SUBJECT TO NASIK JURISDICTION</p>
              <p className="text-[8px] font-normal text-slate-500 lowercase mt-0.5">
                This is a Computer Generated Invoice
              </p>
            </div>
          </div>

          {/* Bottom Right: Bank Details & Authorised Signatory */}
          <div className="p-3 flex flex-col justify-between space-y-4">
            <div className="text-[10px] space-y-0.5">
              <span className="text-[9px] font-bold uppercase block text-slate-800 mb-1">
                Company&apos;s Bank Details
              </span>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Bank Name</span>
                <span className="col-span-2 font-bold font-mono uppercase">
                  : {bank.bankName || 'BANK OF MAHARASHTRA'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">A/c No.</span>
                <span className="col-span-2 font-bold font-mono">
                  : {bank.accountNo || '20118504756'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Branch &amp; IFS Code</span>
                <span className="col-span-2 font-mono font-semibold">
                  : {bank.branch || 'PANCHVATI'} &amp; {bank.ifscCode || 'MAHB0000332'}
                </span>
              </div>
            </div>

            {/* Authorised Signatory */}
            <div className="text-right pt-2 space-y-6">
              <span className="text-[10px] font-bold block uppercase text-slate-900">
                for {purchase.supplierName}
              </span>

              <div className="inline-block text-center pr-2">
                <div className="h-9 w-24 border-b border-dashed border-slate-400 mx-auto flex items-end justify-center">
                  <span className="text-[8px] text-slate-400 italic">Signature</span>
                </div>
                <span className="text-[10px] font-bold block uppercase mt-1">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
