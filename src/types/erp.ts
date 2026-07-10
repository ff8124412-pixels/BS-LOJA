export type UserRole = 'Administrador' | 'Gerente' | 'Vendedor' | 'Caixa' | 'Estoquista' | 'Contador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  status: 'Ativo' | 'Inativo';
  lastLogin?: string;
  failedAttempts?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  ncm?: string;
  unit: string;
  brand?: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  minQuantity: number;
  barcode?: string;
  warehouse?: string;
  status: 'Ativo' | 'Inativo';
  image?: string;
  createdAt: string;
  // Cobertura por m² — quantas unidades do produto cobrem 1 m²
  // Ex: argamassa 20kg cobre 4m² → m2Coverage = 4
  // Se null, produto não é calculado por m²
  m2Coverage?: number | null;
}

export interface Customer {
  id: string;
  type: 'PF' | 'PJ';
  name: string;
  document: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  state: string;
  creditLimit: number;
  balance: number;
  status: 'Adimplente' | 'Inadimplente';
  totalPurchases: number;
  lastPurchase?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  category: string;
  city: string;
  state: string;
  balance: number;
  status: 'Ativo' | 'Inativo';
  lastOrder?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment: string;
  payments?: PaymentSplit[];
  notes?: string;
  status: 'Concluído' | 'Pendente' | 'Em andamento' | 'Cancelado';
  sellerId: string;
  sellerName: string;
  nfeNumber?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  type: 'NF-e' | 'NFC-e';
  customerId?: string;
  customerName: string;
  customerDocument: string;
  value: number;
  status: 'Emitida' | 'Cancelada' | 'Pendente';
  saleId?: string;
  issuedAt: string;
}

export interface FinancialEntry {
  id: string;
  type: 'Receita' | 'Despesa';
  category: string;
  description: string;
  value: number;
  dueDate: string;
  paidAt?: string;
  status: 'A vencer' | 'Vencido' | 'Pago';
  entityName: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'Entrada' | 'Saída' | 'Ajuste' | 'Transferência';
  quantity: number;
  reason: string;
  warehouse: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  ip: string;
  type: 'success' | 'info' | 'warning' | 'error';
  createdAt: string;
}

export interface Backup {
  id: string;
  date: string;
  size: string;
  type: 'Automático' | 'Manual';
  status: 'Concluído' | 'Falhou';
}

// ─── Orçamentos ──────────────────────────────────────────────────────────────
export interface QuoteItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
  // Se o item foi calculado por m²
  m2Area?: number;
  m2Coverage?: number;
}

export interface Quote {
  id: string;
  number: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  validUntil: string;
  status: 'Rascunho' | 'Enviado' | 'Aprovado' | 'Recusado' | 'Expirado';
  sellerId: string;
  sellerName: string;
  createdAt: string;
}

// ─── Comissões ───────────────────────────────────────────────────────────────
export interface Commission {
  id: string;
  sellerId: string;
  sellerName: string;
  saleId: string;
  saleTotal: number;
  rate: number;
  value: number;
  status: 'Pendente' | 'Aprovado' | 'Pago';
  period: string;
  createdAt: string;
}

// ─── Metas ───────────────────────────────────────────────────────────────────
export interface SalesGoal {
  id: string;
  sellerId: string;
  sellerName: string;
  period: string;
  targetRevenue: number;
  targetSales: number;
  currentRevenue: number;
  currentSales: number;
  status: 'Em andamento' | 'Atingida' | 'Não atingida';
}

// ─── Compras ─────────────────────────────────────────────────────────────────
export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface Purchase {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  freight: number;
  total: number;
  payment: string;
  expectedAt: string;
  receivedAt?: string;
  notes?: string;
  status: 'Rascunho' | 'Enviado' | 'Confirmado' | 'Recebido' | 'Cancelado';
  buyerId: string;
  buyerName: string;
  createdAt: string;
}

// ─── Notificações ────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  link?: string;
  createdAt: string;
}
