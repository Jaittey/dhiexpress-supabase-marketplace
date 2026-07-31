// DhiExpress Supabase configuration.
// The project URL and anon key are designed to be public in browser apps.
// NEVER place the service_role key or other private secrets in this file.
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
    clientErrors: "client_errors"
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
    supportEmail: "support@example.com"
  },
  onlinePaymentEnabled: false
};

export const isSupabaseConfigured = Boolean(appConfig.supabase.url && appConfig.supabase.anonKey)
  && !appConfig.supabase.url.includes("https://ccppmnukjmihtxfwqpeq.supabase.co")
  && !appConfig.supabase.anonKey.includes("sb_publishable_ZSpyb9k4KAUm5RBpUZMLvA_CGVRJBH9");
