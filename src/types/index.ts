// Shared types and interfaces for the app

// User and Auth
// User type (Supabase handles authentication, no password storage needed)
export interface User {
  id: number;
  email: string;
  supabaseUserId?: string | null;
  firstName: string;
  lastName: string;
  company?: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading?: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup?: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    company?: string,
  ) => Promise<void>;
  logout: () => void;
}

// Forest
export interface Forest {
  id: number;
  name: string;
  location: string;
  type: string;
  area: number;
  description: string;
  status: string;
  lastUpdated: string;
  credits?: CarbonCredit[];
}

// CarbonCredit
export interface CarbonCredit {
  id: number;
  forestId: number;
  vintage: number;
  certification: string;
  totalCredits: number;
  availableCredits: number;
  pricePerCredit: number;
  symbol: string;
  retiredCredits: number;
  createdAt: string;
  updatedAt: string;
  forest?: Forest;
  orderItems?: OrderItem[];
}

// Payment
export interface Payment {
  id: number;
  orderId: number;
  orderCode: number;
  amount: number;
  currency: string;
  status: string;
  failureReason?: string;
  method?: string;
  paidAt?: string;
  paymentData?: any;
  payosPaymentLinkId?: string;
  payosOrderCode?: number;
  payosReference?: string;
  createdAt: string;
  updatedAt: string;
}

// OrderHistory
export interface OrderHistory {
  id: number;
  orderId: number;
  event: string;
  message?: string;
  createdAt: string;
}

// Certificate
export interface Certificate {
  id: string;
  orderId: number;
  order?: Order;
  certificateHash: string;
  issuedAt: string;
  status: string;
  metadata?: CertificateMetadata;
  createdAt: string;
  updatedAt: string;
}

// Certificate Metadata
export interface CertificateMetadata {
  certificateId?: string;
  orderId?: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  forestName?: string;
  forestType?: string;
  totalCredits?: number;
  totalValue?: number;
  purchaseDate?: string;
  items?: CertificateItem[];
  [key: string]: unknown;
}

// Certificate Item
export interface CertificateItem {
  certification: string;
  vintage: number;
  quantity: number;
  pricePerCredit: number;
  subtotal: number;
}

// Order
export interface Order {
  id: number;
  orderCode: number;
  userId: number;
  createdAt: string;
  status: string;
  totalPrice: number;
  paymentProvider?: string;
  user?: User;
  items?: OrderItem[];
  payments?: Payment[];
  orderHistory?: OrderHistory[];
  certificate?: Certificate;
  paidAt?: string;
  failureReason?: string;
}

// OrderItem
export interface OrderItem {
  id: number;
  orderId: number;
  carbonCreditId: number;
  quantity: number;
  pricePerCredit: number;
  subtotal: number;
  order?: Order;
  carbonCredit?: CarbonCredit;
}

// Cart Item
export interface CartItem {
  id: number;
  userId: number;
  carbonCreditId: number;
  quantity: number;
  carbonCredit?: CarbonCredit;
}

// Bookmark
export interface Bookmark {
  id: number;
  userId: number;
  forestId: number;
  createdAt: string;
  forest?: Forest;
}

// Exchange Rate
export interface ExchangeRate {
  id: number;
  carbonCreditId: number;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

// Map
export interface ForestZone {
  id?: number;
  name: string;
  coordinates: number[][];
  color: string;
  credits: number;
  area: number;
  description?: string;
  status?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
    total: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Admin Analytics Types
export interface MonthlySalesData {
  month: string;
  credits: number;
  revenue: number;
}

export interface TopForestData {
  forest: Forest;
  creditsSold: number;
}

export interface TopUserData {
  user: User;
  total: number;
}
