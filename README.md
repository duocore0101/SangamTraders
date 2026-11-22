# SANGAM SALES – Hardware Store Management System

> **Developed by DUOCORE SOFTWARE**  
> Premium Hardware Store Billing, Inventory, Purchases, Ledger, and Accounting ERP System.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Recharts, jsPDF, jsPDF-autotable, SheetJS (XLSX).
- **Backend**: Next.js Server Actions, Route Handlers, Zod schema validation, Supabase PostgreSQL, Stored Procedures.
- **Database**: PostgreSQL / Supabase with Row Level Security (RLS), atomic stored procedures for stock deduction, and audit logging.
- **Offline & Local Store**: Intelligent unified storage service layer with persistent local fallback and real-time database synchronizer.

---

## 🚀 Key Modules & Capabilities

### 1. POS Billing Counter (`/billing/new`)
- Real-time hardware product search, category pills, and instant barcode scanner input.
- Automatic GST tax calculations: Intra-state (CGST + SGST) and Inter-state (IGST).
- Item-level discount and whole-invoice roundings.
- Walk-in and registered customer options with Quick Customer registration modal.
- Multi-channel payments: Cash, UPI, Card, Bank Transfer, and Credit.
- **Atomic Stock Deduction**: Validates stock sufficiency and decrements inventory atomically upon invoice finalization.
- **Idempotency Protection**: Guarantees stock is never deducted twice due to network retries or repeated button clicks.

### 2. Tax Invoice History & PDF Generator (`/billing/invoices`)
- Professional A4 downloadable and printable PDF invoices branded for **Sangam Sales**.
- Includes store GSTIN, customer details, itemized tax rates, payment breakdowns, and custom terms & conditions.
- Additional payment recording against partial/credit sales with live balance due recalculation.
- **Invoice Cancellation & Stock Restoration**: Cancelling a finalized invoice restores deducted stock to the warehouse and logs an immutable `sale_return` audit movement.

### 3. Product & Inventory Management (`/products`, `/inventory`)
- Full hardware catalog management with custom units: Piece, Box, Packet, Bag, Kilogram, Gram, Litre, Meter, Feet, Bundle, Roll, Set, Dozen, Carton.
- Support for fractional quantities (e.g. 1.5 kg, 2.5 meters).
- Unique SKU validation (prevents duplicate SKU entries).
- Dynamic stock badges: `In Stock`, `Low Stock (Reorder Alert)`, `Out of Stock`.
- Complete product stock ledger view with before/after counts for every transaction.

### 4. Stock Movement Ledger & Adjustments (`/inventory/stock-movements`, `/inventory/adjustments`)
- Immutable audit ledger recording: Date, Product, Transaction Type (`opening_stock`, `purchase`, `sale`, `sale_return`, `damaged_stock`, `manual_adjustment`), Quantity Change, Previous Stock, New Stock, Reference Voucher, User, Reason.
- Stock adjustment module to record damaged goods, lost items, and physical warehouse inventory reconciliation.

### 5. Purchase Orders & Inventory Inward (`/purchases`)
- Manage vendor consignments and supplier bills.
- Receiving verification: quantities are only added to warehouse stock when the purchase order is marked as `Received`.

### 6. Customer & Supplier Accounts (`/customers`, `/suppliers`)
- Contractor and client ledgers with outstanding receivables tracking.
- Vendor debt tracking with direct disbursement payment vouchers.

### 7. Financial Reports & Analytics (`/reports`)
- 13 comprehensive reports with date filters and instant Excel export:
  1. Sales Transactions Report
  2. Daily/Weekly/Monthly Revenue Trends
  3. Product-wise Sales Report
  4. Category-wise Sales Volume
  5. Estimated Gross Profit Analysis (Distinguishes gross profit from revenue)
  6. Customer Receivables & Outstanding Balances
  7. Supplier Payables & Dues
  8. Low Stock & Reorder Alerts
  9. Warehouse Inventory Valuation
  10. Cash & Bank Payment Ledger

### 8. Settings & Permissions (`/settings`)
- Configurable Store Profile: Shop Name, Address, Phone, Email, GSTIN, State, Pincode.
- Billing Defaults: Default GST slab, Default discount, Invoice prefix (`SS-INV-`), Terms & Conditions.
- Inventory Policies: Reorder notification threshold and negative stock protection.
- Role-based Access Control: Instant switching between **Admin / Owner** (full access) and **Staff / Cashier** (billing and inventory only).

---

## 🗄️ Database Architecture & Migrations

All SQL schema migrations, Row Level Security (RLS) policies, and atomic PostgreSQL functions are located in `supabase/migrations/`:

- `supabase/migrations/001_initial_schema.sql`:
  - `profiles`, `business_settings`, `categories`, `units`, `products`, `customers`, `suppliers`, `invoices`, `invoice_items`, `purchases`, `purchase_items`, `payments`, `stock_movements`, `stock_adjustments`, `audit_logs`.
  - Proper foreign keys, indexes on SKU, Barcode, Invoice Numbers, Customer IDs, Dates.
- `supabase/migrations/002_functions_and_triggers.sql`:
  - RLS policies for admin and staff roles.
  - `finalize_invoice_transaction(...)`: Atomic stored procedure verifying stock, decrementing quantities, creating invoice items, and logging movements in a single PostgreSQL transaction.
  - `cancel_invoice_transaction(...)`: Atomic stored procedure reversing stock deductions exactly once.
  - `receive_purchase_transaction(...)`: Atomic stored procedure incrementing inventory upon purchase arrival.

---

## 🔑 Environment Variables Configuration

Copy `.env.example` to `.env.local` and provide your credentials when connecting to a remote Supabase instance:

```env
# Supabase PostgreSQL Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application Metadata
NEXT_PUBLIC_APP_NAME="SANGAM SALES"
NEXT_PUBLIC_APP_SUBTITLE="Hardware Store Management System"
NEXT_PUBLIC_DEVELOPED_BY="DUOCORE SOFTWARE"
```

*Note: If credentials are not provided, the application automatically runs in High-Performance Local Store Mode with full persistence, pre-seeded hardware inventory, and full functionality.*

---

## 🧪 Automated Testing & Verification

The test suite validates the 10 business logic workflows end-to-end:
- **Test 1**: Product Creation & unique SKU enforcement.
- **Test 2**: Billing and atomic stock deduction (100 -> 95 units) with audit movement logging.
- **Test 3**: Insufficient stock rejection (requesting 5 units when only 3 exist).
- **Test 4**: Duplicate submission idempotency.
- **Test 5**: Purchase inward and stock addition (95 -> 115 units).
- **Test 6**: Professional A4 PDF generation.
- **Test 7**: Partial payments and outstanding balance reconciliation (₹10,000 bill, ₹6,000 paid -> ₹4,000 due).
- **Test 8**: Invoice cancellation and automatic stock reversal with duplicate rejection.
- **Test 9**: Mobile-first responsive UI (tested at 360px, 390px, 768px, 1024px, 1440px).
- **Test 10**: Role-based access control (Admin vs Staff).

Run or verify via the built-in test endpoint:
```bash
curl http://localhost:3005/api/test-suite
# Result: {"message":"Sangam Sales Automated Test Suite","status":"PASSED","passed":24,"failed":0,"failures":[]}
```

---

## 💻 Local Development & Deployment

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run in Development**:
   ```bash
   npm run dev
   ```

3. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

Developed with ❤️ by **Duocore Software** for **Sangam Sales**.
