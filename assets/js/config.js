// DhiExpress Supabase configuration.
// The project URL and publishable key are safe to use in browser applications.
// NEVER place the service_role key, database password, JWT secret, or other private secrets here.

export const appConfig = {
  supabase: {
    url: "https://ccppmnukjmihtxfwqpeq.supabase.co",
    anonKey: "sb_publishable_ZSpyb9k4KAUm5RBpUZMLvA_CGVRJBH9"
  },

  tables: {
    users: "profiles",
    sellerProfiles: "seller_profiles",
    sellerApplications: "seller_applications",
    categories: "categories",
    membershipPlans: "membership_plans",
    products: "products",
    orders: "orders",
    orderItems: "order_items",
    reviews: "reviews",
    notifications: "notifications",
    conversations: "conversations",
    messages: "messages",
    complaints: "complaints",
    payments: "payments",
    subscriptions: "subscriptions",
    settings: "settings",
    announcements: "announcements",
    userLists: "user_lists",
    clientErrors: "client_errors",
    // Compatibility alias used by the current admin dashboard.
    errorLogs: "client_errors"
  },

  buckets: {
    productImages: "product-images",
    profileImages: "profile-images",
    paymentProofs: "payment-proofs",
    sellerDocuments: "seller-documents"
  },

  company: {
    name: "DhiExpress",
    currency: "MVR",
    country: "Maldives",
    supportEmail: "jaeitte@gmail.com"
  },

  onlinePaymentEnabled: false
};

export const isSupabaseConfigured =
  Boolean(appConfig.supabase.url?.trim()) &&
  Boolean(appConfig.supabase.anonKey?.trim()) &&
  !appConfig.supabase.url.includes("YOUR_PROJECT_REF") &&
  !appConfig.supabase.anonKey.includes("YOUR_SUPABASE");
