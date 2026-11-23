import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, BusinessSettings } from '@/types';
import { formatDate } from '@/lib/utils';
import { getStoreLogoBase64 } from './logoData';

// Helper to format currency for PDF without unrenderable Unicode symbols
function formatPdfCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return 'Rs. 0.00';
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

export function generateInvoicePdf(invoice: Invoice, settings: BusinessSettings, autoPrint: boolean = false) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // Header Banner / Brand Colors
  doc.setFillColor(15, 23, 42); // Deep navy (#0F172A)
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Store Logo Badge (Specific to the active ID / Store)
  try {
    const logoBase64 = getStoreLogoBase64(settings.logoUrl, settings.shopName);
    if (logoBase64) {
      // White rounded background card for high-contrast logo display
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 4, 23, 23, 2.5, 2.5, 'F');
      // Draw store logo
      doc.addImage(logoBase64, 'PNG', 13, 5, 21, 21);
    }
  } catch (err) {
    console.error('Failed to embed logo in PDF:', err);
  }

  // Business Name (Sized safely to never collide with the right heading)
  const shopName = settings.shopName || 'SANGAM SALES AND SANGAM AUTOMOBILES';
  let shopFontSize = 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(shopFontSize);
  while (doc.getTextWidth(shopName) > 82 && shopFontSize > 8) {
    shopFontSize -= 0.5;
    doc.setFontSize(shopFontSize);
  }
  doc.setTextColor(255, 255, 255);
  doc.text(shopName, 38, 14);

  // Subtitle / Tagline (Without "Powered by Duocore Software")
  const tagline = settings.tagline || 'Hardware Store Management System';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(tagline, 38, 20);

  // TAX INVOICE / RETAIL INVOICE heading
  const isGstInvoice = invoice.isGstBill !== false && invoice.taxTotal > 0;
  const storeGstin = '27ANPPG4334F1Z0';
  const ownerName = 'MR. Rajendra Gaikwad';
  const storeAddress = 'BankarPhata, Otur, Maharashtra';
  const storeState = 'Maharashtra';
  const storePhone = '9766551783';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(isGstInvoice ? 'TAX INVOICE' : 'RETAIL INVOICE / CASH MEMO', pageWidth - 14, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  if (isGstInvoice) {
    doc.text(`GST NO: ${storeGstin}`, pageWidth - 14, 17.5, { align: 'right' });
    doc.text(`ORIGINAL FOR RECIPIENT`, pageWidth - 14, 22, { align: 'right' });
    doc.text(invoice.status === 'cancelled' ? 'STATUS: CANCELLED' : 'STATUS: FINALIZED', pageWidth - 14, 26.5, { align: 'right' });
  } else {
    doc.text(`ORIGINAL FOR RECIPIENT`, pageWidth - 14, 19, { align: 'right' });
    doc.text(invoice.status === 'cancelled' ? 'STATUS: CANCELLED' : 'STATUS: FINALIZED', pageWidth - 14, 24, { align: 'right' });
  }

  currentY = 38;

  // Two columns: Shop details (left), Invoice details (right)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Billed From:', 14, currentY);
  doc.text('Invoice Details:', pageWidth - 80, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  // Left Details (Shop, Owner, Address, Phone, GST NO.)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${settings.shopName}`, 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Owner: ${ownerName}`, 14, currentY + 4);
  doc.text(`${storeAddress}`, 14, currentY + 8);
  doc.text(`Phone: ${storePhone} | State: ${storeState}`, 14, currentY + 12);

  // Prominently print GST NO on invoice
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Deep professional blue
  doc.text(`GST NO: ${storeGstin}`, 14, currentY + 16);

  // Right Details
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, pageWidth - 80, currentY);
  doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, pageWidth - 80, currentY + 4);
  doc.text(`Payment Method: ${invoice.paymentMethod.toUpperCase()}`, pageWidth - 80, currentY + 8);
  doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, pageWidth - 80, currentY + 12);
  const supplyState = (invoice.customerState && invoice.customerState.toLowerCase() !== 'delhi')
    ? invoice.customerState
    : '27-Maharashtra';
  doc.text(`Place of Supply: ${supplyState}`, pageWidth - 80, currentY + 16);

  currentY += 24;

  // Customer Section Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Bill To (Customer):', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Name: ${invoice.customerName}`, 18, currentY + 11);
  doc.text(`Mobile: ${invoice.customerMobile}`, 18, currentY + 16);

  if (invoice.customerAddress) {
    doc.text(`Address: ${invoice.customerAddress}`, pageWidth / 2, currentY + 11);
  }
  if (invoice.customerGstin) {
    doc.text(`Customer GSTIN: ${invoice.customerGstin}`, pageWidth / 2, currentY + 16);
  }

  currentY += 28;

  // Invoice Items Table - Uses formatPdfCurrency (Rs.) for crystal-clear readability
  const tableData = (invoice.items || []).map((item, idx) => {
    const taxAmt = item.cgstAmount > 0 ? (item.cgstAmount + item.sgstAmount) : item.igstAmount;
    return [
      idx + 1,
      `${item.productName}\nSKU: ${item.sku}`,
      `${item.quantity} ${item.unit}`,
      formatPdfCurrency(item.unitPrice),
      item.discountPercent > 0 ? `${item.discountPercent}%` : '-',
      formatPdfCurrency(item.taxableAmount),
      isGstInvoice ? `${item.gstRate}%` : '0%',
      formatPdfCurrency(taxAmt),
      formatPdfCurrency(item.totalPrice),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item & Description', 'Qty', 'Rate', 'Disc', 'Taxable', 'GST%', 'Tax Amt', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Primary blue (#2563EB)
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { cellWidth: 54 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'right', cellWidth: 21 },
      6: { halign: 'center', cellWidth: 13 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 21 },
    },
    styles: {
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
  });

  // Calculate Table End Y
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTable = (doc as any).lastAutoTable;
  let finalY = lastTable ? lastTable.finalY + 8 : currentY + 40;

  // Check if we need a new page for totals & terms
  if (finalY > 215) {
    doc.addPage();
    finalY = 20;
  }

  // ----------------------------------------------------
  // TOTALS BOX (Pixel-perfect width, padding, and alignment)
  // ----------------------------------------------------
  const boxWidth = 84; // 84mm width
  const boxRight = pageWidth - 14; // 196mm
  const boxLeft = boxRight - boxWidth; // 112mm

  interface SummaryRow {
    label: string;
    value: string;
    isBold?: boolean;
    fontSize?: number;
    textColor?: [number, number, number];
    isDivider?: boolean;
  }

  const summaryRows: SummaryRow[] = [];
  summaryRows.push({ label: 'Subtotal:', value: formatPdfCurrency(invoice.subtotal) });

  if (invoice.totalDiscount > 0) {
    summaryRows.push({
      label: 'Discount:',
      value: `-${formatPdfCurrency(invoice.totalDiscount)}`,
      textColor: [22, 163, 74],
    });
  }

  summaryRows.push({ label: 'Taxable Amount:', value: formatPdfCurrency(invoice.taxableAmount) });

  if (isGstInvoice) {
    if (invoice.cgstTotal > 0) {
      summaryRows.push({ label: 'CGST:', value: formatPdfCurrency(invoice.cgstTotal) });
      summaryRows.push({ label: 'SGST:', value: formatPdfCurrency(invoice.sgstTotal) });
    } else if (invoice.igstTotal > 0) {
      summaryRows.push({ label: 'IGST:', value: formatPdfCurrency(invoice.igstTotal) });
    }
  } else {
    summaryRows.push({
      label: 'GST (Non-Tax):',
      value: 'Rs. 0.00',
      textColor: [22, 163, 74],
    });
  }

  if (invoice.roundingAdjustment && invoice.roundingAdjustment !== 0) {
    const sign = invoice.roundingAdjustment > 0 ? '+' : '';
    summaryRows.push({
      label: 'Round Off:',
      value: `${sign}Rs. ${Math.abs(invoice.roundingAdjustment).toFixed(2)}`,
    });
  }

  // Separator line
  summaryRows.push({ label: '', value: '', isDivider: true });

  // Grand Total
  summaryRows.push({
    label: 'Grand Total:',
    value: formatPdfCurrency(invoice.grandTotal),
    isBold: true,
    fontSize: 9.5,
    textColor: [37, 99, 235], // Blue
  });

  // Amount Paid
  summaryRows.push({
    label: 'Amount Paid:',
    value: formatPdfCurrency(invoice.amountPaid),
    isBold: true,
    fontSize: 8.5,
    textColor: [22, 163, 74], // Green
  });

  // Balance Due
  const isDue = invoice.balanceDue > 0;
  summaryRows.push({
    label: 'Balance Due:',
    value: formatPdfCurrency(invoice.balanceDue),
    isBold: true,
    fontSize: 8.5,
    textColor: isDue ? [220, 38, 38] : [22, 163, 74],
  });

  // Dynamic box height calculation based on rows
  const rowHeight = 5.2;
  const topPadding = 4.5;
  const bottomPadding = 4;
  const dividerHeight = 3.5;

  let calculatedBoxHeight = topPadding + bottomPadding;
  for (const r of summaryRows) {
    if (r.isDivider) {
      calculatedBoxHeight += dividerHeight;
    } else if (r.fontSize && r.fontSize >= 9.5) {
      calculatedBoxHeight += rowHeight + 1.2;
    } else {
      calculatedBoxHeight += rowHeight;
    }
  }

  // Draw Totals Box Background & Border
  doc.setFillColor(248, 250, 252); // Soft slate background
  doc.setDrawColor(203, 213, 225); // Slate 300 border
  doc.setLineWidth(0.3);
  doc.roundedRect(boxLeft, finalY, boxWidth, calculatedBoxHeight, 2, 2, 'FD');

  // Terms & Conditions on the Left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Terms & Conditions:', 14, finalY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const termsMaxWidth = boxLeft - 14 - 6; // ~92mm
  const termsLines = doc.splitTextToSize(settings.termsAndConditions || '1. Goods once sold can only be replaced within 7 days in original condition with bill.\n2. Electrical & power tools covered under respective brand warranties.\n3. All disputes subject to local jurisdiction.', termsMaxWidth);
  doc.text(termsLines, 14, finalY + 9);

  // Render Rows inside Totals Box
  let currentLineY = finalY + topPadding + 2.5;

  for (const r of summaryRows) {
    if (r.isDivider) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(boxLeft + 3, currentLineY - 1, boxRight - 3, currentLineY - 1);
      currentLineY += dividerHeight;
    } else {
      const fSize = r.fontSize || 8;
      doc.setFontSize(fSize);
      doc.setFont('helvetica', r.isBold ? 'bold' : 'normal');

      if (r.textColor) {
        doc.setTextColor(r.textColor[0], r.textColor[1], r.textColor[2]);
      } else {
        doc.setTextColor(51, 65, 85);
      }

      // Left Label (4mm inside box)
      doc.text(r.label, boxLeft + 4, currentLineY);

      // Right Value (4.5mm inside box, right-aligned)
      doc.text(r.value, boxRight - 4.5, currentLineY, { align: 'right' });

      currentLineY += (fSize >= 9.5 ? rowHeight + 1.2 : rowHeight);
    }
  }

  // Footer notes & Authorised Signatory
  const footerY = Math.max(finalY + calculatedBoxHeight + 16, 266);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.invoiceFooter || 'Thank you for choosing Sangam Sales and Sangam Automobiles!', 14, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${settings.shopName}`, pageWidth - 14, footerY - 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('MR. Rajendra Gaikwad (Authorised Signatory)', pageWidth - 14, footerY, { align: 'right' });

  // Output
  if (autoPrint) {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  } else {
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }
}
