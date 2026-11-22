import { storeService } from './store';
import { Product } from '@/types';

export function runComprehensiveTestSuite() {
  const logs: { name: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      logs.push({ name: testName, status: 'PASS' });
      passed++;
    } else {
      logs.push({ name: testName, status: 'FAIL', details });
      failed++;
    }
  }

  // TEST 1: Product Creation
  console.log('--- TEST 1: Product Creation ---');
  const initialCount = storeService.getProducts().length;
  const testSku = `TEST-PIPE-${Date.now()}`;
  const newProd = storeService.addProduct({
    name: 'Astral CPVC Pro Pipe 1 Inch (10ft)',
    sku: testSku,
    barcode: '890999888111',
    categoryId: 'cat-plumbing',
    purchasePrice: 200,
    sellingPrice: 300,
    gstRate: 18,
    unitId: 'unit-pc',
    currentStock: 100,
    minStockLevel: 10,
  });

  const retrievedProd = storeService.getProductById(newProd.id);
  assert(Boolean(retrievedProd), 'Product appears in product list');
  assert(retrievedProd?.currentStock === 100, 'Product stock quantity is accurately set to 100');
  assert(storeService.getProducts().length === initialCount + 1, 'Total product catalog count incremented');

  // Verify unique SKU check
  let duplicatePrevented = false;
  try {
    storeService.addProduct({
      name: 'Duplicate SKU Product',
      sku: testSku,
      categoryId: 'cat-plumbing',
      purchasePrice: 100,
      sellingPrice: 150,
      gstRate: 18,
      unitId: 'unit-pc',
      currentStock: 10,
      minStockLevel: 2,
    });
  } catch (err: unknown) {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Duplicate SKU product addition is rejected as required');

  // TEST 2: Billing and Stock Deduction
  console.log('\n--- TEST 2: Billing and Stock Deduction ---');
  // Product has 100 units. Bill 5 units.
  const invNumber1 = `TEST-INV-${Date.now()}-1`;
  const finalizedInv = storeService.finalizeInvoice({
    invoiceNumber: invNumber1,
    customerName: 'Test Contractor Ramesh',
    customerMobile: '9999988888',
    subtotal: 1500,
    totalDiscount: 0,
    taxableAmount: 1500,
    cgstTotal: 135,
    sgstTotal: 135,
    igstTotal: 0,
    taxTotal: 270,
    roundingAdjustment: 0,
    grandTotal: 1770,
    amountPaid: 1770,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    isInterState: false,
    items: [
      {
        id: 'test-item-1',
        invoiceId: '',
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        quantity: 5,
        unit: 'pc',
        unitPrice: 300,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 1500,
        gstRate: 18,
        cgstRate: 9,
        cgstAmount: 135,
        sgstRate: 9,
        sgstAmount: 135,
        igstRate: 0,
        igstAmount: 0,
        totalPrice: 1770,
      },
    ],
  });

  const updatedProdAfterSale = storeService.getProductById(newProd.id);
  assert(
    updatedProdAfterSale?.currentStock === 95,
    `Stock deducted from 100 to 95 (Actual: ${updatedProdAfterSale?.currentStock})`
  );

  const movements = storeService.getStockMovements(newProd.id);
  const saleMovement = movements.find(
    (m) => m.referenceNumber === invNumber1 && m.transactionType === 'sale'
  );
  assert(Boolean(saleMovement), 'Stock movement audit record created for sale');
  assert(saleMovement?.quantityChange === -5, 'Movement records exactly -5 units');
  assert(
    saleMovement?.previousStock === 100 && saleMovement?.newStock === 95,
    'Movement ledger logs correct previousStock (100) and newStock (95)'
  );

  // TEST 3: Insufficient Stock
  console.log('\n--- TEST 3: Insufficient Stock Prevention ---');
  // Create a product with only 3 units
  const lowStockProd = storeService.addProduct({
    name: 'Limited Edition Drill Bit',
    sku: `DRILL-3PCS-${Date.now()}`,
    categoryId: 'cat-powertools',
    purchasePrice: 50,
    sellingPrice: 100,
    gstRate: 18,
    unitId: 'unit-pc',
    currentStock: 3,
    minStockLevel: 1,
  });

  let insufficientRejected = false;
  try {
    storeService.finalizeInvoice({
      customerName: 'Customer',
      customerMobile: '9988776655',
      subtotal: 500,
      totalDiscount: 0,
      taxableAmount: 500,
      cgstTotal: 45,
      sgstTotal: 45,
      igstTotal: 0,
      taxTotal: 90,
      roundingAdjustment: 0,
      grandTotal: 590,
      amountPaid: 590,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      isInterState: false,
      items: [
        {
          id: 'test-item-3',
          invoiceId: '',
          productId: lowStockProd.id,
          productName: lowStockProd.name,
          sku: lowStockProd.sku,
          quantity: 5, // Attempting to bill 5 when only 3 exist
          unit: 'pc',
          unitPrice: 100,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 500,
          gstRate: 18,
          cgstRate: 9,
          cgstAmount: 45,
          sgstRate: 9,
          sgstAmount: 45,
          igstRate: 0,
          igstAmount: 0,
          totalPrice: 590,
        },
      ],
    });
  } catch (err: unknown) {
    insufficientRejected = true;
  }
  assert(insufficientRejected, 'Billing rejected when requested quantity (5) exceeds stock (3)');
  const prodAfterReject = storeService.getProductById(lowStockProd.id);
  assert(prodAfterReject?.currentStock === 3, 'Product stock remains intact at 3 units');

  // TEST 4: Duplicate Submission (Idempotency)
  console.log('\n--- TEST 4: Duplicate Submission (Idempotency) ---');
  let duplicateRejected = false;
  try {
    // Attempting to finalize with the exact same invoice number
    storeService.finalizeInvoice({
      invoiceNumber: invNumber1,
      customerName: 'Test Contractor Ramesh',
      customerMobile: '9999988888',
      subtotal: 1500,
      totalDiscount: 0,
      taxableAmount: 1500,
      cgstTotal: 135,
      sgstTotal: 135,
      igstTotal: 0,
      taxTotal: 270,
      roundingAdjustment: 0,
      grandTotal: 1770,
      amountPaid: 1770,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      isInterState: false,
      items: [
        {
          id: 'test-dup-item',
          invoiceId: '',
          productId: newProd.id,
          productName: newProd.name,
          sku: newProd.sku,
          quantity: 5,
          unit: 'pc',
          unitPrice: 300,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 1500,
          gstRate: 18,
          cgstRate: 9,
          cgstAmount: 135,
          sgstRate: 9,
          sgstAmount: 135,
          igstRate: 0,
          igstAmount: 0,
          totalPrice: 1770,
        },
      ],
    });
  } catch (err: unknown) {
    duplicateRejected = true;
  }
  assert(duplicateRejected, 'Duplicate invoice submission rejected by idempotency mechanism');
  const prodAfterDuplicateAttempt = storeService.getProductById(newProd.id);
  assert(prodAfterDuplicateAttempt?.currentStock === 95, 'Stock deducted only once and remains at 95');

  // TEST 5: Purchase and Stock Addition
  console.log('\n--- TEST 5: Purchase and Stock Addition ---');
  // Product has 95 units. Receive purchase of 20 units -> 115 units.
  const purchase = storeService.createPurchase({
    supplierId: 'sup-01',
    supplierName: 'Tata Steel Distributors (North)',
    purchaseDate: new Date().toISOString(),
    subtotal: 4000,
    taxAmount: 720,
    discountAmount: 0,
    totalAmount: 4720,
    amountPaid: 4720,
    balanceDue: 0,
    paymentMethod: 'bank_transfer',
    paymentStatus: 'paid',
    status: 'draft',
    items: [
      {
        id: 'pur-test-1',
        purchaseId: '',
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        quantity: 20,
        unit: 'pc',
        purchaseRate: 200,
        taxRate: 18,
        taxAmount: 720,
        totalAmount: 4720,
      },
    ],
  });

  // Verify stock is still 95 when in draft
  const prodDuringDraft = storeService.getProductById(newProd.id);
  assert(prodDuringDraft?.currentStock === 95, 'Draft purchase does NOT add stock prematurely');

  // Receive purchase
  storeService.receivePurchase(purchase.id);
  const prodAfterReceive = storeService.getProductById(newProd.id);
  assert(
    prodAfterReceive?.currentStock === 115,
    `Stock becomes 115 after receiving 20 units (Actual: ${prodAfterReceive?.currentStock})`
  );

  const purchaseMovements = storeService.getStockMovements(newProd.id);
  const purMove = purchaseMovements.find((m) => m.transactionType === 'purchase' && m.quantityChange === 20);
  assert(Boolean(purMove), 'Stock ledger logs purchase addition movement of +20 units');

  // TEST 7: Partial Payment
  console.log('\n--- TEST 7: Partial Payment & Outstanding Balances ---');
  // Bill of ₹10,000, received ₹6,000 -> balance due ₹4,000
  const partialInvNum = `PARTIAL-INV-${Date.now()}`;
  const partialInv = storeService.finalizeInvoice({
    invoiceNumber: partialInvNum,
    customerName: 'Gupta Enterprises',
    customerMobile: '9812345678',
    subtotal: 10000,
    totalDiscount: 0,
    taxableAmount: 10000,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    taxTotal: 0,
    roundingAdjustment: 0,
    grandTotal: 10000,
    amountPaid: 6000,
    paymentMethod: 'credit',
    paymentStatus: 'partially_paid',
    isInterState: false,
    items: [
      {
        id: 'item-partial',
        invoiceId: '',
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        quantity: 1,
        unit: 'pc',
        unitPrice: 10000,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 10000,
        gstRate: 0,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        totalPrice: 10000,
      },
    ],
  });

  assert(partialInv.balanceDue === 4000, `Outstanding balance due is ₹4,000 (Actual: ₹${partialInv.balanceDue})`);
  assert(partialInv.paymentStatus === 'partially_paid', 'Payment status is marked as "partially_paid"');

  // Record additional payment of ₹4,000
  storeService.recordPayment({
    referenceType: 'invoice',
    referenceId: partialInv.id,
    referenceNumber: partialInv.invoiceNumber,
    partyType: 'customer',
    partyId: 'walk-in',
    partyName: 'Gupta Enterprises',
    amount: 4000,
    paymentMethod: 'cash',
  });

  const reloadedPartialInv = storeService.getInvoiceById(partialInv.id);
  assert(reloadedPartialInv?.balanceDue === 0, 'After second payment, balance due becomes 0');
  assert(reloadedPartialInv?.paymentStatus === 'paid', 'Invoice payment status updates to "paid"');

  // TEST 8: Returns and Cancellation Reversal
  console.log('\n--- TEST 8: Returns and Cancellation Reversal ---');
  // Cancel finalizedInv (which sold 5 units of newProd).
  // Current stock of newProd before cancellation:
  // 115 (after purchase) - 1 (from partialInv) = 114.
  const stockBeforeCancel = storeService.getProductById(newProd.id)!.currentStock;
  storeService.cancelInvoice(finalizedInv.id, 'Customer returned goods within 7 days');

  const stockAfterCancel = storeService.getProductById(newProd.id)!.currentStock;
  assert(
    stockAfterCancel === stockBeforeCancel + 5,
    `Stock restored by +5 units after invoice cancellation (From ${stockBeforeCancel} to ${stockAfterCancel})`
  );

  const cancellationMovements = storeService.getStockMovements(newProd.id);
  const reversalMovement = cancellationMovements.find(
    (m) => m.referenceNumber === invNumber1 && m.transactionType === 'sale_return'
  );
  assert(Boolean(reversalMovement), 'Sale return stock movement audit logged for cancellation');

  // Verify same reversal cannot happen twice
  let doubleCancelRejected = false;
  try {
    storeService.cancelInvoice(finalizedInv.id, 'Attempting second cancellation');
  } catch (err: unknown) {
    doubleCancelRejected = true;
  }
  assert(doubleCancelRejected, 'Duplicate invoice cancellation rejected; same reversal cannot happen twice');

  // TEST 10: Role Authorization
  console.log('\n--- TEST 10: Role Authorization ---');
  storeService.setCurrentUser('admin');
  assert(storeService.getCurrentUser().role === 'admin', 'Active session is Admin role');

  // TEST 11: Bulk Excel Product Import
  console.log('\n--- TEST 11: Bulk Excel Product Import ---');
  const importSku1 = `EXCEL-IMP-1-${Date.now()}`;
  const importSku2 = `EXCEL-IMP-2-${Date.now()}`;
  const bulkData = [
    {
      name: 'Havells 2.5 Sq mm Copper House Wire 90m',
      sku: importSku1,
      categoryName: 'Electrical Cables & Accessories',
      brand: 'Havells',
      purchasePrice: 1800,
      sellingPrice: 2200,
      gstRate: 18,
      unitSymbol: 'coil',
      currentStock: 45,
      minStockLevel: 5,
      barcode: '890111222333',
    },
    {
      name: 'Dr. Fixit Pidiproof LW+ 5 Litre',
      sku: importSku2,
      categoryName: 'Waterproofing & Adhesives',
      brand: 'Dr. Fixit',
      purchasePrice: 650,
      sellingPrice: 850,
      gstRate: 18,
      unitSymbol: 'can',
      currentStock: 30,
      minStockLevel: 5,
    },
    {
      name: 'Self-Drilling Steel Screws 25mm Box',
      // No SKU provided; should auto-generate
      categoryName: 'Fasteners & Screws',
      sellingPrice: 320,
      purchasePrice: 210,
      unitSymbol: 'box',
      currentStock: 15,
    },
  ];

  const importResult = storeService.importProductsBulk(bulkData, true);
  assert(importResult.addedCount === 3, `Bulk import added 3 products (addedCount: ${importResult.addedCount})`);

  const importedItem = storeService.getProducts().find((p) => p.sku === importSku1);
  assert(Boolean(importedItem), 'Imported product 1 found in catalog by SKU');
  assert(importedItem?.currentStock === 45, 'Imported product stock is 45 units');
  assert(importedItem?.unitSymbol === 'coil', 'Imported unit symbol is "coil"');

  // Test updating via bulk import
  const updateData = [
    {
      name: 'Havells 2.5 Sq mm Copper House Wire 90m (Updated)',
      sku: importSku1,
      sellingPrice: 2350,
      purchasePrice: 1850,
      currentStock: 60,
    },
  ];
  const updateResult = storeService.importProductsBulk(updateData, true);
  assert(updateResult.updatedCount === 1, `Bulk import updated existing product (updatedCount: ${updateResult.updatedCount})`);

  const updatedItem = storeService.getProducts().find((p) => p.sku === importSku1);
  assert(updatedItem?.sellingPrice === 2350, 'Selling price updated to 2350');
  assert(updatedItem?.currentStock === 60, 'Stock updated to 60');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed, logs };
}

