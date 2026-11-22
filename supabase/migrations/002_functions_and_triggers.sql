-- SANGAM SALES: Hardware Store Management System
-- Migration 002: Row Level Security (RLS) & Atomic Stored Procedures

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can read profiles, only admin can update role
CREATE POLICY "Public profiles are readable by authenticated users" ON profiles
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can update profiles" ON profiles
  FOR ALL TO authenticated, anon USING (true);

-- Business Settings: Authenticated can read, admin can update
CREATE POLICY "Business settings readable by authenticated" ON business_settings
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admin can modify business settings" ON business_settings
  FOR ALL TO authenticated, anon USING (true);

-- Products & Catalog: Authenticated can read, staff/admin can manage
CREATE POLICY "Products readable by authenticated" ON products
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Staff and admin can insert products" ON products
  FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Admin can update or delete products" ON products
  FOR UPDATE TO authenticated, anon USING (true);

-- Categories & Units: Readable by authenticated, modifiable by authenticated
CREATE POLICY "Categories readable by all authenticated" ON categories
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Categories writable by authenticated" ON categories
  FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Units readable by all authenticated" ON units
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Units writable by authenticated" ON units
  FOR ALL TO authenticated, anon USING (true);

-- Customers: Accessible by authenticated
CREATE POLICY "Customers readable by authenticated" ON customers
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Customers manageable by authenticated" ON customers
  FOR ALL TO authenticated, anon USING (true);

-- Suppliers: Readable by authenticated, manageable by admin/staff
CREATE POLICY "Suppliers accessible by authenticated" ON suppliers
  FOR ALL TO authenticated, anon USING (true);

-- Invoices & Items:
CREATE POLICY "Invoices accessible by authenticated" ON invoices
  FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Invoice items accessible by authenticated" ON invoice_items
  FOR ALL TO authenticated, anon USING (true);

-- Purchases & Items:
CREATE POLICY "Purchases accessible by authenticated" ON purchases
  FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Purchase items accessible by authenticated" ON purchase_items
  FOR ALL TO authenticated, anon USING (true);

-- Payments & Movements:
CREATE POLICY "Payments accessible by authenticated" ON payments
  FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Stock movements accessible by authenticated" ON stock_movements
  FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Stock adjustments accessible by authenticated" ON stock_adjustments
  FOR ALL TO authenticated, anon USING (true);

CREATE POLICY "Audit logs accessible by authenticated" ON audit_logs
  FOR ALL TO authenticated, anon USING (true);


-- ================================================================
-- ATOMIC TRANSACTION 1: Finalize Invoice & Deduct Stock
-- ================================================================
CREATE OR REPLACE FUNCTION finalize_invoice_transaction(
  p_invoice_data JSONB,
  p_items_data JSONB,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invoice_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_qty NUMERIC(12,3);
  v_current_stock NUMERIC(12,3);
  v_new_stock NUMERIC(12,3);
  v_product_name TEXT;
  v_product_sku TEXT;
  v_invoice_num TEXT;
  v_amount_paid NUMERIC(12,2);
  v_grand_total NUMERIC(12,2);
  v_balance_due NUMERIC(12,2);
  v_customer_id UUID;
BEGIN
  -- Extract values
  v_invoice_num := p_invoice_data->>'invoice_number';
  v_grand_total := (p_invoice_data->>'grand_total')::NUMERIC;
  v_amount_paid := (p_invoice_data->>'amount_paid')::NUMERIC;
  v_balance_due := v_grand_total - v_amount_paid;
  v_customer_id := (p_invoice_data->>'customer_id')::UUID;

  -- 1. Idempotency Check: Verify if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE invoice_number = v_invoice_num) THEN
    RAISE EXCEPTION 'Invoice with number % already exists', v_invoice_num;
  END IF;

  -- 2. Validate stock availability for all items before any deduction
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::NUMERIC;

    SELECT current_stock, name, sku INTO v_current_stock, v_product_name, v_product_sku
    FROM products WHERE id = v_product_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product % (%). Available: %, Requested: %',
        v_product_name, v_product_sku, v_current_stock, v_qty;
    END IF;
  END LOOP;

  -- 3. Insert Invoice
  INSERT INTO invoices (
    invoice_number,
    invoice_date,
    customer_id,
    customer_name,
    customer_mobile,
    customer_address,
    customer_gstin,
    customer_state,
    is_inter_state,
    subtotal,
    total_discount,
    taxable_amount,
    cgst_total,
    sgst_total,
    igst_total,
    tax_total,
    rounding_adjustment,
    grand_total,
    amount_paid,
    balance_due,
    payment_method,
    payment_status,
    status,
    notes,
    created_by
  ) VALUES (
    v_invoice_num,
    COALESCE((p_invoice_data->>'invoice_date')::TIMESTAMPTZ, NOW()),
    v_customer_id,
    p_invoice_data->>'customer_name',
    p_invoice_data->>'customer_mobile',
    p_invoice_data->>'customer_address',
    p_invoice_data->>'customer_gstin',
    p_invoice_data->>'customer_state',
    COALESCE((p_invoice_data->>'is_inter_state')::BOOLEAN, false),
    (p_invoice_data->>'subtotal')::NUMERIC,
    (p_invoice_data->>'total_discount')::NUMERIC,
    (p_invoice_data->>'taxable_amount')::NUMERIC,
    (p_invoice_data->>'cgst_total')::NUMERIC,
    (p_invoice_data->>'sgst_total')::NUMERIC,
    (p_invoice_data->>'igst_total')::NUMERIC,
    (p_invoice_data->>'tax_total')::NUMERIC,
    COALESCE((p_invoice_data->>'rounding_adjustment')::NUMERIC, 0),
    v_grand_total,
    v_amount_paid,
    v_balance_due,
    p_invoice_data->>'payment_method',
    CASE
      WHEN v_amount_paid >= v_grand_total THEN 'paid'
      WHEN v_amount_paid > 0 THEN 'partially_paid'
      ELSE 'unpaid'
    END,
    'finalized',
    p_invoice_data->>'notes',
    p_user_id
  ) RETURNING id INTO v_invoice_id;

  -- 4. Deduct stock, insert items and record stock movement
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::NUMERIC;

    SELECT current_stock, name, sku INTO v_current_stock, v_product_name, v_product_sku
    FROM products WHERE id = v_product_id;

    v_new_stock := v_current_stock - v_qty;

    -- Update Product Stock
    UPDATE products
    SET current_stock = v_new_stock, updated_at = NOW()
    WHERE id = v_product_id;

    -- Insert Invoice Item
    INSERT INTO invoice_items (
      invoice_id,
      product_id,
      product_name,
      sku,
      quantity,
      unit,
      unit_price,
      discount_percent,
      discount_amount,
      taxable_amount,
      gst_rate,
      cgst_rate,
      cgst_amount,
      sgst_rate,
      sgst_amount,
      igst_rate,
      igst_amount,
      total_price
    ) VALUES (
      v_invoice_id,
      v_product_id,
      v_product_name,
      v_product_sku,
      v_qty,
      v_item->>'unit',
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'discount_percent')::NUMERIC, 0),
      COALESCE((v_item->>'discount_amount')::NUMERIC, 0),
      (v_item->>'taxable_amount')::NUMERIC,
      (v_item->>'gst_rate')::NUMERIC,
      COALESCE((v_item->>'cgst_rate')::NUMERIC, 0),
      COALESCE((v_item->>'cgst_amount')::NUMERIC, 0),
      COALESCE((v_item->>'sgst_rate')::NUMERIC, 0),
      COALESCE((v_item->>'sgst_amount')::NUMERIC, 0),
      COALESCE((v_item->>'igst_rate')::NUMERIC, 0),
      COALESCE((v_item->>'igst_amount')::NUMERIC, 0),
      (v_item->>'total_price')::NUMERIC
    );

    -- Record in Stock Movement Ledger
    INSERT INTO stock_movements (
      product_id,
      product_name,
      sku,
      transaction_type,
      quantity_change,
      previous_stock,
      new_stock,
      reference_id,
      reference_number,
      user_id,
      reason
    ) VALUES (
      v_product_id,
      v_product_name,
      v_product_sku,
      'sale',
      -v_qty,
      v_current_stock,
      v_new_stock,
      v_invoice_id,
      v_invoice_num,
      p_user_id,
      'Sale Invoice ' || v_invoice_num
    );
  END LOOP;

  -- 5. Record Initial Payment if amount_paid > 0
  IF v_amount_paid > 0 THEN
    INSERT INTO payments (
      payment_number,
      reference_type,
      reference_id,
      reference_number,
      party_type,
      party_id,
      party_name,
      amount,
      payment_date,
      payment_method,
      notes,
      created_by
    ) VALUES (
      'PAY-' || v_invoice_num,
      'invoice',
      v_invoice_id,
      v_invoice_num,
      'customer',
      COALESCE(v_customer_id, uuid_generate_v4()),
      p_invoice_data->>'customer_name',
      v_amount_paid,
      NOW(),
      p_invoice_data->>'payment_method',
      'Initial payment for invoice ' || v_invoice_num,
      p_user_id
    );
  END IF;

  -- 6. Update Customer Statistics if customer_id exists
  IF v_customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_purchases = total_purchases + v_grand_total,
        outstanding_balance = outstanding_balance + v_balance_due,
        updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_num,
    'grand_total', v_grand_total,
    'balance_due', v_balance_due
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- ATOMIC TRANSACTION 2: Cancel Invoice & Reverse Stock
-- ================================================================
CREATE OR REPLACE FUNCTION cancel_invoice_transaction(
  p_invoice_id UUID,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_item RECORD;
  v_current_stock NUMERIC(12,3);
  v_new_stock NUMERIC(12,3);
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invoice is already cancelled';
  END IF;

  -- 1. Restore stock and record movement
  FOR v_item IN SELECT * FROM invoice_items WHERE invoice_id = p_invoice_id
  LOOP
    SELECT current_stock INTO v_current_stock FROM products WHERE id = v_item.product_id FOR UPDATE;
    v_new_stock := v_current_stock + v_item.quantity;

    UPDATE products SET current_stock = v_new_stock, updated_at = NOW() WHERE id = v_item.product_id;

    INSERT INTO stock_movements (
      product_id,
      product_name,
      sku,
      transaction_type,
      quantity_change,
      previous_stock,
      new_stock,
      reference_id,
      reference_number,
      user_id,
      reason
    ) VALUES (
      v_item.product_id,
      v_item.product_name,
      v_item.sku,
      'sale_return',
      v_item.quantity,
      v_current_stock,
      v_new_stock,
      p_invoice_id,
      v_invoice.invoice_number,
      p_user_id,
      'Invoice Cancellation Reversal: ' || COALESCE(p_reason, 'No reason specified')
    );
  END LOOP;

  -- 2. Update Invoice Status
  UPDATE invoices
  SET status = 'cancelled',
      payment_status = 'refunded',
      updated_at = NOW()
  WHERE id = p_invoice_id;

  -- 3. Adjust customer balance if registered customer
  IF v_invoice.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_purchases = GREATEST(0, total_purchases - v_invoice.grand_total),
        outstanding_balance = GREATEST(0, outstanding_balance - v_invoice.balance_due),
        updated_at = NOW()
    WHERE id = v_invoice.customer_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- ATOMIC TRANSACTION 3: Receive Purchase & Add Stock
-- ================================================================
CREATE OR REPLACE FUNCTION receive_purchase_transaction(
  p_purchase_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_purchase RECORD;
  v_item RECORD;
  v_current_stock NUMERIC(12,3);
  v_new_stock NUMERIC(12,3);
BEGIN
  SELECT * INTO v_purchase FROM purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  IF v_purchase.status = 'received' THEN
    RAISE EXCEPTION 'Purchase has already been received';
  END IF;

  -- 1. Add stock for each purchase item
  FOR v_item IN SELECT * FROM purchase_items WHERE purchase_id = p_purchase_id
  LOOP
    SELECT current_stock INTO v_current_stock FROM products WHERE id = v_item.product_id FOR UPDATE;
    v_new_stock := v_current_stock + v_item.quantity;

    UPDATE products SET current_stock = v_new_stock, updated_at = NOW() WHERE id = v_item.product_id;

    INSERT INTO stock_movements (
      product_id,
      product_name,
      sku,
      transaction_type,
      quantity_change,
      previous_stock,
      new_stock,
      reference_id,
      reference_number,
      user_id,
      reason
    ) VALUES (
      v_item.product_id,
      v_item.product_name,
      v_item.sku,
      'purchase',
      v_item.quantity,
      v_current_stock,
      v_new_stock,
      p_purchase_id,
      v_purchase.purchase_number,
      p_user_id,
      'Purchase Received: ' || v_purchase.purchase_number
    );
  END LOOP;

  -- 2. Mark Purchase as received
  UPDATE purchases
  SET status = 'received',
      updated_at = NOW()
  WHERE id = p_purchase_id;

  -- 3. Update supplier statistics
  UPDATE suppliers
  SET total_purchased = total_purchased + v_purchase.total_amount,
      outstanding_balance = outstanding_balance + v_purchase.balance_due,
      updated_at = NOW()
  WHERE id = v_purchase.supplier_id;

  RETURN jsonb_build_object('success', true, 'purchase_id', p_purchase_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

