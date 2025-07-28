// Configuration for large-scale data seeding
// Adjust these values based on your testing needs

export const SEED_CONFIG = {
  // Basic data volumes
  USERS: 1000,
  FORESTS: 500,
  CREDITS_PER_FOREST: 8, // 4 years * 2 certifications
  ORDERS: 5000,

  // User-related data
  NOTIFICATIONS_PER_USER: 50,
  BOOKMARKS_PER_USER: 10,
  CART_ITEMS_PER_USER: 5,

  // Order-related data
  PAYMENTS_PER_ORDER: 1,
  ORDER_HISTORY_PER_ORDER: 3,
  EXCHANGE_RATES_PER_CREDIT: 4,

  // Data distribution
  ADMIN_USER_RATIO: 0.1, // 10% of users are admins
  VERIFIED_EMAIL_RATIO: 0.8, // 80% of users have verified emails
  COMPANY_RATIO: 0.7, // 70% of users have company info

  // Order status distribution
  ORDER_STATUS_DISTRIBUTION: {
    pending: 0.2,
    processing: 0.1,
    completed: 0.6,
    cancelled: 0.05,
    failed: 0.05,
  },

  // Payment status distribution
  PAYMENT_STATUS_DISTRIBUTION: {
    pending: 0.1,
    succeeded: 0.8,
    failed: 0.05,
    canceled: 0.03,
    refunded: 0.02,
  },

  // Notification read ratio
  NOTIFICATION_READ_RATIO: 0.7, // 70% of notifications are read

  // Date ranges
  DATE_RANGE: {
    start: new Date("2020-01-01"),
    end: new Date(),
  },

  // Carbon credit ranges
  CREDIT_RANGES: {
    totalCredits: { min: 1000, max: 50000 },
    pricePerCredit: { min: 5, max: 25 },
    availableRatio: { min: 0.1, max: 1.0 },
  },

  // Forest ranges
  FOREST_RANGES: {
    area: { min: 50, max: 2000 },
    activeRatio: 0.9, // 90% of forests are active
  },
};

// Preset configurations for different testing scenarios
export const PRESET_CONFIGS = {
  // Small dataset for quick testing
  SMALL: {
    USERS: 100,
    FORESTS: 50,
    CREDITS_PER_FOREST: 4,
    ORDERS: 500,
    NOTIFICATIONS_PER_USER: 10,
    BOOKMARKS_PER_USER: 3,
    CART_ITEMS_PER_USER: 2,
  },

  // Medium dataset for integration testing
  MEDIUM: {
    USERS: 500,
    FORESTS: 250,
    CREDITS_PER_FOREST: 6,
    ORDERS: 2500,
    NOTIFICATIONS_PER_USER: 25,
    BOOKMARKS_PER_USER: 5,
    CART_ITEMS_PER_USER: 3,
  },

  // Large dataset for performance testing
  LARGE: {
    USERS: 1000,
    FORESTS: 500,
    CREDITS_PER_FOREST: 8,
    ORDERS: 5000,
    NOTIFICATIONS_PER_USER: 50,
    BOOKMARKS_PER_USER: 10,
    CART_ITEMS_PER_USER: 5,
  },

  // Extra large dataset for stress testing
  EXTRA_LARGE: {
    USERS: 5000,
    FORESTS: 1000,
    CREDITS_PER_FOREST: 10,
    ORDERS: 25000,
    NOTIFICATIONS_PER_USER: 100,
    BOOKMARKS_PER_USER: 20,
    CART_ITEMS_PER_USER: 10,
  },
};

// Helper function to merge configurations
export function getConfig(preset: keyof typeof PRESET_CONFIGS = "LARGE") {
  return { ...SEED_CONFIG, ...PRESET_CONFIGS[preset] };
}
