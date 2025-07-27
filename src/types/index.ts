// Shared types and interfaces for the app

// User and Auth
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
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
  createdAt: string;
  updatedAt: string;
  forest?: Forest;
  orderItems?: OrderItem[];
}

// Payment
export interface Payment {
  id: number;
  orderId: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  status: string;
  failureReason?: string;
  method?: string;
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
  userId: number;
  createdAt: string;
  status: string;
  totalPrice: number;
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

// Notification Types
export interface Notification {
  id: string;
  userId: number;
  type: "order" | "credit" | "system" | "payment";
  title: string;
  message: string;
  data?: NotificationData;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Notification Data
export interface NotificationData {
  orderId?: number;
  creditId?: number;
  forestName?: string;
  event?: string;
  status?: string;
  [key: string]: unknown;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: (force?: boolean) => Promise<void>;
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "updatedAt">) => void;
  clearError: () => void;
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
