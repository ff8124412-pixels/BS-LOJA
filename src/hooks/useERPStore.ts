import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Product, Customer, Supplier, Sale, Invoice,
  FinancialEntry, StockMovement, AuditLog, Backup, User,
  Quote, Commission, SalesGoal, Purchase, Notification, SaleItem, QuoteItem, PurchaseItem
} from '@/types/erp';

// ─── Auth ───────────────────────────────────────────────────────────
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

const INITIAL_AUTH: AuthState = { isAuthenticated: false, user: null };

// ─── DB row → App type mappers ───────────────────────────────────────────────
function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    sku: row.sku as string,
    name: row.name as string,
    description: row.description as string | undefined,
    ncm: row.ncm as string | undefined,
    unit: row.unit as string,
    brand: row.brand as string | undefined,
    category: row.category as string,
    price: Number(row.price),
    cost: Number(row.cost),
    quantity: Number(row.quantity),
    minQuantity: Number(row.min_quantity),
    barcode: row.barcode as string | undefined,
    warehouse: row.warehouse as string | undefined,
    status: row.status as 'Ativo' | 'Inativo',
    image: row.image as string | undefined,
    m2Coverage: row.m2_coverage != null ? Number(row.m2_coverage) : null,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleDateString('pt-BR') : '',
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    type: row.type as 'PF' | 'PJ',
    name: row.name as string,
    document: row.document as string,
    email: row.email as string,
    phone: row.phone as string,
    address: row.address as string | undefined,
    city: row.city as string,
    state: row.state as string,
    creditLimit: Number(row.credit_limit),
    balance: Number(row.balance),
    status: row.status as 'Adimplente' | 'Inadimplente',
    totalPurchases: Number(row.total_purchases),
    lastPurchase: row.last_purchase as string | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleDateString('pt-BR') : '',
  };
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    name: row.name as string,
    document: row.document as string,
    email: row.email as string,
    phone: row.phone as string,
    category: row.category as string,
    city: row.city as string,
    state: row.state as string,
    balance: Number(row.balance),
    status: row.status as 'Ativo' | 'Inativo',
    lastOrder: row.last_order as string | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleDateString('pt-BR') : '',
  };
}

function mapSale(row: Record<string, unknown>, items: SaleItem[]): Sale {
  return {
    id: row.id as string,
    customerId: row.customer_id as string | undefined,
    customerName: row.customer_name as string,
    items,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    payment: row.payment as string,
    payments: row.payments as Sale['payments'],
    notes: row.notes as string | undefined,
    status: row.status as Sale['status'],
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    nfeNumber: row.nfe_number as string | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleDateString('pt-BR') : '',
  };
}

function mapSaleItem(row: Record<string, unknown>): SaleItem {
  return {
    productId: row.product_id as string,
    productName: row.product_name as string,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
  };
}

function mapQuote(row: Record<string, unknown>, items: QuoteItem[]): Quote {
  return {
    id: row.id as string,
    number: row.number as string,
    customerId: row.customer_id as string | undefined,
    customerName: row.customer_name as string,
    customerEmail: row.customer_email as string | undefined,
    customerPhone: row.customer_phone as string | undefined,
    items,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    notes: row.notes as string | undefined,
    validUntil: row.valid_until as string,
    status: row.status as Quote['status'],
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleDateString('pt-BR') : '',
  };
}

function mapQuoteItem(row: Record<string, unknown>): QuoteItem {
  return {
    productId: row.product_id as string,
    productName: row.product_name as string,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    unit: row.unit as string | undefined,
    m2Area: row.m2_area != null ? Number(row.m2_area) : undefined,
    m2Coverage: row.m2_coverage != null ? Number(row.m2_coverage) : undefined,
  };
}

function mapPurchase(row: Record<string, unknown>, items: PurchaseItem[]): Purchase {
  return {
    id: row.id as string,
    number: row.number as string,
    supplierId: row.supplier_id as string,
    supplierName: row.supplier_name as string,
    items,
    subtotal: Number(row.subtotal),
    freight: Number(row.freight),
    total: Number(row.total),
    payment: row.payment as string,
    expectedAt: row.expected_at as string,
    receivedAt: row.received_at as string | undefined,
    notes: row.notes as string | undefined,
    status: row.status as Purchase['status'],
    buyerId: row.buyer_id as string,
    buyerName: row.buyer_name as string,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleDateString('pt-BR') : '',
  };
}

function mapPurchaseItem(row: Record<string, unknown>): PurchaseItem {
  return {
    productId: row.product_id as string,
    productName: row.product_name as string,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    total: Number(row.total),
  };
}

function mapFinancialEntry(row: Record<string, unknown>): FinancialEntry {
  return {
    id: row.id as string,
    type: row.type as 'Receita' | 'Despesa',
    category: row.category as string,
    description: row.description as string,
    value: Number(row.value),
    dueDate: row.due_date as string,
    paidAt: row.paid_at as string | undefined,
    status: row.status as FinancialEntry['status'],
    entityName: row.entity_name as string,
  };
}

function mapStockMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    productName: row.product_name as string,
    type: row.type as StockMovement['type'],
    quantity: Number(row.quantity),
    reason: row.reason as string,
    warehouse: row.warehouse as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleString('pt-BR') : '',
  };
}

function mapCommission(row: Record<string, unknown>): Commission {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    saleId: row.sale_id as string,
    saleTotal: Number(row.sale_total),
    rate: Number(row.rate),
    value: Number(row.value),
    status: row.status as Commission['status'],
    period: row.period as string,
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleDateString('pt-BR') : '',
  };
}

function mapSalesGoal(row: Record<string, unknown>): SalesGoal {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    period: row.period as string,
    targetRevenue: Number(row.target_revenue),
    targetSales: Number(row.target_sales),
    currentRevenue: Number(row.current_revenue),
    currentSales: Number(row.current_sales),
    status: row.status as SalesGoal['status'],
  };
}

function mapAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    action: row.action as string,
    module: row.module as string,
    ip: row.ip as string,
    type: row.type as AuditLog['type'],
    createdAt: row.created_at ? new Date(row.created_at as string).toLocaleString('pt-BR') : '',
  };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    number: row.number as string,
    type: row.type as 'NF-e' | 'NFC-e',
    customerId: row.customer_id as string | undefined,
    customerName: row.customer_name as string,
    customerDocument: row.customer_document as string,
    value: Number(row.value),
    status: row.status as 'Emitida' | 'Cancelada' | 'Pendente',
    saleId: row.sale_id as string | undefined,
    issuedAt: row.issued_at ? new Date(row.issued_at as string).toLocaleDateString('pt-BR') : '',
  };
}

// ─── Store ──────────────────────────────────────────────────────────
export function useERPStore() {
  const [auth, setAuth] = useState<AuthState>(INITIAL_AUTH);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receivables, setReceivables] = useState<FinancialEntry[]>([]);
  const [payables, setPayables] = useState<FinancialEntry[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [salesGoals, setSalesGoals] = useState<SalesGoal[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep refs to avoid dependency issues
  const productsRef = useRef<Product[]>([]);
  const customersRef = useRef<Customer[]>([]);
  const purchasesRef = useRef<Purchase[]>([]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    purchasesRef.current = purchases;
  }, [purchases]);

  // ─── Load all data from Supabase ─────────────────────────────────────────
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Load users from system_users
      const { data: usersData } = await supabase.functions.invoke('erp-auth', {
        body: { action: 'list_users' },
      });
      if (usersData?.users) {
        setUsers(usersData.users.map((u: Record<string, unknown>) => ({
          id: u.id as string,
          name: u.name as string,
          email: u.email as string,
          role: u.role as string,
          avatar: u.avatar as string,
          status: u.status as 'Ativo' | 'Inativo',
          lastLogin: u.last_login ? new Date(u.last_login as string).toLocaleString('pt-BR') : undefined,
        })));
      }

      const [
        { data: prodData },
        { data: custData },
        { data: suppData },
        { data: salesData },
        { data: saleItemsData },
        { data: quotesData },
        { data: quoteItemsData },
        { data: purchasesData },
        { data: purchaseItemsData },
        { data: finData },
        { data: stockData },
        { data: commData },
        { data: goalsData },
        { data: auditData },
        { data: invoicesData },
      ] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('sale_items').select('*').limit(500),
        supabase.from('quotes').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('quote_items').select('*').limit(200),
        supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('purchase_items').select('*').limit(200),
        supabase.from('financial_entries').select('*').order('due_date', { ascending: true }).limit(100),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('commissions').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('sales_goals').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('invoices').select('*').order('issued_at', { ascending: false }).limit(100),
      ]);

      const mappedProducts = (prodData || []).map(r => mapProduct(r as Record<string, unknown>));
      setProducts(mappedProducts);
      setCustomers((custData || []).map(r => mapCustomer(r as Record<string, unknown>)));
      setSuppliers((suppData || []).map(r => mapSupplier(r as Record<string, unknown>)));

      const saleItemsMap: Record<string, SaleItem[]> = {};
      (saleItemsData || []).forEach(r => {
        const row = r as Record<string, unknown>;
        const sid = row.sale_id as string;
        if (!saleItemsMap[sid]) saleItemsMap[sid] = [];
        saleItemsMap[sid].push(mapSaleItem(row));
      });
      const mappedSales = (salesData || []).map(r => {
        const row = r as Record<string, unknown>;
        return mapSale(row, saleItemsMap[row.id as string] || []);
      });
      setSales(mappedSales);

      const quoteItemsMap: Record<string, QuoteItem[]> = {};
      (quoteItemsData || []).forEach(r => {
        const row = r as Record<string, unknown>;
        const qid = row.quote_id as string;
        if (!quoteItemsMap[qid]) quoteItemsMap[qid] = [];
        quoteItemsMap[qid].push(mapQuoteItem(row));
      });
      setQuotes((quotesData || []).map(r => {
        const row = r as Record<string, unknown>;
        return mapQuote(row, quoteItemsMap[row.id as string] || []);
      }));

      const purchaseItemsMap: Record<string, PurchaseItem[]> = {};
      (purchaseItemsData || []).forEach(r => {
        const row = r as Record<string, unknown>;
        const pid = row.purchase_id as string;
        if (!purchaseItemsMap[pid]) purchaseItemsMap[pid] = [];
        purchaseItemsMap[pid].push(mapPurchaseItem(row));
      });
      setPurchases((purchasesData || []).map(r => {
        const row = r as Record<string, unknown>;
        return mapPurchase(row, purchaseItemsMap[row.id as string] || []);
      }));

      const allFinancial = (finData || []).map(r => mapFinancialEntry(r as Record<string, unknown>));
      setReceivables(allFinancial.filter(f => f.type === 'Receita'));
      setPayables(allFinancial.filter(f => f.type === 'Despesa'));

      setStockMovements((stockData || []).map(r => mapStockMovement(r as Record<string, unknown>)));
      setCommissions((commData || []).map(r => mapCommission(r as Record<string, unknown>)));
      setSalesGoals((goalsData || []).map(r => mapSalesGoal(r as Record<string, unknown>)));
      setAuditLogs((auditData || []).map(r => mapAuditLog(r as Record<string, unknown>)));

      setInvoices((invoicesData || []).map(r => mapInvoice(r as Record<string, unknown>)));

      const notifs: Notification[] = [];
      const now = new Date().toLocaleString('pt-BR');
      mappedProducts.filter(p => p.quantity <= p.minQuantity && p.status === 'Ativo').slice(0, 3).forEach(p => {
        notifs.push({ id: crypto.randomUUID(), title: 'Estoque Crítico', message: `${p.name} com apenas ${p.quantity} ${p.unit} (mín: ${p.minQuantity})`, type: 'warning', read: false, link: '/inventory', createdAt: now });
      });
      mappedSales.filter(s => s.status === 'Pendente').slice(0, 2).forEach(s => {
        notifs.push({ id: crypto.randomUUID(), title: 'Venda Pendente', message: `Pedido de ${s.customerName} — R$ ${s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, type: 'info', read: false, link: '/sales', createdAt: now });
      });
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ─── Auth ──────────────────────────────────────────────────────────
  const login = useCallback(async (user: User) => {
    setAuth({ isAuthenticated: true, user });
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: user.name,
        action: 'Login realizado com sucesso',
        module: 'Autenticação',
        ip: '192.168.1.' + Math.floor(Math.random() * 50 + 10),
        type: 'info',
      });
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  }, []);

  const logout = useCallback(() => { setAuth(INITIAL_AUTH); }, []);

  // ─── Products ─────────────────────────────────────────────────────────
  const addProduct = useCallback(async (p: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase.from('products').insert({
        sku: p.sku, name: p.name, description: p.description, ncm: p.ncm,
        unit: p.unit, brand: p.brand, category: p.category, price: p.price,
        cost: p.cost, quantity: p.quantity, min_quantity: p.minQuantity,
        barcode: p.barcode, warehouse: p.warehouse, status: p.status,
        image: p.image, m2_coverage: p.m2Coverage,
      }).select().maybeSingle();
      if (!error && data) setProducts(prev => [mapProduct(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  }, []);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.sku !== undefined) updateData.sku = data.sku;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.ncm !== undefined) updateData.ncm = data.ncm;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.brand !== undefined) updateData.brand = data.brand;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.cost !== undefined) updateData.cost = data.cost;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.minQuantity !== undefined) updateData.min_quantity = data.minQuantity;
      if (data.barcode !== undefined) updateData.barcode = data.barcode;
      if (data.warehouse !== undefined) updateData.warehouse = data.warehouse;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.m2Coverage !== undefined) updateData.m2_coverage = data.m2Coverage;
      updateData.updated_at = new Date().toISOString();
      await supabase.from('products').update(updateData).eq('id', id);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (error) {
      console.error('Error updating product:', error);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await supabase.from('products').delete().eq('id', id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }, []);

  // ─── Customers ────────────────────────────────────────────────────────
  const addCustomer = useCallback(async (c: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases' | 'balance'>) => {
    try {
      const { data, error } = await supabase.from('customers').insert({
        type: c.type, name: c.name, document: c.document, email: c.email,
        phone: c.phone, address: c.address, city: c.city, state: c.state,
        credit_limit: c.creditLimit, status: c.status,
      }).select().maybeSingle();
      if (!error && data) setCustomers(prev => [mapCustomer(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.type !== undefined) updateData.type = data.type;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.document !== undefined) updateData.document = data.document;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.creditLimit !== undefined) updateData.credit_limit = data.creditLimit;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.totalPurchases !== undefined) updateData.total_purchases = data.totalPurchases;
      if (data.lastPurchase !== undefined) updateData.last_purchase = data.lastPurchase;
      await supabase.from('customers').update(updateData).eq('id', id);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await supabase.from('customers').delete().eq('id', id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  }, []);

  // ─── Suppliers ────────────────────────────────────────────────────────
  const addSupplier = useCallback(async (s: Omit<Supplier, 'id' | 'createdAt' | 'balance'>) => {
    try {
      const { data, error } = await supabase.from('suppliers').insert({
        name: s.name, document: s.document, email: s.email, phone: s.phone,
        category: s.category, city: s.city, state: s.state, status: s.status,
      }).select().maybeSingle();
      if (!error && data) setSuppliers(prev => [mapSupplier(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding supplier:', error);
    }
  }, []);

  const updateSupplier = useCallback(async (id: string, data: Partial<Supplier>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.document !== undefined) updateData.document = data.document;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.status !== undefined) updateData.status = data.status;
      await supabase.from('suppliers').update(updateData).eq('id', id);
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (error) {
      console.error('Error updating supplier:', error);
    }
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      await supabase.from('suppliers').delete().eq('id', id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  }, []);

  // ─── Sales ──────────────────────────────────────────────────────────
  const addSale = useCallback(async (s: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      const { data: saleRow, error } = await supabase.from('sales').insert({
        customer_id: s.customerId || null,
        customer_name: s.customerName,
        subtotal: s.subtotal,
        discount: s.discount,
        total: s.total,
        payment: s.payment,
        payments: s.payments || null,
        notes: s.notes || null,
        status: s.status,
        seller_id: s.sellerId,
        seller_name: s.sellerName,
        nfe_number: s.nfeNumber || null,
      }).select().maybeSingle();

      if (error || !saleRow) return s as Sale;
      const saleId = (saleRow as Record<string, unknown>).id as string;

      if (s.items.length > 0) {
        await supabase.from('sale_items').insert(
          s.items.map(item => ({
            sale_id: saleId,
            product_id: item.productId || null,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total,
          }))
        );
      }

      // Batch product updates
      if (s.items.length > 0) {
        const productUpdates = s.items
          .filter(item => item.productId)
          .map(item => {
            const prod = productsRef.current.find(p => p.id === item.productId);
            if (!prod) return null;
            return {
              id: item.productId,
              newQty: Math.max(0, prod.quantity - item.quantity),
            };
          })
          .filter((update): update is { id: string; newQty: number } => update !== null);

        if (productUpdates.length > 0) {
          await Promise.all(productUpdates.map(update =>
            supabase.from('products').update({ quantity: update.newQty, updated_at: new Date().toISOString() }).eq('id', update.id)
          ));
          setProducts(prev => prev.map(p => {
            const update = productUpdates.find(u => u.id === p.id);
            return update ? { ...p, quantity: update.newQty } : p;
          }));
        }
      }

      // Update customer totals
      if (s.customerId) {
        const cust = customersRef.current.find(c => c.id === s.customerId);
        if (cust) {
          const newTotal = cust.totalPurchases + s.total;
          const today = new Date().toLocaleDateString('pt-BR');
          await supabase.from('customers').update({ total_purchases: newTotal, last_purchase: today, updated_at: new Date().toISOString() }).eq('id', s.customerId);
          setCustomers(prev => prev.map(c => c.id === s.customerId ? { ...c, totalPurchases: newTotal, lastPurchase: today } : c));
        }
      }

      // Audit log
      try {
        await supabase.from('audit_logs').insert({
          user_id: s.sellerId,
          user_name: s.sellerName,
          action: `Venda finalizada — ${s.customerName} — R$ ${s.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          module: 'PDV',
          ip: '192.168.1.11',
          type: 'success',
        });
      } catch (auditError) {
        console.error('Error logging audit:', auditError);
      }

      const newSale = mapSale(saleRow as Record<string, unknown>, s.items);
      setSales(prev => [newSale, ...prev]);
      return newSale;
    } catch (error) {
      console.error('Error adding sale:', error);
      return s as Sale;
    }
  }, []);

  const updateSale = useCallback(async (id: string, data: Partial<Sale>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.nfeNumber !== undefined) updateData.nfe_number = data.nfeNumber;
      await supabase.from('sales').update(updateData).eq('id', id);
      setSales(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (error) {
      console.error('Error updating sale:', error);
    }
  }, []);

  // ─── Financial Entries ────────────────────────────────────────────────────
  const addReceivable = useCallback(async (entry: Omit<FinancialEntry, 'id'>) => {
    try {
      const { data, error } = await supabase.from('financial_entries').insert({
        type: entry.type, category: entry.category, description: entry.description,
        value: entry.value, due_date: entry.dueDate, paid_at: entry.paidAt || null,
        status: entry.status, entity_name: entry.entityName,
      }).select().maybeSingle();
      if (!error && data) setReceivables(prev => [mapFinancialEntry(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding receivable:', error);
    }
  }, []);

  const updateReceivable = useCallback(async (id: string, data: Partial<FinancialEntry>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      if (data.paidAt !== undefined) updateData.paid_at = data.paidAt;
      if (data.value !== undefined) updateData.value = data.value;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
      if (data.description !== undefined) updateData.description = data.description;
      await supabase.from('financial_entries').update(updateData).eq('id', id);
      setReceivables(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (error) {
      console.error('Error updating receivable:', error);
    }
  }, []);

  const deleteReceivable = useCallback(async (id: string) => {
    try {
      await supabase.from('financial_entries').delete().eq('id', id);
      setReceivables(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting receivable:', error);
    }
  }, []);

  const addPayable = useCallback(async (entry: Omit<FinancialEntry, 'id'>) => {
    try {
      const { data, error } = await supabase.from('financial_entries').insert({
        type: entry.type, category: entry.category, description: entry.description,
        value: entry.value, due_date: entry.dueDate, paid_at: entry.paidAt || null,
        status: entry.status, entity_name: entry.entityName,
      }).select().maybeSingle();
      if (!error && data) setPayables(prev => [mapFinancialEntry(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding payable:', error);
    }
  }, []);

  const updatePayable = useCallback(async (id: string, data: Partial<FinancialEntry>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      if (data.paidAt !== undefined) updateData.paid_at = data.paidAt;
      if (data.value !== undefined) updateData.value = data.value;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
      if (data.description !== undefined) updateData.description = data.description;
      await supabase.from('financial_entries').update(updateData).eq('id', id);
      setPayables(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (error) {
      console.error('Error updating payable:', error);
    }
  }, []);

  const deletePayable = useCallback(async (id: string) => {
    try {
      await supabase.from('financial_entries').delete().eq('id', id);
      setPayables(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting payable:', error);
    }
  }, []);

  // ─── Stock Movements ──────────────────────────────────────────────────────
  const addStockMovement = useCallback(async (m: Omit<StockMovement, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase.from('stock_movements').insert({
        product_id: m.productId || null,
        product_name: m.productName,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        warehouse: m.warehouse,
        user_id: m.userId,
        user_name: m.userName,
      }).select().maybeSingle();

      if (!error && data) setStockMovements(prev => [mapStockMovement(data as Record<string, unknown>), ...prev]);

      // Update product quantity
      if (m.productId) {
        const prod = productsRef.current.find(p => p.id === m.productId);
        if (prod) {
          const delta = m.type === 'Entrada' ? m.quantity : m.type === 'Saída' ? -m.quantity : m.type === 'Ajuste' ? m.quantity : 0;
          const newQty = Math.max(0, prod.quantity + delta);
          await supabase.from('products').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', m.productId);
          setProducts(prev => prev.map(p => p.id === m.productId ? { ...p, quantity: newQty } : p));
        }
      }
    } catch (error) {
      console.error('Error adding stock movement:', error);
    }
  }, []);

  // ─── Audit Logs ────────────────────────────────────────────────────────
  const addAuditLog = useCallback(async (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase.from('audit_logs').insert({
        user_id: log.userId,
        user_name: log.userName,
        action: log.action,
        module: log.module,
        ip: log.ip,
        type: log.type,
      }).select().maybeSingle();
      if (!error && data) setAuditLogs(prev => [mapAuditLog(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding audit log:', error);
    }
  }, []);

  // ─── Users (from system_users table via edge function) ────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('erp-auth', {
        body: { action: 'list_users' },
      });
      if (data?.users) {
        setUsers(data.users.map((u: Record<string, unknown>) => ({
          id: u.id as string,
          name: u.name as string,
          email: u.email as string,
          role: u.role as string,
          avatar: u.avatar as string,
          status: u.status as 'Ativo' | 'Inativo',
          lastLogin: u.last_login ? new Date(u.last_login as string).toLocaleString('pt-BR') : undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  const addUser = useCallback(async (u: { name: string; email: string; role: string; password: string; status: 'Ativo' | 'Inativo' }) => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-auth', {
        body: { action: 'create_user', ...u },
      });
      if (!error && data?.user) {
        await loadUsers();
        return { success: true };
      }
      return { success: false, error: data?.error || 'Erro ao criar usuário.' };
    } catch (error) {
      console.error('Error adding user:', error);
      return { success: false, error: 'Erro ao criar usuário.' };
    }
  }, [loadUsers]);

  const updateUser = useCallback(async (id: string, data: Partial<{ name: string; email: string; role: string; status: 'Ativo' | 'Inativo' }>) => {
    try {
      await supabase.functions.invoke('erp-auth', {
        body: { action: 'update_user', id, ...data },
      });
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, [loadUsers]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await supabase.functions.invoke('erp-auth', {
        body: { action: 'delete_user', id },
      });
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }, [loadUsers]);

  const changePassword = useCallback(async (id: string, newPassword: string, currentPassword?: string, isAdmin?: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('erp-auth', {
        body: {
          action: 'change_password',
          id,
          new_password: newPassword,
          current_password: currentPassword,
          is_admin: isAdmin || false,
        },
      });
      if (error || data?.error) {
        return { success: false, error: data?.error || 'Erro ao alterar senha.' };
      }
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error: 'Erro ao alterar senha.' };
    }
  }, []);

  // ─── Backups ─────────────────────────────────────────────────────────
  const createBackup = useCallback(() => {
    const newB: Backup = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString('pt-BR'),
      size: `${(Math.random() * 100 + 200).toFixed(0)} MB`,
      type: 'Manual',
      status: 'Concluído',
    };
    setBackups(prev => [newB, ...prev]);
  }, []);

  // ─── Quotes ─────────────────────────────────────────────────────────
  const addQuote = useCallback(async (q: Omit<Quote, 'id' | 'createdAt' | 'number'>) => {
    try {
      const num = `ORC-${String(Date.now()).slice(-6)}`;
      const { data: quoteRow, error } = await supabase.from('quotes').insert({
        number: num,
        customer_id: q.customerId || null,
        customer_name: q.customerName,
        customer_email: q.customerEmail || null,
        customer_phone: q.customerPhone || null,
        subtotal: q.subtotal,
        discount: q.discount,
        total: q.total,
        notes: q.notes || null,
        valid_until: q.validUntil,
        status: q.status,
        seller_id: q.sellerId,
        seller_name: q.sellerName,
      }).select().maybeSingle();

      if (error || !quoteRow) return { ...q, id: crypto.randomUUID(), number: num, createdAt: new Date().toLocaleDateString('pt-BR') } as Quote;
      const quoteId = (quoteRow as Record<string, unknown>).id as string;

      if (q.items.length > 0) {
        await supabase.from('quote_items').insert(
          q.items.map(item => ({
            quote_id: quoteId,
            product_id: item.productId || null,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total,
            unit: item.unit || null,
            m2_area: item.m2Area || null,
            m2_coverage: item.m2Coverage || null,
          }))
        );
      }

      const newQuote = mapQuote(quoteRow as Record<string, unknown>, q.items);
      setQuotes(prev => [newQuote, ...prev]);
      return newQuote;
    } catch (error) {
      console.error('Error adding quote:', error);
      return { ...q, id: crypto.randomUUID(), number: `ORC-${String(Date.now()).slice(-6)}`, createdAt: new Date().toLocaleDateString('pt-BR') } as Quote;
    }
  }, []);

  const updateQuote = useCallback(async (id: string, data: Partial<Quote>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.validUntil !== undefined) updateData.valid_until = data.validUntil;
      if (data.discount !== undefined) updateData.discount = data.discount;
      if (data.total !== undefined) updateData.total = data.total;
      await supabase.from('quotes').update(updateData).eq('id', id);
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));
    } catch (error) {
      console.error('Error updating quote:', error);
    }
  }, []);

  const deleteQuote = useCallback(async (id: string) => {
    try {
      await supabase.from('quotes').delete().eq('id', id);
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  }, []);

  // ─── Commissions ────────────────────────────────────────────────────────
  const addCommission = useCallback(async (c: Omit<Commission, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase.from('commissions').insert({
        seller_id: c.sellerId,
        seller_name: c.sellerName,
        sale_id: c.saleId || null,
        sale_total: c.saleTotal,
        rate: c.rate,
        value: c.value,
        status: c.status,
        period: c.period,
      }).select().maybeSingle();
      if (!error && data) setCommissions(prev => [mapCommission(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding commission:', error);
    }
  }, []);

  const updateCommission = useCallback(async (id: string, data: Partial<Commission>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      await supabase.from('commissions').update(updateData).eq('id', id);
      setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (error) {
      console.error('Error updating commission:', error);
    }
  }, []);

  // ─── Sales Goals ────────────────────────────────────────────────────────
  const addSalesGoal = useCallback(async (g: Omit<SalesGoal, 'id'>) => {
    try {
      const { data, error } = await supabase.from('sales_goals').insert({
        seller_id: g.sellerId,
        seller_name: g.sellerName,
        period: g.period,
        target_revenue: g.targetRevenue,
        target_sales: g.targetSales,
        current_revenue: g.currentRevenue,
        current_sales: g.currentSales,
        status: g.status,
      }).select().maybeSingle();
      if (!error && data) setSalesGoals(prev => [mapSalesGoal(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding sales goal:', error);
    }
  }, []);

  const updateSalesGoal = useCallback(async (id: string, data: Partial<SalesGoal>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      if (data.currentRevenue !== undefined) updateData.current_revenue = data.currentRevenue;
      if (data.currentSales !== undefined) updateData.current_sales = data.currentSales;
      if (data.targetRevenue !== undefined) updateData.target_revenue = data.targetRevenue;
      if (data.targetSales !== undefined) updateData.target_sales = data.targetSales;
      await supabase.from('sales_goals').update(updateData).eq('id', id);
      setSalesGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
    } catch (error) {
      console.error('Error updating sales goal:', error);
    }
  }, []);

  const deleteSalesGoal = useCallback(async (id: string) => {
    try {
      await supabase.from('sales_goals').delete().eq('id', id);
      setSalesGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting sales goal:', error);
    }
  }, []);

  // ─── Purchases ────────────────────────────────────────────────────────
  const addPurchase = useCallback(async (p: Omit<Purchase, 'id' | 'createdAt' | 'number'>) => {
    try {
      const num = `PED-${String(Date.now()).slice(-6)}`;
      const { data: purchaseRow, error } = await supabase.from('purchases').insert({
        number: num,
        supplier_id: p.supplierId || null,
        supplier_name: p.supplierName,
        subtotal: p.subtotal,
        freight: p.freight,
        total: p.total,
        payment: p.payment,
        expected_at: p.expectedAt,
        received_at: p.receivedAt || null,
        notes: p.notes || null,
        status: p.status,
        buyer_id: p.buyerId,
        buyer_name: p.buyerName,
      }).select().maybeSingle();

      if (error || !purchaseRow) return { ...p, id: crypto.randomUUID(), number: num, createdAt: new Date().toLocaleDateString('pt-BR') } as Purchase;
      const purchaseId = (purchaseRow as Record<string, unknown>).id as string;

      if (p.items.length > 0) {
        await supabase.from('purchase_items').insert(
          p.items.map(item => ({
            purchase_id: purchaseId,
            product_id: item.productId || null,
            product_name: item.productName,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total: item.total,
          }))
        );
      }

      const newPurchase = mapPurchase(purchaseRow as Record<string, unknown>, p.items);
      setPurchases(prev => [newPurchase, ...prev]);
      return newPurchase;
    } catch (error) {
      console.error('Error adding purchase:', error);
      return { ...p, id: crypto.randomUUID(), number: `PED-${String(Date.now()).slice(-6)}`, createdAt: new Date().toLocaleDateString('pt-BR') } as Purchase;
    }
  }, []);

  const updatePurchase = useCallback(async (id: string, data: Partial<Purchase>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      if (data.receivedAt !== undefined) updateData.received_at = data.receivedAt;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await supabase.from('purchases').update(updateData).eq('id', id);

      if (data.status === 'Recebido') {
        const purchase = purchasesRef.current.find(p => p.id === id);
        if (purchase && purchase.status !== 'Recebido') {
          // Batch product updates for received items
          const productUpdates = purchase.items
            .filter(item => item.productId)
            .map(item => {
              const prod = productsRef.current.find(p => p.id === item.productId);
              if (!prod) return null;
              return {
                id: item.productId,
                newQty: prod.quantity + item.quantity,
              };
            })
            .filter((update): update is { id: string; newQty: number } => update !== null);

          if (productUpdates.length > 0) {
            await Promise.all(productUpdates.map(update =>
              supabase.from('products').update({ quantity: update.newQty, updated_at: new Date().toISOString() }).eq('id', update.id)
            ));
            setProducts(prev => prev.map(p => {
              const update = productUpdates.find(u => u.id === p.id);
              return update ? { ...p, quantity: update.newQty } : p;
            }));
          }

          const newNotif: Notification = {
            id: crypto.randomUUID(),
            title: 'Pedido Recebido',
            message: `${purchase.number} de ${purchase.supplierName} foi recebido. Estoque atualizado.`,
            type: 'success',
            read: false,
            link: '/purchases',
            createdAt: new Date().toLocaleString('pt-BR'),
          };
          setNotifications(n => [newNotif, ...n]);
        }
      }

      setPurchases(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (error) {
      console.error('Error updating purchase:', error);
    }
  }, []);

  const deletePurchase = useCallback(async (id: string) => {
    try {
      await supabase.from('purchases').delete().eq('id', id);
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  }, []);

  // ─── Invoices ─────────────────────────────────────────────────────────
  const addInvoice = useCallback(async (inv: Omit<Invoice, 'id'>) => {
    try {
      const { data, error } = await supabase.from('invoices').insert({
        number: inv.number,
        type: inv.type,
        customer_id: inv.customerId || null,
        customer_name: inv.customerName,
        customer_document: inv.customerDocument || null,
        value: inv.value,
        status: inv.status,
        sale_id: inv.saleId || null,
        issued_at: new Date().toISOString().slice(0, 10),
      }).select().maybeSingle();
      if (!error && data) setInvoices(prev => [mapInvoice(data as Record<string, unknown>), ...prev]);
    } catch (error) {
      console.error('Error adding invoice:', error);
    }
  }, []);

  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>) => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.status !== undefined) updateData.status = data.status;
      if (data.number !== undefined) updateData.number = data.number;
      if (data.customerName !== undefined) updateData.customer_name = data.customerName;
      if (data.customerDocument !== undefined) updateData.customer_document = data.customerDocument;
      if (data.value !== undefined) updateData.value = data.value;
      if (data.type !== undefined) updateData.type = data.type;
      await supabase.from('invoices').update(updateData).eq('id', id);
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      await supabase.from('invoices').delete().eq('id', id);
      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  }, []);

  // ─── Notifications (local only) ───────────────────────────────────────────
  const addNotification = useCallback((n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newN: Notification = { ...n, id: crypto.randomUUID(), read: false, createdAt: new Date().toLocaleString('pt-BR') };
    setNotifications(prev => [newN, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ─── Computed (with memoization) ────────────────────────────────────────
  const criticalStockProducts = useMemo(
    () => products.filter(p => p.quantity <= p.minQuantity && p.status === 'Ativo'),
    [products]
  );
  
  const pendingSales = useMemo(
    () => sales.filter(s => s.status === 'Pendente'),
    [sales]
  );
  
  const totalReceivable = useMemo(
    () => receivables.filter(r => r.status !== 'Pago').reduce((s, r) => s + r.value, 0),
    [receivables]
  );
  
  const todaySales = useMemo(() => {
    const today = new Date().toLocaleDateString('pt-BR');
    return sales
      .filter(s => s.createdAt === today && s.status === 'Concluído')
      .reduce((s, sale) => s + sale.total, 0);
  }, [sales]);
  
  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  return {
    auth, login, logout,
    loading,
    products, addProduct, updateProduct, deleteProduct,
    customers, addCustomer, updateCustomer, deleteCustomer,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    sales, addSale, updateSale,
    invoices, addInvoice, updateInvoice, deleteInvoice,
    receivables, addReceivable, updateReceivable, deleteReceivable,
    payables, addPayable, updatePayable, deletePayable,
    stockMovements, addStockMovement,
    auditLogs, addAuditLog,
    users, addUser, updateUser, deleteUser, changePassword, loadUsers,
    backups, createBackup,
    quotes, addQuote, updateQuote, deleteQuote,
    commissions, addCommission, updateCommission,
    salesGoals, addSalesGoal, updateSalesGoal, deleteSalesGoal,
    purchases, addPurchase, updatePurchase, deletePurchase,
    notifications, addNotification, markNotificationRead, markAllNotificationsRead, deleteNotification,
    criticalStockProducts,
    pendingSales,
    totalReceivable,
    todaySales,
    unreadNotifications,
  };
}

export type ERPStore = ReturnType<typeof useERPStore>;
