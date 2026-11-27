import { 
  Product, 
  Category, 
  Unit, 
  Customer, 
  Supplier, 
  Invoice, 
  InvoiceItem, 
  Purchase, 
  Payment, 
  StockMovement, 
  StockAdjustment, 
  BusinessSettings, 
  UserProfile, 
  DashboardStats,
  StockStatus,
  StoreId,
  StoreAccount,
  STORE_ACCOUNTS
} from '@/types';
import { 
  INITIAL_PROFILES, 
  INITIAL_SETTINGS, 
  INITIAL_SETTINGS_SALES,
  INITIAL_SETTINGS_TRADERS,
  INITIAL_CATEGORIES, 
  INITIAL_UNITS, 
  INITIAL_PRODUCTS, 
  INITIAL_PRODUCTS_SALES,
  INITIAL_PRODUCTS_TRADERS,
  INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS, 
  INITIAL_INVOICES, 
  INITIAL_INVOICES_SALES,
  INITIAL_INVOICES_TRADERS,
  INITIAL_PURCHASES, 
  INITIAL_PAYMENTS, 
  INITIAL_STOCK_MOVEMENTS 
} from './mockData';
import { getStockStatus } from '@/lib/utils';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// Local storage prefix
const STORAGE_PREFIX = 'sangam_sales_';

class StoreService {
  private profiles: UserProfile[] = [...INITIAL_PROFILES];
  private settings: BusinessSettings = { ...INITIAL_SETTINGS };
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private units: Unit[] = [...INITIAL_UNITS];
  private products: Product[] = [...INITIAL_PRODUCTS_SALES];
  private customers: Customer[] = [...INITIAL_CUSTOMERS];
  private suppliers: Supplier[] = [...INITIAL_SUPPLIERS];
  private invoices: Invoice[] = [...INITIAL_INVOICES_SALES];
  private purchases: Purchase[] = [...INITIAL_PURCHASES];
  private payments: Payment[] = [...INITIAL_PAYMENTS];
  private stockMovements: StockMovement[] = [...INITIAL_STOCK_MOVEMENTS];
  private stockAdjustments: StockAdjustment[] = [];
  private currentUser: UserProfile = INITIAL_PROFILES[0];
  private activeStoreId: StoreId = 'sangam-sales-automobiles';
  private initialized: boolean = false;

  // Reactivity & Sync Listeners
  private listeners: Set<() => void> = new Set();
  private syncListeners: Set<(status: SyncStatus, lastSyncedAt: string | null) => void> = new Set();
  private currentSyncStatus: SyncStatus = 'idle';
  private lastSyncedAt: string | null = null;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private isFetchingFromCloud: boolean = false;

  constructor() {
    this.initStore();
    this.setupAutoSync();
  }

  // --- Subscriptions for Real-Time UI Updates ---
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onSyncStatusChange(fn: (status: SyncStatus, lastSyncedAt: string | null) => void): () => void {
    this.syncListeners.add(fn);
    fn(this.currentSyncStatus, this.lastSyncedAt);
    return () => this.syncListeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try { fn(); } catch (e) { console.error('Store listener error:', e); }
    });
  }

  private notifySyncStatus(status: SyncStatus) {
    this.currentSyncStatus = status;
    if (status === 'synced') {
      this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    this.syncListeners.forEach((fn) => {
      try { fn(this.currentSyncStatus, this.lastSyncedAt); } catch (e) { console.error('Sync listener error:', e); }
    });
  }

  // --- Background Periodic & Visibility Cloud Sync ---
  private setupAutoSync() {
    if (typeof window === 'undefined') return;

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncFromSupabase(this.activeStoreId);
      }
    });

    // Auto-poll cloud every 12 seconds
    setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        this.syncFromSupabase(this.activeStoreId);
      }
    }, 12000);
  }

  private initStore() {
    if (typeof window === 'undefined') return;
    try {
      const activeId = localStorage.getItem(STORAGE_PREFIX + 'active_store_id') as StoreId;
      this.activeStoreId = (activeId === 'sangam-traders' || activeId === 'sangam-sales-automobiles')
        ? activeId
        : 'sangam-sales-automobiles';

      // One-time migration for legacy un-scoped data
      const legacyInvoices = localStorage.getItem(STORAGE_PREFIX + 'invoices');
      if (legacyInvoices) {
        try {
          const parsed = JSON.parse(legacyInvoices);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasST = parsed.some((i: Invoice) => i.invoiceNumber?.startsWith('ST-'));
            const targetStore: StoreId = hasST ? 'sangam-traders' : 'sangam-sales-automobiles';
            const existingScoped = localStorage.getItem(`${STORAGE_PREFIX}${targetStore}_invoices`);
            if (!existingScoped) {
              localStorage.setItem(`${STORAGE_PREFIX}${targetStore}_invoices`, legacyInvoices);
            }
          }
        } catch {}
      }

      this.loadStoreData(this.activeStoreId);
      this.initialized = true;
    } catch (e) {
      console.error('Failed to init store:', e);
    }
  }

  // --- Load Isolated Data for Active Store ---
  loadStoreData(storeId: StoreId) {
    this.activeStoreId = storeId;
    if (typeof window === 'undefined') return;

    try {
      const activeStore = STORE_ACCOUNTS.find((s) => s.id === storeId) || STORE_ACCOUNTS[0];

      const load = <T>(key: string, defaultVal: T): T => {
        const item = localStorage.getItem(`${STORAGE_PREFIX}${storeId}_${key}`);
        if (item) {
          try { return JSON.parse(item); } catch {}
        }
        return defaultVal;
      };

      const isReset = localStorage.getItem(`${STORAGE_PREFIX}${storeId}_is_reset`) === 'true';
      const defaultProducts = isReset ? [] : (storeId === 'sangam-traders' ? INITIAL_PRODUCTS_TRADERS : INITIAL_PRODUCTS_SALES);
      const defaultInvoices = isReset ? [] : (storeId === 'sangam-traders' ? INITIAL_INVOICES_TRADERS : INITIAL_INVOICES_SALES);
      const defaultSettings = storeId === 'sangam-traders' ? INITIAL_SETTINGS_TRADERS : INITIAL_SETTINGS_SALES;
      const defaultCategories = isReset ? [] : INITIAL_CATEGORIES;
      const defaultCustomers = isReset ? [] : INITIAL_CUSTOMERS;
      const defaultSuppliers = isReset ? [] : INITIAL_SUPPLIERS;
      const defaultPurchases = isReset ? [] : INITIAL_PURCHASES;
      const defaultPayments = isReset ? [] : INITIAL_PAYMENTS;
      const defaultMovements = isReset ? [] : INITIAL_STOCK_MOVEMENTS;

      const loadedSettings = load('settings', defaultSettings);
      this.settings = {
        ...defaultSettings,
        ...loadedSettings,
        shopName: activeStore.name.toUpperCase(),
        tagline: activeStore.tagline,
        logoUrl: activeStore.logoUrl,
        address: 'BankarPhata, Otur, Maharashtra',
        phone: '9766551783',
        email: activeStore.email,
        gstin: '27ANPPG4334F1Z0',
        state: 'Maharashtra',
        pincode: '412409',
        invoicePrefix: activeStore.invoicePrefix,
        invoiceFooter: `Thank you for choosing ${activeStore.name}! Please visit again.`,
      };

      this.categories = load('categories', defaultCategories);
      this.units = load('units', INITIAL_UNITS);
      this.products = load('products', defaultProducts);
      this.customers = load('customers', defaultCustomers);
      this.suppliers = load('suppliers', defaultSuppliers);
      this.invoices = load('invoices', defaultInvoices);
      this.purchases = load('purchases', defaultPurchases);
      this.payments = load('payments', defaultPayments);
      this.stockMovements = load('movements', defaultMovements);
      this.stockAdjustments = load('adjustments', []);
      this.currentUser = {
        ...INITIAL_PROFILES[0],
        fullName: 'MR. Rajendra Gaikwad (Owner / Admin)',
        phone: activeStore.mobile,
        email: activeStore.email,
      };

      this.persistLocal(storeId);
      this.notify();

      // Trigger cloud sync for this store
      this.syncFromSupabase(storeId);
    } catch (e) {
      console.error('Error loading store data:', e);
    }
  }

  private persistLocal(storeId: StoreId = this.activeStoreId) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_settings`, JSON.stringify(this.settings));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_categories`, JSON.stringify(this.categories));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_units`, JSON.stringify(this.units));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_products`, JSON.stringify(this.products));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_customers`, JSON.stringify(this.customers));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_suppliers`, JSON.stringify(this.suppliers));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_invoices`, JSON.stringify(this.invoices));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_purchases`, JSON.stringify(this.purchases));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_payments`, JSON.stringify(this.payments));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_movements`, JSON.stringify(this.stockMovements));
      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_adjustments`, JSON.stringify(this.stockAdjustments));
    } catch {}
  }

  private persist(key: string, data: unknown) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${this.activeStoreId}_is_reset`);
      localStorage.setItem(`${STORAGE_PREFIX}${this.activeStoreId}_${key}`, JSON.stringify(data));
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    } catch {}

    this.notify();
    this.triggerCloudSync(this.activeStoreId);
  }

  triggerCloudSync(storeId: StoreId = this.activeStoreId) {
    if (typeof window === 'undefined' || !isSupabaseConfigured || !supabase) return;
    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => {
      this.syncToSupabase(storeId);
    }, 400);
  }

  // --- Push Snapshot to Supabase Cloud ---
  async syncToSupabase(storeId: StoreId = this.activeStoreId): Promise<boolean> {
    if (typeof window === 'undefined' || !isSupabaseConfigured || !supabase) return false;
    this.notifySyncStatus('syncing');

    try {
      const now = new Date().toISOString();
      const snapshot = {
        storeId,
        settings: this.settings,
        products: this.products,
        invoices: this.invoices,
        customers: this.customers,
        suppliers: this.suppliers,
        categories: this.categories,
        units: this.units,
        purchases: this.purchases,
        payments: this.payments,
        stockMovements: this.stockMovements,
        stockAdjustments: this.stockAdjustments,
        updatedAt: now,
      };

      const { data: existing } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('entity', 'store_sync')
        .eq('action', storeId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase
          .from('audit_logs')
          .update({
            details: snapshot,
          })
          .eq('id', existing[0].id);
      } else {
        await supabase
          .from('audit_logs')
          .insert({
            entity: 'store_sync',
            action: storeId,
            details: snapshot,
          });
      }

      localStorage.setItem(`${STORAGE_PREFIX}${storeId}_last_cloud_sync`, now);
      this.notifySyncStatus('synced');
      return true;
    } catch (err) {
      console.error('Failed to sync to Supabase:', err);
      this.notifySyncStatus('error');
      return false;
    }
  }

  // --- Pull Snapshot from Supabase Cloud ---
  async syncFromSupabase(storeId: StoreId = this.activeStoreId): Promise<boolean> {
    if (typeof window === 'undefined' || !isSupabaseConfigured || !supabase) return false;
    if (this.isFetchingFromCloud) return false;
    this.isFetchingFromCloud = true;
    this.notifySyncStatus('syncing');

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, details, created_at')
        .eq('entity', 'store_sync')
        .eq('action', storeId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Supabase fetch error:', error.message);
        this.notifySyncStatus('error');
        return false;
      }

      if (data && data.length > 0 && data[0].details) {
        const remote = data[0].details as any;

        // If cloud snapshot was reset, reflect reset state across all syncing devices
        if (remote.isReset === true) {
          this.invoices = [];
          this.products = [];
          this.categories = [];
          this.customers = [];
          this.suppliers = [];
          this.purchases = [];
          this.payments = [];
          this.stockMovements = [];
          this.stockAdjustments = [];
          localStorage.setItem(`${STORAGE_PREFIX}${storeId}_is_reset`, 'true');
          this.persistLocal(storeId);
          this.notify();
          this.notifySyncStatus('synced');
          return true;
        }

        // Merge invoices by unique invoiceNumber to preserve bills across devices
        if (remote.invoices && Array.isArray(remote.invoices)) {
          const invMap = new Map<string, Invoice>();
          remote.invoices.forEach((inv: Invoice) => invMap.set(inv.invoiceNumber, inv));
          this.invoices.forEach((inv: Invoice) => {
            if (!invMap.has(inv.invoiceNumber)) {
              invMap.set(inv.invoiceNumber, inv);
            }
          });
          this.invoices = Array.from(invMap.values()).sort(
            (a, b) => new Date(b.createdAt || b.invoiceDate).getTime() - new Date(a.createdAt || a.invoiceDate).getTime()
          );
        }

        // Merge products by SKU
        if (remote.products && Array.isArray(remote.products)) {
          const prodMap = new Map<string, Product>();
          remote.products.forEach((p: Product) => prodMap.set(p.sku, p));
          this.products.forEach((p: Product) => {
            if (!prodMap.has(p.sku)) {
              prodMap.set(p.sku, p);
            }
          });
          this.products = Array.from(prodMap.values());
        }

        // Merge customers by mobile
        if (remote.customers && Array.isArray(remote.customers)) {
          const custMap = new Map<string, Customer>();
          remote.customers.forEach((c: Customer) => custMap.set(c.mobile, c));
          this.customers.forEach((c: Customer) => {
            if (!custMap.has(c.mobile)) {
              custMap.set(c.mobile, c);
            }
          });
          this.customers = Array.from(custMap.values());
        }

        if (remote.suppliers && Array.isArray(remote.suppliers)) {
          this.suppliers = remote.suppliers;
        }
        if (remote.categories && Array.isArray(remote.categories)) {
          this.categories = remote.categories;
        }
        if (remote.units && Array.isArray(remote.units)) {
          this.units = remote.units;
        }
        if (remote.payments && Array.isArray(remote.payments)) {
          this.payments = remote.payments;
        }
        if (remote.stockMovements && Array.isArray(remote.stockMovements)) {
          this.stockMovements = remote.stockMovements;
        }
        if (remote.stockAdjustments && Array.isArray(remote.stockAdjustments)) {
          this.stockAdjustments = remote.stockAdjustments;
        }
        if (remote.settings && typeof remote.settings === 'object') {
          const activeStore = STORE_ACCOUNTS.find((s) => s.id === storeId) || STORE_ACCOUNTS[0];
          this.settings = {
            ...this.settings,
            ...remote.settings,
            shopName: activeStore.name.toUpperCase(),
            invoiceFooter: `Thank you for choosing ${activeStore.name}! Please visit again.`,
            address: 'BankarPhata, Otur, Maharashtra',
            gstin: '27ANPPG4334F1Z0',
            state: 'Maharashtra',
            pincode: '412409',
            phone: '9766551783',
          };
        }

        this.persistLocal(storeId);
        this.notify();
        this.notifySyncStatus('synced');
        return true;
      } else {
        // Upload initial store data to Supabase
        await this.syncToSupabase(storeId);
        this.notifySyncStatus('synced');
        return true;
      }
    } catch (err) {
      console.error('Failed to sync from Supabase:', err);
      this.notifySyncStatus('error');
      return false;
    } finally {
      this.isFetchingFromCloud = false;
    }
  }

  // --- Multi-Store Account Operations ---
  getActiveStoreId(): StoreId {
    return this.activeStoreId;
  }

  getActiveStore(): StoreAccount {
    return STORE_ACCOUNTS.find((s) => s.id === this.activeStoreId) || STORE_ACCOUNTS[0];
  }

  switchStore(storeId: StoreId): StoreAccount {
    const store = STORE_ACCOUNTS.find((s) => s.id === storeId);
    if (!store) throw new Error('Invalid store account');

    this.activeStoreId = storeId;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_PREFIX + 'active_store_id', storeId);
        localStorage.setItem(STORAGE_PREFIX + 'session', JSON.stringify({
          storeId,
          storeName: store.name,
          ownerName: 'MR. Rajendra Gaikwad',
          loggedInAt: new Date().toISOString(),
        }));
      } catch {}
    }

    this.loadStoreData(storeId);
    return store;
  }

  // --- Reset All Data from the Software ---
  async resetAllStoreData(storeId: StoreId = this.activeStoreId, resetBoth: boolean = true): Promise<void> {
    const storesToReset: StoreId[] = resetBoth 
      ? ['sangam-traders', 'sangam-sales-automobiles'] 
      : [storeId];

    for (const sid of storesToReset) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_is_reset`, 'true');
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_invoices`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_products`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_categories`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_customers`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_suppliers`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_purchases`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_payments`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_movements`, JSON.stringify([]));
          localStorage.setItem(`${STORAGE_PREFIX}${sid}_adjustments`, JSON.stringify([]));
          localStorage.removeItem(`${STORAGE_PREFIX}invoices`);
          localStorage.removeItem(`${STORAGE_PREFIX}products`);
          localStorage.removeItem(`${STORAGE_PREFIX}customers`);
        } catch {}
      }

      // If resetting the currently loaded store in memory:
      if (sid === this.activeStoreId) {
        this.invoices = [];
        this.products = [];
        this.categories = [];
        this.customers = [];
        this.suppliers = [];
        this.purchases = [];
        this.payments = [];
        this.stockMovements = [];
        this.stockAdjustments = [];
        this.persistLocal(sid);
      }

      // Upload reset snapshot to Supabase Cloud so sync reflects zero data across devices
      if (isSupabaseConfigured && supabase) {
        try {
          const now = new Date().toISOString();
          const snapshot = {
            storeId: sid,
            settings: this.settings,
            products: [],
            invoices: [],
            customers: [],
            suppliers: [],
            categories: [],
            units: this.units,
            purchases: [],
            payments: [],
            stockMovements: [],
            stockAdjustments: [],
            updatedAt: now,
            isReset: true,
          };

          const { data: existing } = await supabase
            .from('audit_logs')
            .select('id')
            .eq('entity', 'store_sync')
            .eq('action', sid)
            .order('created_at', { ascending: false })
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase
              .from('audit_logs')
              .update({ details: snapshot })
              .eq('id', existing[0].id);
          } else {
            await supabase
              .from('audit_logs')
              .insert({
                entity: 'store_sync',
                action: sid,
                details: snapshot,
              });
          }
        } catch (err) {
          console.error('Failed to sync reset to Supabase:', err);
        }
      }
    }

    this.notify();
    this.notifySyncStatus('synced');
  }

  loginWithMobile(storeId: StoreId, mobile: string, password: string): StoreAccount {
    const store = STORE_ACCOUNTS.find((s) => s.id === storeId);
    if (!store) {
      throw new Error('Store account not found');
    }

    const cleanInputMobile = mobile.replace(/[^0-9]/g, '').slice(-10);
    const cleanStoreMobile = store.mobile.replace(/[^0-9]/g, '').slice(-10);

    // Strict validation: Mobile number must match registered mobile (9766551783)
    if (cleanInputMobile !== cleanStoreMobile) {
      throw new Error('Invalid mobile number. Please enter registered mobile number: 9766551783');
    }

    // Strict validation: Password must match this particular store's password
    const isPasswordValid =
      password === store.defaultPassword ||
      password === store.defaultPassword.toLowerCase();

    if (!isPasswordValid) {
      throw new Error(`Incorrect password for ${store.name}.`);
    }

    return this.switchStore(storeId);
  }

  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const session = localStorage.getItem(STORAGE_PREFIX + 'session');
      return !!session;
    } catch {
      return false;
    }
  }

  logout(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + 'session');
    } catch {}
  }

  // --- Auth & Profile ---
  getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  setCurrentUser(role: 'admin' = 'admin') {
    const user = this.profiles.find((p) => p.role === role) || this.profiles[0];
    this.currentUser = user;
    this.persist('user', user);
    return user;
  }

  getProfiles(): UserProfile[] {
    return this.profiles;
  }

  // --- Settings ---
  getSettings(): BusinessSettings {
    return this.settings;
  }

  updateSettings(data: Partial<BusinessSettings>): BusinessSettings {
    this.settings = {
      ...this.settings,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.persist('settings', this.settings);
    return this.settings;
  }

  // --- Categories & Units ---
  getCategories(): Category[] {
    return this.categories.map((cat) => ({
      ...cat,
      productCount: this.products.filter((p) => p.categoryId === cat.id).length,
    }));
  }

  addCategory(name: string, description?: string): Category {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
    };
    this.categories.unshift(newCat);
    this.persist('categories', this.categories);
    return newCat;
  }

  updateCategory(id: string, name: string, description?: string): Category {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    this.categories[idx] = { ...this.categories[idx], name, description };
    this.persist('categories', this.categories);
    return this.categories[idx];
  }

  deleteCategory(id: string): boolean {
    const inUse = this.products.some((p) => p.categoryId === id);
    if (inUse) throw new Error('Cannot delete category with associated products');
    this.categories = this.categories.filter((c) => c.id !== id);
    this.persist('categories', this.categories);
    return true;
  }

  getUnits(): Unit[] {
    return this.units;
  }

  addUnit(name: string, symbol: string, isFractional: boolean): Unit {
    const newUnit: Unit = {
      id: `unit-${Date.now()}`,
      name,
      symbol,
      isFractional,
      createdAt: new Date().toISOString(),
    };
    this.units.push(newUnit);
    this.persist('units', this.units);
    return newUnit;
  }

  // --- Products ---
  getProducts(): Product[] {
    return this.products.map((p) => {
      const cat = this.categories.find((c) => c.id === p.categoryId);
      const unit = this.units.find((u) => u.id === p.unitId);
      const sup = this.suppliers.find((s) => s.id === p.supplierId);
      return {
        ...p,
        categoryName: cat ? cat.name : p.categoryName || 'General',
        unitSymbol: unit ? unit.symbol : p.unitSymbol || 'pc',
        supplierName: sup ? sup.name : p.supplierName,
        stockStatus: getStockStatus(p.currentStock, p.minStockLevel),
      };
    });
  }

  getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  getProductBySkuOrBarcode(code: string): Product | undefined {
    const clean = code.trim().toLowerCase();
    return this.getProducts().find(
      (p) => p.sku.toLowerCase() === clean || (p.barcode && p.barcode.toLowerCase() === clean)
    );
  }

  addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stockStatus'>): Product {
    // Unique SKU check
    const existingSku = this.products.find(
      (p) => p.sku.toLowerCase() === productData.sku.toLowerCase()
    );
    if (existingSku) {
      throw new Error(`A product with SKU "${productData.sku}" already exists`);
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      stockStatus: getStockStatus(productData.currentStock, productData.minStockLevel),
    };

    this.products.unshift(newProduct);
    this.persist('products', this.products);

    // If opening stock > 0, record opening stock movement
    if (newProduct.currentStock > 0) {
      this.recordStockMovement({
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        transactionType: 'opening_stock',
        quantityChange: newProduct.currentStock,
        previousStock: 0,
        newStock: newProduct.currentStock,
        reason: 'Initial Opening Stock Entry',
      });
    }

    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');

    if (updates.sku && updates.sku.toLowerCase() !== this.products[idx].sku.toLowerCase()) {
      const existing = this.products.find(
        (p) => p.id !== id && p.sku.toLowerCase() === updates.sku!.toLowerCase()
      );
      if (existing) {
        throw new Error(`SKU "${updates.sku}" is already in use by another product`);
      }
    }

    const updated: Product = {
      ...this.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    updated.stockStatus = getStockStatus(updated.currentStock, updated.minStockLevel);

    this.products[idx] = updated;
    this.persist('products', this.products);
    return updated;
  }

  importProductsBulk(
    rawProducts: Array<{
      name: string;
      sku?: string;
      barcode?: string;
      categoryName?: string;
      brand?: string;
      description?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      gstRate?: number;
      unitSymbol?: string;
      currentStock?: number;
      minStockLevel?: number;
    }>,
    updateExisting: boolean = true
  ): {
    addedCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  } {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawProducts.length; i++) {
      const row = rawProducts[i];
      const rowNum = i + 1;

      if (!row.name || !String(row.name).trim()) {
        errors.push(`Row #${rowNum}: Missing product name, skipped.`);
        skippedCount++;
        continue;
      }

      const name = String(row.name).trim();
      let sku = row.sku ? String(row.sku).trim() : '';
      if (!sku) {
        sku = `SKU-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      }

      // 1. Resolve Category
      let categoryId = '';
      let categoryName = '';
      if (row.categoryName && String(row.categoryName).trim()) {
        const catSearch = String(row.categoryName).trim().toLowerCase();
        let cat = this.categories.find((c) => c.name.toLowerCase() === catSearch);
        if (!cat) {
          cat = this.addCategory(String(row.categoryName).trim());
        }
        categoryId = cat.id;
        categoryName = cat.name;
      } else {
        if (this.categories.length > 0) {
          categoryId = this.categories[0].id;
          categoryName = this.categories[0].name;
        } else {
          const generalCat = this.addCategory('General Hardware');
          categoryId = generalCat.id;
          categoryName = generalCat.name;
        }
      }

      // 2. Resolve Unit
      let unitId = '';
      let unitSymbol = 'pc';
      if (row.unitSymbol && String(row.unitSymbol).trim()) {
        const unitSearch = String(row.unitSymbol).trim().toLowerCase();
        let unit = this.units.find(
          (u) => u.symbol.toLowerCase() === unitSearch || u.name.toLowerCase() === unitSearch
        );
        if (!unit) {
          unit = this.addUnit(String(row.unitSymbol).trim(), String(row.unitSymbol).trim(), false);
        }
        unitId = unit.id;
        unitSymbol = unit.symbol;
      } else {
        if (this.units.length > 0) {
          unitId = this.units[0].id;
          unitSymbol = this.units[0].symbol;
        } else {
          const defaultUnit = this.addUnit('Piece', 'pc', false);
          unitId = defaultUnit.id;
          unitSymbol = defaultUnit.symbol;
        }
      }

      const purchasePrice = Math.max(0, Number(row.purchasePrice) || 0);
      const sellingPrice = Math.max(0, Number(row.sellingPrice) || 0);
      const gstRate = [0, 5, 12, 18, 28].includes(Number(row.gstRate))
        ? Number(row.gstRate)
        : Number(row.gstRate) || 18;
      const currentStock = Math.max(0, Number(row.currentStock) || 0);
      const minStockLevel = Math.max(0, Number(row.minStockLevel) || 5);
      const brand = row.brand ? String(row.brand).trim() : undefined;
      const barcode = row.barcode ? String(row.barcode).trim() : undefined;
      const description = row.description ? String(row.description).trim() : undefined;

      // 3. Check if product with this SKU already exists
      const existingProduct = this.products.find(
        (p) => p.sku.toLowerCase() === sku.toLowerCase()
      );

      if (existingProduct) {
        if (updateExisting) {
          const prevStock = existingProduct.currentStock;
          existingProduct.name = name;
          existingProduct.categoryId = categoryId;
          existingProduct.categoryName = categoryName;
          existingProduct.unitId = unitId;
          existingProduct.unitSymbol = unitSymbol;
          existingProduct.purchasePrice = purchasePrice;
          existingProduct.sellingPrice = sellingPrice;
          existingProduct.gstRate = gstRate;
          existingProduct.currentStock = currentStock;
          existingProduct.minStockLevel = minStockLevel;
          if (brand) existingProduct.brand = brand;
          if (barcode) existingProduct.barcode = barcode;
          if (description) existingProduct.description = description;
          existingProduct.stockStatus = getStockStatus(currentStock, minStockLevel);
          existingProduct.updatedAt = new Date().toISOString();

          if (currentStock !== prevStock) {
            this.recordStockMovement({
              productId: existingProduct.id,
              productName: existingProduct.name,
              sku: existingProduct.sku,
              transactionType: 'manual_adjustment',
              quantityChange: +(currentStock - prevStock).toFixed(3),
              previousStock: prevStock,
              newStock: currentStock,
              reason: 'Bulk Excel Import Stock Sync',
            });
          }
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const now = new Date().toISOString();
        const newProduct: Product = {
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          sku,
          barcode,
          categoryId,
          categoryName,
          brand,
          description,
          purchasePrice,
          sellingPrice,
          gstRate,
          unitId,
          unitSymbol,
          currentStock,
          minStockLevel,
          createdAt: now,
          updatedAt: now,
          stockStatus: getStockStatus(currentStock, minStockLevel),
        };

        this.products.unshift(newProduct);

        if (newProduct.currentStock > 0) {
          this.recordStockMovement({
            productId: newProduct.id,
            productName: newProduct.name,
            sku: newProduct.sku,
            transactionType: 'opening_stock',
            quantityChange: newProduct.currentStock,
            previousStock: 0,
            newStock: newProduct.currentStock,
            reason: 'Opening Stock via Excel Import',
          });
        }

        addedCount++;
      }
    }

    this.persist('products', this.products);
    return { addedCount, updatedCount, skippedCount, errors };
  }

  deleteProduct(id: string): boolean {
    // Check if product is in any invoice
    const inInvoice = this.invoices.some((inv) =>
      inv.items?.some((item) => item.productId === id)
    );
    if (inInvoice) {
      throw new Error('Cannot delete product that has existing sales invoice history');
    }

    this.products = this.products.filter((p) => p.id !== id);
    this.persist('products', this.products);
    return true;
  }

  // --- Automatic Stock Movements & Adjustments ---
  getStockMovements(productId?: string): StockMovement[] {
    if (productId) {
      return this.stockMovements.filter((m) => m.productId === productId);
    }
    return [...this.stockMovements].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private recordStockMovement(data: {
    productId: string;
    productName: string;
    sku: string;
    transactionType: StockMovement['transactionType'];
    quantityChange: number;
    previousStock: number;
    newStock: number;
    referenceId?: string;
    referenceNumber?: string;
    reason: string;
  }): StockMovement {
    const movement: StockMovement = {
      id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...data,
      userId: this.currentUser.id,
      userName: this.currentUser.fullName,
      createdAt: new Date().toISOString(),
    };
    this.stockMovements.unshift(movement);
    this.persist('movements', this.stockMovements);
    return movement;
  }

  adjustStock(data: {
    productId: string;
    adjustmentType: StockAdjustment['adjustmentType'];
    quantity: number;
    reason: string;
  }): StockAdjustment {
    const product = this.products.find((p) => p.id === data.productId);
    if (!product) throw new Error('Product not found');
    if (data.quantity <= 0) throw new Error('Adjustment quantity must be greater than zero');

    const previousStock = product.currentStock;
    let quantityChange = 0;

    if (data.adjustmentType === 'add') {
      quantityChange = data.quantity;
    } else {
      // reduce, damage, lost, physical_correction (downward)
      quantityChange = -data.quantity;
      if (previousStock < data.quantity && !this.settings.allowNegativeStock) {
        throw new Error(
          `Insufficient stock to reduce. Current stock: ${previousStock}, Requested reduction: ${data.quantity}`
        );
      }
    }

    const newStock = previousStock + quantityChange;
    product.currentStock = newStock;
    product.stockStatus = getStockStatus(newStock, product.minStockLevel);
    product.updatedAt = new Date().toISOString();
    this.persist('products', this.products);

    const adjNumber = `ADJ-${Date.now().toString().slice(-6)}`;
    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      adjustmentNumber: adjNumber,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      adjustmentType: data.adjustmentType,
      quantity: data.quantity,
      previousStock,
      newStock,
      reason: data.reason,
      createdBy: this.currentUser.id,
      createdByName: this.currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    this.stockAdjustments.unshift(adjustment);
    this.persist('adjustments', this.stockAdjustments);

    this.recordStockMovement({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      transactionType: data.adjustmentType === 'damage' ? 'damaged_stock' : 'manual_adjustment',
      quantityChange,
      previousStock,
      newStock,
      referenceId: adjustment.id,
      referenceNumber: adjNumber,
      reason: `Manual Stock Adjustment (${data.adjustmentType}): ${data.reason}`,
    });

    return adjustment;
  }

  getStockAdjustments(): StockAdjustment[] {
    return [...this.stockAdjustments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Invoicing & Billing POS ---
  getInvoices(): Invoice[] {
    return [...this.invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find((inv) => inv.id === id || inv.invoiceNumber === id);
  }

  generateNextInvoiceNumber(): string {
    const num = this.settings.nextInvoiceNumber || 1001;
    return `${this.settings.invoicePrefix || 'SS-INV-'}${num}`;
  }

  // ATOMIC BILL FINALIZATION WITH STOCK DEDUCTION
  finalizeInvoice(
    invoiceData: Omit<
      Invoice,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'invoiceNumber' | 'invoiceDate' | 'balanceDue' | 'createdBy'
    > & {
      invoiceNumber?: string;
      invoiceDate?: string;
      balanceDue?: number;
      createdBy?: string;
    }
  ): Invoice {
    const invoiceNum = invoiceData.invoiceNumber || this.generateNextInvoiceNumber();

    // 1. Idempotency Check: prevent duplicate submission
    const existing = this.invoices.find((i) => i.invoiceNumber === invoiceNum);
    if (existing) {
      throw new Error(`Invoice with number ${invoiceNum} has already been created`);
    }

    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new Error('Cannot finalize an invoice without items');
    }

    // 2. Validate product availability and stock sufficiency
    for (const item of invoiceData.items) {
      const product = this.products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product "${item.productName}" (SKU: ${item.sku}) was not found in catalog`);
      }
      if (product.currentStock < item.quantity && !this.settings.allowNegativeStock) {
        throw new Error(
          `Insufficient stock for "${product.name}" (${product.sku}). Available: ${product.currentStock}, Requested: ${item.quantity}`
        );
      }
    }

    // 3. Perform atomic stock deduction and ledger logging
    for (const item of invoiceData.items) {
      const product = this.products.find((p) => p.id === item.productId)!;
      const prevStock = product.currentStock;
      const newStock = +(prevStock - item.quantity).toFixed(3);

      product.currentStock = newStock;
      product.stockStatus = getStockStatus(newStock, product.minStockLevel);
      product.updatedAt = new Date().toISOString();

      this.recordStockMovement({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        transactionType: 'sale',
        quantityChange: -item.quantity,
        previousStock: prevStock,
        newStock,
        referenceNumber: invoiceNum,
        reason: `Sale Invoice ${invoiceNum} to ${invoiceData.customerName}`,
      });
    }

    this.persist('products', this.products);

    // 4. Create and save invoice
    const now = new Date().toISOString();
    const initialAmountPaid = invoiceData.amountPaid || 0;

    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      invoiceNumber: invoiceNum,
      invoiceDate: invoiceData.invoiceDate || now,
      amountPaid: 0,
      balanceDue: invoiceData.grandTotal,
      paymentStatus: 'unpaid',
      status: 'finalized',
      createdBy: this.currentUser.id,
      createdByName: this.currentUser.fullName,
      createdAt: now,
      updatedAt: now,
      items: invoiceData.items.map((item, idx) => ({
        ...item,
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        invoiceId: invoiceNum,
      })),
    };

    this.invoices.unshift(newInvoice);
    this.persist('invoices', this.invoices);

    // 5. Increment next invoice number
    this.settings.nextInvoiceNumber = (this.settings.nextInvoiceNumber || 1000) + 1;
    this.persist('settings', this.settings);

    // 6. Record payment if initialAmountPaid > 0
    if (initialAmountPaid > 0) {
      this.recordPayment({
        referenceType: 'invoice',
        referenceId: newInvoice.id,
        referenceNumber: newInvoice.invoiceNumber,
        partyType: 'customer',
        partyId: newInvoice.customerId || 'walk-in',
        partyName: newInvoice.customerName,
        amount: initialAmountPaid,
        paymentMethod: newInvoice.paymentMethod,
        notes: `Initial payment for invoice ${newInvoice.invoiceNumber}`,
      });
    }

    // 7. Update Customer Statistics if customer is registered
    if (newInvoice.customerId) {
      const cust = this.customers.find((c) => c.id === newInvoice.customerId);
      if (cust) {
        cust.totalPurchases = +(cust.totalPurchases + newInvoice.grandTotal).toFixed(2);
        cust.outstandingBalance = +(cust.outstandingBalance + newInvoice.balanceDue).toFixed(2);
        cust.updatedAt = now;
        this.persist('customers', this.customers);
      }
    }

    return newInvoice;
  }

  // CANCEL INVOICE & REVERSE STOCK DEDUCTION
  cancelInvoice(invoiceId: string, reason: string): Invoice {
    const invoice = this.invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'cancelled') {
      throw new Error('This invoice has already been cancelled');
    }

    // 1. Restore stock and record sale_return movement
    if (invoice.items) {
      for (const item of invoice.items) {
        const product = this.products.find((p) => p.id === item.productId);
        if (product) {
          const prevStock = product.currentStock;
          const newStock = +(prevStock + item.quantity).toFixed(3);
          product.currentStock = newStock;
          product.stockStatus = getStockStatus(newStock, product.minStockLevel);
          product.updatedAt = new Date().toISOString();

          this.recordStockMovement({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            transactionType: 'sale_return',
            quantityChange: item.quantity,
            previousStock: prevStock,
            newStock,
            referenceId: invoice.id,
            referenceNumber: invoice.invoiceNumber,
            reason: `Invoice Cancellation Reversal: ${reason || 'Customer returned/cancelled'}`,
          });
        }
      }
      this.persist('products', this.products);
    }

    // 2. Adjust customer balance
    if (invoice.customerId) {
      const cust = this.customers.find((c) => c.id === invoice.customerId);
      if (cust) {
        cust.totalPurchases = Math.max(0, +(cust.totalPurchases - invoice.grandTotal).toFixed(2));
        cust.outstandingBalance = Math.max(0, +(cust.outstandingBalance - invoice.balanceDue).toFixed(2));
        cust.updatedAt = new Date().toISOString();
        this.persist('customers', this.customers);
      }
    }

    // 3. Mark invoice cancelled
    invoice.status = 'cancelled';
    invoice.paymentStatus = 'refunded';
    invoice.updatedAt = new Date().toISOString();
    invoice.notes = `${invoice.notes ? invoice.notes + ' | ' : ''}CANCELLED: ${reason}`;
    this.persist('invoices', this.invoices);

    return invoice;
  }

  // --- Purchases & Receiving Inventory ---
  getPurchases(): Purchase[] {
    return [...this.purchases].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getPurchaseById(id: string): Purchase | undefined {
    return this.purchases.find((p) => p.id === id || p.purchaseNumber === id);
  }

  createPurchase(
    purchaseData: Omit<
      Purchase,
      'id' | 'createdAt' | 'updatedAt' | 'purchaseNumber' | 'createdBy'
    > & { createdBy?: string }
  ): Purchase {
    const purchaseNum = `PO-${new Date().getFullYear()}-${(this.purchases.length + 1).toString().padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newPurchaseId = `pur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Auto-create or update products entered in this purchase bill
    let productsUpdated = false;
    const processedItems = (purchaseData.items || []).map((item, idx) => {
      // 1. Check if product already exists by ID, name, or SKU
      let product = item.productId
        ? this.products.find((p) => p.id === item.productId)
        : undefined;

      if (!product && item.productName) {
        const cleanName = item.productName.trim().toLowerCase();
        product = this.products.find(
          (p) =>
            p.name.trim().toLowerCase() === cleanName ||
            (item.sku && p.sku.toLowerCase() === item.sku.trim().toLowerCase())
        );
      }

      if (product) {
        // Update product prices and metadata from this purchase
        product.purchasePrice = item.purchaseRate;
        if (item.sellingPrice && item.sellingPrice > 0) {
          product.sellingPrice = item.sellingPrice;
        }
        if (item.hsnCode && !product.hsnCode) {
          product.hsnCode = item.hsnCode;
        }
        if (item.partNo && !product.partNo) {
          product.partNo = item.partNo;
        }
        product.updatedAt = now;
        productsUpdated = true;

        return {
          ...item,
          id: `pi-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          purchaseId: newPurchaseId,
          productId: product.id,
          sku: product.sku,
          productName: product.name,
        };
      } else {
        // Auto-create brand new product in store catalog!
        const storePrefix = this.activeStoreId === 'sangam-traders' ? 'ST' : 'SSA';
        const generatedSku =
          item.sku && !this.products.some((p) => p.sku.toLowerCase() === item.sku.toLowerCase())
            ? item.sku
            : `${storePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

        const matchedUnit =
          this.units.find(
            (u) =>
              u.symbol.toLowerCase() === (item.unit || '').trim().toLowerCase() ||
              u.name.toLowerCase() === (item.unit || '').trim().toLowerCase()
          ) || this.units[0];

        const defaultCategory = this.categories[0];
        const sellingPrice =
          item.sellingPrice && item.sellingPrice > 0
            ? item.sellingPrice
            : +(item.purchaseRate * 1.25).toFixed(2);

        const newProduct: Product = {
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: item.productName.trim(),
          sku: generatedSku,
          hsnCode: item.hsnCode?.trim() || undefined,
          partNo: item.partNo?.trim() || undefined,
          categoryId: defaultCategory?.id || 'cat-hardware',
          categoryName: defaultCategory?.name || 'General Hardware',
          purchasePrice: item.purchaseRate,
          sellingPrice,
          gstRate: item.taxRate ?? 18,
          unitId: matchedUnit?.id || 'unit-pc',
          unitSymbol: item.unit || matchedUnit?.symbol || 'pc',
          currentStock: 0, // stock will be received below if status is received
          minStockLevel: 5,
          supplierId: purchaseData.supplierId,
          supplierName: purchaseData.supplierName,
          createdAt: now,
          updatedAt: now,
          stockStatus: 'out_of_stock',
        };

        this.products.unshift(newProduct);
        productsUpdated = true;

        return {
          ...item,
          id: `pi-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          purchaseId: newPurchaseId,
          productId: newProduct.id,
          sku: newProduct.sku,
          productName: newProduct.name,
          isNewProduct: true,
        };
      }
    });

    if (productsUpdated) {
      this.persist('products', this.products);
    }

    // Auto-calculate CGST / SGST if not explicitly provided
    const isInterState = Boolean(
      purchaseData.supplierState &&
      purchaseData.supplierState.trim().toLowerCase() !== 'maharashtra'
    );
    let cgstAmount = purchaseData.cgstAmount;
    let sgstAmount = purchaseData.sgstAmount;
    let igstAmount = purchaseData.igstAmount;

    if (cgstAmount === undefined && sgstAmount === undefined && igstAmount === undefined) {
      if (isInterState) {
        igstAmount = purchaseData.taxAmount;
        cgstAmount = 0;
        sgstAmount = 0;
      } else {
        cgstAmount = +(purchaseData.taxAmount / 2).toFixed(2);
        sgstAmount = +(purchaseData.taxAmount / 2).toFixed(2);
        igstAmount = 0;
      }
    }

    const unroundedTotal = +(purchaseData.subtotal - (purchaseData.discountAmount || 0) + purchaseData.taxAmount).toFixed(2);
    const roundOff =
      purchaseData.roundOff !== undefined
        ? purchaseData.roundOff
        : +(purchaseData.totalAmount - unroundedTotal).toFixed(2);

    const newPurchase: Purchase = {
      ...purchaseData,
      id: newPurchaseId,
      purchaseNumber: purchaseNum,
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundOff,
      createdBy: this.currentUser.id,
      createdByName: this.currentUser.fullName,
      createdAt: now,
      updatedAt: now,
      items: processedItems,
    };

    this.purchases.unshift(newPurchase);
    this.persist('purchases', this.purchases);

    // If created with status 'received', immediately add stock
    if (newPurchase.status === 'received') {
      this.receivePurchase(newPurchase.id);
    }

    return newPurchase;
  }

  receivePurchase(purchaseId: string): Purchase {
    const purchase = this.purchases.find((p) => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase not found');
    if (purchase.status === 'received') {
      throw new Error('This purchase has already been received');
    }

    // Add stock for each item
    if (purchase.items) {
      for (const item of purchase.items) {
        const product = this.products.find((p) => p.id === item.productId);
        if (product) {
          const prevStock = product.currentStock;
          const newStock = +(prevStock + item.quantity).toFixed(3);
          product.currentStock = newStock;
          product.stockStatus = getStockStatus(newStock, product.minStockLevel);
          product.updatedAt = new Date().toISOString();

          this.recordStockMovement({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            transactionType: 'purchase',
            quantityChange: item.quantity,
            previousStock: prevStock,
            newStock,
            referenceId: purchase.id,
            referenceNumber: purchase.purchaseNumber,
            reason: `Purchase Received: ${purchase.purchaseNumber} from ${purchase.supplierName}`,
          });
        }
      }
      this.persist('products', this.products);
    }

    // Update supplier statistics
    const supplier = this.suppliers.find((s) => s.id === purchase.supplierId);
    if (supplier) {
      supplier.totalPurchased = +( (supplier.totalPurchased || 0) + purchase.totalAmount ).toFixed(2);
      supplier.outstandingBalance = +( (supplier.outstandingBalance || 0) + purchase.balanceDue ).toFixed(2);
      supplier.updatedAt = new Date().toISOString();
      this.persist('suppliers', this.suppliers);
    }

    purchase.status = 'received';
    purchase.updatedAt = new Date().toISOString();
    this.persist('purchases', this.purchases);

    return purchase;
  }

  deletePurchase(purchaseId: string, revertStock: boolean = true): boolean {
    const purchaseIdx = this.purchases.findIndex(
      (p) => p.id === purchaseId || p.purchaseNumber === purchaseId
    );
    if (purchaseIdx === -1) throw new Error('Purchase order not found');
    const purchase = this.purchases[purchaseIdx];

    // Revert stock if purchase was received
    if (revertStock && purchase.status === 'received' && purchase.items) {
      for (const item of purchase.items) {
        const product = this.products.find((p) => p.id === item.productId);
        if (product) {
          const prevStock = product.currentStock;
          const newStock = Math.max(0, +(prevStock - item.quantity).toFixed(3));
          product.currentStock = newStock;
          product.stockStatus = getStockStatus(newStock, product.minStockLevel);
          product.updatedAt = new Date().toISOString();

          this.recordStockMovement({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            transactionType: 'purchase_return',
            quantityChange: -item.quantity,
            previousStock: prevStock,
            newStock,
            referenceId: purchase.id,
            referenceNumber: purchase.purchaseNumber,
            reason: `Purchase Deleted / Reverted: ${purchase.purchaseNumber}`,
          });
        }
      }
      this.persist('products', this.products);
    }

    // Revert supplier balance & total purchased
    const supplier = this.suppliers.find((s) => s.id === purchase.supplierId);
    if (supplier) {
      supplier.totalPurchased = Math.max(
        0,
        +((supplier.totalPurchased || 0) - purchase.totalAmount).toFixed(2)
      );
      supplier.outstandingBalance = Math.max(
        0,
        +((supplier.outstandingBalance || 0) - purchase.balanceDue).toFixed(2)
      );
      supplier.updatedAt = new Date().toISOString();
      this.persist('suppliers', this.suppliers);
    }

    // Remove from purchases list
    this.purchases.splice(purchaseIdx, 1);
    this.persist('purchases', this.purchases);
    return true;
  }

  // --- Customers & Suppliers ---
  getCustomers(): Customer[] {
    return this.customers;
  }

  getCustomerById(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  addCustomer(customerData: Omit<Customer, 'id' | 'totalPurchases' | 'outstandingBalance' | 'createdAt'>): Customer {
    const existing = this.customers.find((c) => c.mobile === customerData.mobile);
    if (existing) {
      throw new Error(`Customer with mobile ${customerData.mobile} already exists`);
    }

    const newCust: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      totalPurchases: 0,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    this.customers.unshift(newCust);
    this.persist('customers', this.customers);
    return newCust;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Customer not found');
    this.customers[idx] = {
      ...this.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist('customers', this.customers);
    return this.customers[idx];
  }

  getSuppliers(): Supplier[] {
    return this.suppliers;
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.suppliers.find((s) => s.id === id);
  }

  addSupplier(data: Omit<Supplier, 'id' | 'totalPurchased' | 'outstandingBalance' | 'createdAt'>): Supplier {
    const newSup: Supplier = {
      ...data,
      id: `sup-${Date.now()}`,
      totalPurchased: 0,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    this.suppliers.unshift(newSup);
    this.persist('suppliers', this.suppliers);
    return newSup;
  }

  updateSupplier(id: string, updates: Partial<Supplier>): Supplier {
    const idx = this.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Supplier not found');
    this.suppliers[idx] = {
      ...this.suppliers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist('suppliers', this.suppliers);
    return this.suppliers[idx];
  }

  // --- Payments ---
  getPayments(): Payment[] {
    return [...this.payments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  recordPayment(data: {
    referenceType: Payment['referenceType'];
    referenceId: string;
    referenceNumber: string;
    partyType: Payment['partyType'];
    partyId: string;
    partyName: string;
    amount: number;
    paymentMethod: Payment['paymentMethod'];
    notes?: string;
  }): Payment {
    if (data.amount <= 0) throw new Error('Payment amount must be greater than zero');

    const paymentNum = `PAY-${Date.now().toString().slice(-6)}`;
    const payment: Payment = {
      id: `pay-${Date.now()}`,
      paymentNumber: paymentNum,
      ...data,
      paymentDate: new Date().toISOString(),
      createdBy: this.currentUser.id,
      createdAt: new Date().toISOString(),
    };

    this.payments.unshift(payment);
    this.persist('payments', this.payments);

    // If linked to an invoice, reduce balanceDue and update payment status
    if (data.referenceType === 'invoice') {
      const invoice = this.invoices.find((i) => i.id === data.referenceId || i.invoiceNumber === data.referenceNumber);
      if (invoice) {
        invoice.amountPaid = +(invoice.amountPaid + data.amount).toFixed(2);
        invoice.balanceDue = Math.max(0, +(invoice.grandTotal - invoice.amountPaid).toFixed(2));
        if (invoice.balanceDue <= 0) {
          invoice.paymentStatus = 'paid';
        } else {
          invoice.paymentStatus = 'partially_paid';
        }
        invoice.updatedAt = new Date().toISOString();
        this.persist('invoices', this.invoices);

        // Also adjust customer outstanding balance
        if (invoice.customerId) {
          const cust = this.customers.find((c) => c.id === invoice.customerId);
          if (cust) {
            cust.outstandingBalance = Math.max(0, +(cust.outstandingBalance - data.amount).toFixed(2));
            cust.updatedAt = new Date().toISOString();
            this.persist('customers', this.customers);
          }
        }
      }
    }

    // If linked to a purchase, reduce supplier balance
    if (data.referenceType === 'purchase') {
      const purchase = this.purchases.find((p) => p.id === data.referenceId || p.purchaseNumber === data.referenceNumber);
      if (purchase) {
        purchase.amountPaid = +(purchase.amountPaid + data.amount).toFixed(2);
        purchase.balanceDue = Math.max(0, +(purchase.totalAmount - purchase.amountPaid).toFixed(2));
        if (purchase.balanceDue <= 0) {
          purchase.paymentStatus = 'paid';
        } else {
          purchase.paymentStatus = 'partially_paid';
        }
        purchase.updatedAt = new Date().toISOString();
        this.persist('purchases', this.purchases);

        // Adjust supplier outstanding
        const sup = this.suppliers.find((s) => s.id === purchase.supplierId);
        if (sup) {
          sup.outstandingBalance = Math.max(0, +((sup.outstandingBalance || 0) - data.amount).toFixed(2));
          sup.updatedAt = new Date().toISOString();
          this.persist('suppliers', this.suppliers);
        }
      }
    }

    return payment;
  }

  // --- Real-time Dashboard Analytics & Reporting ---
  getDashboardStats(): DashboardStats {
    const products = this.getProducts();
    const finalizedInvoices = this.invoices.filter((i) => i.status === 'finalized');
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);

    // Today's sales
    const todaysInvoices = finalizedInvoices.filter((i) => i.invoiceDate.startsWith(today));
    const todaysSales = todaysInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

    // Monthly sales
    const monthlyInvoices = finalizedInvoices.filter((i) => i.invoiceDate.startsWith(thisMonth));
    const monthlySales = monthlyInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

    // Total Inventory Value
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
    const totalStockItems = products.reduce((sum, p) => sum + p.currentStock, 0);

    // Outstanding balances
    const totalCustomerOutstanding = this.customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
    const totalSupplierOutstanding = this.suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

    // Low stock count
    const lowStockProducts = products.filter((p) => p.currentStock <= p.minStockLevel);

    // Daily Sales Trend (Past 7 days)
    const dailyMap = new Map<string, { amount: number; bills: number }>();
    for (let d = 6; d >= 0; d--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      const key = dt.toISOString().slice(0, 10);
      dailyMap.set(key, { amount: 0, bills: 0 });
    }

    finalizedInvoices.forEach((inv) => {
      const dayKey = inv.invoiceDate.slice(0, 10);
      if (dailyMap.has(dayKey)) {
        const current = dailyMap.get(dayKey)!;
        current.amount += inv.grandTotal;
        current.bills += 1;
      }
    });

    const dailySalesTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      amount: data.amount,
      bills: data.bills,
    }));

    // Sales by Category
    const catMap = new Map<string, { amount: number; count: number }>();
    finalizedInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const catName = prod?.categoryName || 'General';
        const cur = catMap.get(catName) || { amount: 0, count: 0 };
        cur.amount += item.totalPrice;
        cur.count += item.quantity;
        catMap.set(catName, cur);
      });
    });

    const categorySales = Array.from(catMap.entries()).map(([category, d]) => ({
      category,
      amount: +d.amount.toFixed(2),
      count: +d.count.toFixed(1),
    }));

    // Top Selling Products
    const prodSalesMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
    finalizedInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        const cur = prodSalesMap.get(item.productId) || {
          id: item.productId,
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
        cur.quantity += item.quantity;
        cur.revenue += item.totalPrice;
        prodSalesMap.set(item.productId, cur);
      });
    });

    const topSellingProducts = Array.from(prodSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalProducts: products.length,
      totalStockItems: +totalStockItems.toFixed(2),
      todaysSales: +todaysSales.toFixed(2),
      monthlySales: +monthlySales.toFixed(2),
      todaysBillsCount: todaysInvoices.length,
      lowStockCount: lowStockProducts.length,
      totalInventoryValue: +totalInventoryValue.toFixed(2),
      totalCustomerOutstanding: +totalCustomerOutstanding.toFixed(2),
      totalSupplierOutstanding: +totalSupplierOutstanding.toFixed(2),
      dailySalesTrend,
      categorySales,
      topSellingProducts,
      recentInvoices: finalizedInvoices.slice(0, 5),
      lowStockProducts: lowStockProducts.slice(0, 6),
      recentPurchases: this.purchases.slice(0, 5),
      recentMovements: this.stockMovements.slice(0, 6),
    };
  }

  // --- Reset to Demo Seed Data if user requests ---
  resetToDemoData() {
    this.settings = { ...INITIAL_SETTINGS };
    this.categories = [...INITIAL_CATEGORIES];
    this.units = [...INITIAL_UNITS];
    this.products = [...INITIAL_PRODUCTS];
    this.customers = [...INITIAL_CUSTOMERS];
    this.suppliers = [...INITIAL_SUPPLIERS];
    this.invoices = [...INITIAL_INVOICES];
    this.purchases = [...INITIAL_PURCHASES];
    this.payments = [...INITIAL_PAYMENTS];
    this.stockMovements = [...INITIAL_STOCK_MOVEMENTS];
    this.stockAdjustments = [];
    this.currentUser = INITIAL_PROFILES[0];

    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  }
}

// Singleton store instance
export const storeService = new StoreService();
