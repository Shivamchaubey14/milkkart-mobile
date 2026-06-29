import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import type { RootState } from "../store";
import { logout, setTokens, User } from "../store/authSlice";
import { clearTokens, saveAccess } from "../store/secureTokens";
import { API_BASE } from "./config";

export type Banner = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  bg_color: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  product_count: number;
};

export type Variant = {
  id: number;
  label: string;
  price: string;
  mrp: string;
  discount_percent: number;
  in_stock: boolean;
  is_default?: boolean;
  quantity_value?: string;
  unit?: string;
};

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  description: string;
  image_url: string;
  tags: string;
  category: Category;
  variants: Variant[];
  rating_average: number;
  rating_count: number;
};

export type ProductRating = {
  id: number;
  rating: number;
  comment: string;
  user_name: string;
  created_at: string;
};

export type CatalogProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  image_url: string;
  category: number;
  category_name: string;
  default_variant: Variant | null;
  rating_average: number;
  rating_count: number;
};

export type Address = {
  id: number;
  label: string;
  address_line: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
};

export type CartItem = {
  id: number;
  variant: number;
  product_name: string;
  product_slug: string;
  image_url: string;
  variant_label: string;
  price: string;
  quantity: number;
  subtotal: string;
};

export type CartBill = {
  subtotal: number | string;
  coupon_code: string | null;
  coupon_discount: number | string;
  delivery_fee: number | string;
  small_cart_fee: number | string;
  tax: number | string;
  grand_total: number | string;
};

export type Cart = {
  id: number;
  items: CartItem[];
  coupon_code: string | null;
  bill: CartBill;
  item_count: number;
};

export type DeliverySlot = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  available: number;
  is_full: boolean;
};

export type ServiceabilityResult = {
  serviceable: boolean;
  area: { name?: string; city?: string; delivery_eta_minutes: number | null } | null;
};

// Status of the next-day pre-order window (admin-configured). When `open`,
// customers may place orders for `next_delivery_date`.
export type OrderWindow = {
  enabled: boolean;
  open: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  next_delivery_date: string | null;
};

export type OrderSummary = {
  id: number;
  order_number: string;
  status: string;
  total: string;
  item_count: number;
  item_names: string[];
  item_images: string[];
  placed_at: string;
};

export type OrderItemDetail = {
  id: number;
  product_name: string;
  variant_label: string;
  product_price: string;
  quantity: number;
  subtotal: string;
  image_url: string;
};

export type OrderAssignment = {
  status: string;
  rider_name: string;
  rider_phone: string;
  vehicle_number: string;
  delivery_otp: string;
  rider_lat: string | null;
  rider_lng: string | null;
  /** Actual handover time (ISO), set when the rider completes delivery. */
  delivered_at: string | null;
};

export type OrderDetail = {
  id: number;
  order_number: string;
  status: string;
  subtotal: string;
  discount: string;
  delivery_fee: string;
  small_cart_fee: string;
  tax: string;
  total: string;
  coupon_code: string | null;
  address_snapshot: string;
  delivery_type: "instant" | "next_day";
  delivery_date: string | null;
  /** Status driving the progress timeline (next-day auto-advances on its day). */
  timeline_status: string;
  notes: string;
  items: OrderItemDetail[];
  assignment: OrderAssignment | null;
  destination: { lat: string; lng: string } | null;
  placed_at: string;
  updated_at: string;
};

export type Invoice = {
  id: number;
  number: string;
  order_number: string;
  order_status: string;
  subtotal: string;
  discount: string;
  delivery_fee: string;
  small_cart_fee: string;
  tax: string;
  total: string;
  address_snapshot: string;
  items: OrderItemDetail[];
  placed_at: string;
  issued_at: string;
  emailed_at: string | null;
};

export type OrderReview = {
  id: number;
  order_rating: number;
  rider_rating: number | null;
  comment: string;
  photos: string[];
  created_at: string;
};

// Delivery-partner (rider) shapes — see apps/delivery.
export type RiderDuty = {
  vehicle_number: string;
  is_on_duty: boolean;
  current_lat: string | null;
  current_lng: string | null;
  last_location_at: string | null;
};

export type RiderDeliveryItem = {
  id: number;
  product_name: string;
  variant_label: string;
  quantity: number;
  is_returned: boolean;
  image_url: string;
};

export type RiderDelivery = {
  order_number: string;
  address: string;
  customer_name: string;
  customer_phone: string;
  customer_avatar: string;
  dest_lat: string | null;
  dest_lng: string | null;
  total: string;
  status: string;
  type: "instant" | "subscription";
  // Instant same-day vs a next-day pre-order, and its scheduled delivery date.
  delivery_type: "instant" | "next_day";
  delivery_date: string | null;
  is_cod: boolean;
  cod_amount: string;
  item_count: number;
  item_images: string[];
  items: RiderDeliveryItem[];
  // Present on history-list rows: the day it counts against (delivered/assigned),
  // as a YYYY-MM-DD string, plus the full ISO timestamp. Null if never stamped.
  date?: string | null;
  at?: string | null;
};

export type RiderDeliveryKind = "delivered" | "pending" | "returned";

export type RiderDeliveriesList = {
  kind: RiderDeliveryKind;
  deliveries: RiderDelivery[];
};

export type RiderEarningsDaily = { date: string; deliveries: number; earnings: string };
export type RiderEarningsProduct = {
  product_name: string;
  image_url: string;
  qty: number;
  deliveries: number;
  earnings: string;
};
export type RiderEarnings = {
  fee_per_delivery: string;
  total_earnings: string;
  total_deliveries: number;
  // The day being inspected (defaults to today) and that day's figures.
  date: string;
  selected: { date: string; deliveries: number; earnings: string };
  daily: RiderEarningsDaily[];
  by_product: RiderEarningsProduct[];
};

export type RiderDay = {
  date: string;
  stats: {
    total: number;
    delivered: number;
    pending: number;
    returned: number;
    earnings: string;
    rider_fee: string;
    cod_to_collect: string;
    cod_collected: string;
    cod_collected_upi: string;
    cod_collected_cash: string;
  };
  deliveries: RiderDelivery[];
};

export type WalletTransaction = {
  id: number;
  type: string;
  amount: string;
  signed_amount: string;
  balance_after: string;
  order_number: string | null;
  description: string;
  created_at: string;
};

export type Wallet = {
  balance: string;
  recent_transactions: WalletTransaction[];
};

export type WalletTopupCreated = {
  topup_id: number;
  amount: string;
  status: string;
  // Gateway-agnostic UPI intent/QR built by the backend (single source of truth).
  upi: { intent: string; vpa: string; payee_name: string };
  gateway: { provider: string; key_id: string; order_id: string; amount: number; currency: string };
};

export type WalletTopupStatus = {
  topup_id: number;
  status: "created" | "success" | "failed";
  wallet: Wallet;
};

export type SubscriptionVacation = { id: number; start_date: string; end_date: string };

export type Subscription = {
  id: number;
  variant_id: number;
  product_name: string;
  image_url: string;
  variant_label: string;
  quantity: number;
  frequency: "daily" | "alternate" | "weekdays" | "custom";
  custom_days: string[];
  address_id: number;
  preferred_time: string | null;
  payment_method: "wallet" | "cod";
  status: "active" | "paused" | "cancelled";
  start_date: string;
  daily_cost: string;
  vacations: SubscriptionVacation[];
  created_at: string;
};

export type SubscriptionSummary = {
  year: number;
  month: number;
  deliveries: number;
  skipped: number;
  failed_balance: number;
  amount_spent: string;
};

export type FAQ = { id: number; topic: string; question: string; answer: string; sort_order: number };

export type SupportTicket = {
  ticket_number: string;
  order_number: string | null;
  reason: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "rejected";
  created_at: string;
};

export type AppNotification = {
  id: number;
  category: "order" | "promo" | "subscription" | "system";
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type NotificationPreferences = {
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  order_updates: boolean;
  promotions: boolean;
  subscription_reminders: boolean;
  updated_at: string;
};

// ---- Back-office (admin/ops) shapes — see apps/orders/admin_serializers ----
export type AdminOrder = {
  order_number: string;
  status: string;
  total: string;
  customer_phone: string;
  customer_name: string;
  address_snapshot: string;
  item_count: number;
  placed_at: string;
  rider: { rider_id: number; phone: string; vehicle_number: string; status: string } | null;
};

export type AdminRider = {
  id: number;
  phone: string;
  name: string;
  is_on_duty: boolean;
  load: number;
};

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  product_count: number;
};

export type AdminVariant = {
  id: number;
  label: string;
  sku: string;
  unit: string;
  quantity_value: string;
  fat_percent: string | null;
  price: string;
  mrp: string;
  stock: number;
  barcode: string;
  is_default: boolean;
  is_active: boolean;
  discount_percent: number;
  in_stock: boolean;
};

export type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  description: string;
  image_url: string;
  tags: string;
  category: number;
  category_name: string;
  is_active: boolean;
  variants: AdminVariant[];
  variant_count: number;
  total_stock: number;
  created_at: string;
};

// Dashboard reports (apps/reports)
export type DateRange = { start: string; end: string };
export type SalesReport = { start: string; end: string; orders: number; revenue: string; average_order_value: string };
export type OrderStatusReport = Record<string, number>;
export type TopProduct = { product_name: string; quantity: number; revenue: string };
export type SubscriptionReport = {
  active: number;
  paused: number;
  cancelled: number;
  total: number;
  new_in_period: number;
  cancelled_in_period: number;
};
export type RiderPerf = { rider: string; assignments: number; delivered: number; avg_rider_rating: number | null };

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.access;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    // When the backend is reached through an ngrok tunnel, skip its browser
    // interstitial so API responses come back as JSON, not an HTML warning page.
    headers.set("ngrok-skip-browser-warning", "1");
    return headers;
  },
});

// Transparent one-shot access-token refresh on 401, mirroring the web client.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  apiCtx,
  extra,
) => {
  let result = await rawBaseQuery(args, apiCtx, extra);
  if (result.error && result.error.status === 401) {
    const refresh = (apiCtx.getState() as RootState).auth.refresh;
    if (refresh) {
      const refreshRes = await rawBaseQuery(
        { url: "/auth/token/refresh/", method: "POST", body: { refresh } },
        apiCtx,
        extra,
      );
      const data = refreshRes.data as { access?: string } | undefined;
      if (data?.access) {
        apiCtx.dispatch(setTokens({ access: data.access }));
        await saveAccess(data.access);
        result = await rawBaseQuery(args, apiCtx, extra);
      } else {
        apiCtx.dispatch(logout());
        await clearTokens();
      }
    } else {
      apiCtx.dispatch(logout());
      await clearTokens();
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Me", "Address", "Rating", "Cart", "Wallet", "Order", "Subscription", "Support", "Notification", "NotifPref", "RiderDuty", "RiderDay", "AdminOrder", "AdminCategory", "AdminProduct"],
  endpoints: (build) => ({
    sendOtp: build.mutation<{ message: string }, { phone: string }>({
      query: (body) => ({ url: "/auth/otp/send/", method: "POST", body }),
    }),
    verifyOtp: build.mutation<
      { message: string; is_new_user: boolean; tokens: { access: string; refresh: string } },
      { phone: string; code: string }
    >({
      query: (body) => ({ url: "/auth/otp/verify/", method: "POST", body }),
    }),
    me: build.query<User, void>({
      query: () => "/auth/me/",
      providesTags: ["Me"],
    }),
    updateMe: build.mutation<User, { name?: string; email?: string; avatar?: string }>({
      query: (body) => ({ url: "/auth/me/", method: "PATCH", body }),
      invalidatesTags: ["Me"],
    }),
    banners: build.query<Banner[], void>({
      query: () => "/banners/",
    }),
    categories: build.query<Category[], void>({
      query: () => "/categories/",
      transformResponse: (r: Paginated<Category>) => r.results,
    }),
    products: build.query<CatalogProduct[], { category?: number; search?: string } | void>({
      query: (arg) => {
        const params: string[] = [];
        if (arg?.category) params.push(`category=${arg.category}`);
        if (arg?.search) params.push(`search=${encodeURIComponent(arg.search)}`);
        return `/products/${params.length ? `?${params.join("&")}` : ""}`;
      },
      transformResponse: (r: Paginated<CatalogProduct>) => r.results,
    }),
    productDetail: build.query<ProductDetail, string>({
      query: (slug) => `/products/${slug}/`,
    }),
    productRatings: build.query<
      { average: number; count: number; ratings: ProductRating[] },
      number
    >({
      query: (id) => `/support/products/${id}/rating/`,
      providesTags: ["Rating"],
    }),
    submitProductRating: build.mutation<unknown, { id: number; rating: number; comment: string }>({
      query: ({ id, ...body }) => ({
        url: `/support/products/${id}/rating/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Rating"],
    }),
    // Existing review for an order (404 when not yet rated — callers treat the
    // absence of data as "not rated").
    orderRating: build.query<OrderReview, string>({
      query: (orderNumber) => `/support/orders/${orderNumber}/rating/`,
      providesTags: ["Order"],
    }),
    submitOrderRating: build.mutation<
      OrderReview,
      { orderNumber: string; order_rating: number; rider_rating?: number | null; comment?: string }
    >({
      query: ({ orderNumber, ...body }) => ({
        url: `/support/orders/${orderNumber}/rating/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Order"],
    }),
    // Rider: duty status / vehicle, day summary (stats + COD + deliveries).
    riderDuty: build.query<RiderDuty, void>({
      query: () => "/rider/duty/",
      providesTags: ["RiderDuty"],
    }),
    setRiderDuty: build.mutation<RiderDuty, { on_duty: boolean; lat?: number; lng?: number }>({
      query: (body) => ({ url: "/rider/duty/", method: "POST", body }),
      invalidatesTags: ["RiderDuty"],
    }),
    riderDay: build.query<RiderDay, string | undefined>({
      query: (date) => `/rider/day/${date ? `?date=${date}` : ""}`,
      providesTags: ["RiderDay"],
    }),
    riderDeliveries: build.query<RiderDeliveriesList, RiderDeliveryKind>({
      query: (kind) => `/rider/deliveries/?kind=${kind}`,
      providesTags: ["RiderDay"],
    }),
    riderEarnings: build.query<RiderEarnings, string | undefined>({
      query: (date) => `/rider/earnings/${date ? `?date=${date}` : ""}`,
      providesTags: ["RiderDay"],
    }),
    acceptOrder: build.mutation<unknown, string>({
      query: (orderNumber) => ({ url: `/rider/orders/${orderNumber}/accept/`, method: "POST" }),
      invalidatesTags: ["RiderDay"],
    }),
    pickupOrder: build.mutation<unknown, string>({
      query: (orderNumber) => ({ url: `/rider/orders/${orderNumber}/pickup/`, method: "POST" }),
      invalidatesTags: ["RiderDay"],
    }),
    deliverOrder: build.mutation<unknown, { orderNumber: string; otp: string; proof_photo?: string; paid_via_upi?: boolean }>({
      query: ({ orderNumber, ...body }) => ({ url: `/rider/orders/${orderNumber}/deliver/`, method: "POST", body }),
      invalidatesTags: ["RiderDay"],
    }),
    returnOrder: build.mutation<unknown, { orderNumber: string; item_ids: number[]; reason?: string }>({
      query: ({ orderNumber, ...body }) => ({ url: `/rider/orders/${orderNumber}/return/`, method: "POST", body }),
      invalidatesTags: ["RiderDay"],
    }),
    addresses: build.query<Address[], void>({
      query: () => "/addresses/",
      transformResponse: (r: Address[] | Paginated<Address>) => (Array.isArray(r) ? r : r.results),
      providesTags: ["Address"],
    }),
    createAddress: build.mutation<Address, Partial<Address>>({
      query: (body) => ({ url: "/addresses/", method: "POST", body }),
      invalidatesTags: ["Address"],
    }),
    updateAddress: build.mutation<Address, { id: number } & Partial<Address>>({
      query: ({ id, ...body }) => ({ url: `/addresses/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Address"],
    }),
    deleteAddress: build.mutation<void, number>({
      query: (id) => ({ url: `/addresses/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Address"],
    }),
    cart: build.query<Cart, void>({
      query: () => "/cart/",
      providesTags: ["Cart"],
    }),
    addToCart: build.mutation<Cart, { variant_id: number; quantity?: number }>({
      query: (body) => ({ url: "/cart/add/", method: "POST", body }),
      // Optimistic: bump the quantity in the cached cart immediately so the
      // stepper/badge respond instantly; the invalidation refetch corrects the
      // bill (and replaces any temp line).
      async onQueryStarted({ variant_id, quantity = 1 }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData("cart", undefined, (draft) => {
            const item = draft.items.find((i) => i.variant === variant_id);
            if (item) item.quantity += quantity;
            else
              draft.items.push({
                id: -variant_id,
                variant: variant_id,
                quantity,
                product_name: "",
                product_slug: "",
                image_url: "",
                variant_label: "",
                price: "0",
                subtotal: "0",
              });
            draft.item_count = draft.items.reduce((s, i) => s + i.quantity, 0);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Cart"],
    }),
    updateCartItem: build.mutation<Cart, { item_id: number; quantity: number }>({
      query: ({ item_id, quantity }) => ({
        url: `/cart/items/${item_id}/`,
        method: "PATCH",
        body: { quantity },
      }),
      async onQueryStarted({ item_id, quantity }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData("cart", undefined, (draft) => {
            const item = draft.items.find((i) => i.id === item_id);
            if (item) item.quantity = quantity;
            draft.item_count = draft.items.reduce((s, i) => s + i.quantity, 0);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Cart"],
    }),
    removeCartItem: build.mutation<unknown, number>({
      query: (item_id) => ({ url: `/cart/items/${item_id}/`, method: "DELETE" }),
      async onQueryStarted(item_id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          api.util.updateQueryData("cart", undefined, (draft) => {
            draft.items = draft.items.filter((i) => i.id !== item_id);
            draft.item_count = draft.items.reduce((s, i) => s + i.quantity, 0);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ["Cart"],
    }),
    applyCoupon: build.mutation<Cart, string>({
      query: (code) => ({ url: "/cart/apply-coupon/", method: "POST", body: { code } }),
      invalidatesTags: ["Cart"],
    }),
    removeCoupon: build.mutation<Cart, void>({
      query: () => ({ url: "/cart/remove-coupon/", method: "POST", body: {} }),
      invalidatesTags: ["Cart"],
    }),
    deliverySlots: build.query<DeliverySlot[], void>({
      query: () => "/orders/delivery-slots/",
    }),
    orderWindow: build.query<OrderWindow, void>({
      query: () => "/orders/window/",
    }),
    serviceabilityCheck: build.query<
      ServiceabilityResult,
      { pincode?: string; lat?: number; lng?: number }
    >({
      query: (arg) => {
        const p: string[] = [];
        if (arg.pincode) p.push(`pincode=${encodeURIComponent(arg.pincode)}`);
        if (arg.lat != null) p.push(`lat=${arg.lat}`);
        if (arg.lng != null) p.push(`lng=${arg.lng}`);
        return `/serviceability/check/${p.length ? `?${p.join("&")}` : ""}`;
      },
    }),
    checkout: build.mutation<
      { order_number: string },
      { address_id: number; delivery_slot_id?: number; delivery_day?: "instant" | "next_day" }
    >({
      query: (body) => ({ url: "/orders/checkout/", method: "POST", body }),
      invalidatesTags: ["Cart", "Order"],
    }),
    orders: build.query<OrderSummary[], void>({
      query: () => "/orders/",
      providesTags: ["Order"],
    }),
    orderDetail: build.query<OrderDetail, string>({
      query: (orderNumber) => `/orders/${orderNumber}/`,
    }),
    invoiceForOrder: build.query<Invoice, string>({
      query: (orderNumber) => `/invoices/${orderNumber}/`,
    }),
    initiatePayment: build.mutation<unknown, { order_number: string; method: string }>({
      query: (body) => ({ url: "/payments/initiate/", method: "POST", body }),
    }),
    wallet: build.query<Wallet, void>({
      query: () => "/wallet/",
      providesTags: ["Wallet"],
    }),
    walletTopup: build.mutation<WalletTopupCreated, number>({
      query: (amount) => ({ url: "/wallet/topup/", method: "POST", body: { amount } }),
    }),
    // Poll the top-up's status — the source of truth across web/iOS/Android. A
    // real gateway confirms via webhook; the response carries the fresh wallet.
    walletTopupStatus: build.query<WalletTopupStatus, number>({
      query: (topupId) => `/wallet/topup/${topupId}/status/`,
    }),
    walletMockPay: build.mutation<unknown, string>({
      query: (gateway_order_id) => ({
        url: "/wallet/topup/mock-pay/",
        method: "POST",
        body: { gateway_order_id },
      }),
      invalidatesTags: ["Wallet"],
    }),
    subscriptions: build.query<Subscription[], void>({
      query: () => "/subscriptions/",
      transformResponse: (r: Subscription[] | Paginated<Subscription>) =>
        Array.isArray(r) ? r : r.results,
      providesTags: ["Subscription"],
    }),
    createSubscription: build.mutation<
      Subscription,
      {
        variant_id: number;
        quantity: number;
        frequency: string;
        address_id: number;
        preferred_time: string | null;
        payment_method: string;
        start_date: string;
      }
    >({
      query: (body) => ({ url: "/subscriptions/", method: "POST", body }),
      invalidatesTags: ["Subscription"],
    }),
    updateSubscription: build.mutation<
      Subscription,
      {
        id: number;
        quantity?: number;
        frequency?: string;
        address_id?: number;
        preferred_time?: string | null;
        payment_method?: string;
      }
    >({
      query: ({ id, ...body }) => ({ url: `/subscriptions/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Subscription"],
    }),
    subscriptionSummary: build.query<SubscriptionSummary, void>({
      query: () => "/subscriptions/summary/",
      providesTags: ["Subscription"],
    }),
    pauseSubscription: build.mutation<Subscription, number>({
      query: (id) => ({ url: `/subscriptions/${id}/pause/`, method: "POST" }),
      invalidatesTags: ["Subscription"],
    }),
    resumeSubscription: build.mutation<Subscription, number>({
      query: (id) => ({ url: `/subscriptions/${id}/resume/`, method: "POST" }),
      invalidatesTags: ["Subscription"],
    }),
    cancelSubscription: build.mutation<void, number>({
      query: (id) => ({ url: `/subscriptions/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Subscription"],
    }),
    addVacation: build.mutation<
      SubscriptionVacation,
      { id: number; start_date: string; end_date: string }
    >({
      query: ({ id, ...body }) => ({ url: `/subscriptions/${id}/vacation/`, method: "POST", body }),
      invalidatesTags: ["Subscription"],
    }),
    removeVacation: build.mutation<void, { id: number; vacationId: number }>({
      query: ({ id, vacationId }) => ({
        url: `/subscriptions/${id}/vacation/${vacationId}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Subscription"],
    }),
    faqs: build.query<FAQ[], void>({
      query: () => "/support/faqs/",
      transformResponse: (r: FAQ[] | Paginated<FAQ>) => (Array.isArray(r) ? r : r.results),
    }),
    supportTickets: build.query<SupportTicket[], void>({
      query: () => "/support/tickets/",
      transformResponse: (r: SupportTicket[] | Paginated<SupportTicket>) =>
        Array.isArray(r) ? r : r.results,
      providesTags: ["Support"],
    }),
    createSupportTicket: build.mutation<
      SupportTicket,
      { reason: string; subject: string; description?: string; order_number?: string | null }
    >({
      query: (body) => ({ url: "/support/tickets/", method: "POST", body }),
      invalidatesTags: ["Support"],
    }),
    notifications: build.query<AppNotification[], void>({
      query: () => "/notifications/",
      transformResponse: (r: AppNotification[] | Paginated<AppNotification>) =>
        Array.isArray(r) ? r : r.results,
      providesTags: ["Notification"],
    }),
    unreadCount: build.query<{ unread_count: number }, void>({
      query: () => "/notifications/unread-count/",
      providesTags: ["Notification"],
    }),
    markNotificationRead: build.mutation<AppNotification, number>({
      query: (id) => ({ url: `/notifications/${id}/read/`, method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
    markAllNotificationsRead: build.mutation<{ updated: number }, void>({
      query: () => ({ url: "/notifications/read-all/", method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
    notificationPreferences: build.query<NotificationPreferences, void>({
      query: () => "/notifications/preferences/",
      providesTags: ["NotifPref"],
    }),
    updateNotificationPreferences: build.mutation<
      NotificationPreferences,
      Partial<NotificationPreferences>
    >({
      query: (body) => ({ url: "/notifications/preferences/", method: "PUT", body }),
      // Optimistic: flip the switch instantly, roll back if the save fails.
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          api.util.updateQueryData("notificationPreferences", undefined, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          undo.undo();
        }
      },
    }),
    // Register this device's Expo push token so the backend can push to it.
    registerDevice: build.mutation<unknown, { token: string; platform: string }>({
      query: (body) => ({ url: "/notifications/devices/", method: "POST", body }),
    }),

    // ---- Back-office (admin/ops) — gated server-side by staff-role perms -----
    adminOrders: build.query<AdminOrder[], { status?: string; start?: string; end?: string } | void>({
      query: (arg) => {
        const p: string[] = [];
        if (arg?.status) p.push(`status=${arg.status}`);
        if (arg?.start) p.push(`start=${arg.start}`);
        if (arg?.end) p.push(`end=${arg.end}`);
        return `/admin/orders/${p.length ? `?${p.join("&")}` : ""}`;
      },
      providesTags: ["AdminOrder"],
    }),
    adminRiders: build.query<AdminRider[], void>({
      query: () => "/admin/riders/",
    }),
    adminConfirmOrder: build.mutation<unknown, string>({
      query: (orderNumber) => ({ url: `/admin/orders/${orderNumber}/confirm/`, method: "POST" }),
      invalidatesTags: ["AdminOrder"],
    }),
    adminCancelOrder: build.mutation<unknown, string>({
      query: (orderNumber) => ({ url: `/admin/orders/${orderNumber}/cancel/`, method: "POST" }),
      invalidatesTags: ["AdminOrder"],
    }),
    adminAssignOrder: build.mutation<unknown, { orderNumber: string; rider_id?: number }>({
      query: ({ orderNumber, rider_id }) => ({
        url: `/admin/orders/${orderNumber}/assign/`,
        method: "POST",
        body: rider_id ? { rider_id } : {},
      }),
      invalidatesTags: ["AdminOrder"],
    }),

    // Catalog management (categories, products, variants)
    adminCategories: build.query<AdminCategory[], void>({
      query: () => "/admin/catalog/categories/",
      providesTags: ["AdminCategory"],
    }),
    adminCreateCategory: build.mutation<AdminCategory, Partial<AdminCategory>>({
      query: (body) => ({ url: "/admin/catalog/categories/", method: "POST", body }),
      invalidatesTags: ["AdminCategory"],
    }),
    adminUpdateCategory: build.mutation<AdminCategory, { id: number } & Partial<AdminCategory>>({
      query: ({ id, ...body }) => ({ url: `/admin/catalog/categories/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["AdminCategory"],
    }),
    adminDeleteCategory: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/catalog/categories/${id}/`, method: "DELETE" }),
      invalidatesTags: ["AdminCategory", "AdminProduct"],
    }),
    adminProducts: build.query<AdminProduct[], void>({
      query: () => "/admin/catalog/products/",
      providesTags: ["AdminProduct"],
    }),
    adminProduct: build.query<AdminProduct, number>({
      query: (id) => `/admin/catalog/products/${id}/`,
      providesTags: ["AdminProduct"],
    }),
    adminCreateProduct: build.mutation<AdminProduct, Partial<AdminProduct>>({
      query: (body) => ({ url: "/admin/catalog/products/", method: "POST", body }),
      invalidatesTags: ["AdminProduct"],
    }),
    adminUpdateProduct: build.mutation<AdminProduct, { id: number } & Partial<AdminProduct>>({
      query: ({ id, ...body }) => ({ url: `/admin/catalog/products/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["AdminProduct"],
    }),
    adminDeleteProduct: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/catalog/products/${id}/`, method: "DELETE" }),
      invalidatesTags: ["AdminProduct"],
    }),
    adminCreateVariant: build.mutation<AdminVariant, { productId: number } & Partial<AdminVariant>>({
      query: ({ productId, ...body }) => ({ url: `/admin/catalog/products/${productId}/variants/`, method: "POST", body }),
      invalidatesTags: ["AdminProduct"],
    }),
    adminUpdateVariant: build.mutation<AdminVariant, { id: number } & Partial<AdminVariant>>({
      query: ({ id, ...body }) => ({ url: `/admin/catalog/variants/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["AdminProduct"],
    }),
    adminDeleteVariant: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/catalog/variants/${id}/`, method: "DELETE" }),
      invalidatesTags: ["AdminProduct"],
    }),

    // Dashboard reports (read-only, parameterised by a date range)
    adminSales: build.query<SalesReport, DateRange>({
      query: ({ start, end }) => `/reports/sales/?start=${start}&end=${end}`,
    }),
    adminOrderStatus: build.query<OrderStatusReport, DateRange>({
      query: ({ start, end }) => `/reports/order-status/?start=${start}&end=${end}`,
    }),
    adminTopProducts: build.query<TopProduct[], DateRange & { limit?: number }>({
      query: ({ start, end, limit = 8 }) => `/reports/top-products/?start=${start}&end=${end}&limit=${limit}`,
    }),
    adminSubscriptionReport: build.query<SubscriptionReport, DateRange>({
      query: ({ start, end }) => `/reports/subscriptions/?start=${start}&end=${end}`,
    }),
    adminRiderReport: build.query<RiderPerf[], DateRange>({
      query: ({ start, end }) => `/reports/riders/?start=${start}&end=${end}`,
    }),
  }),
});

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useMeQuery,
  useLazyMeQuery,
  useUpdateMeMutation,
  useBannersQuery,
  useCategoriesQuery,
  useProductsQuery,
  useProductDetailQuery,
  useProductRatingsQuery,
  useSubmitProductRatingMutation,
  useOrderRatingQuery,
  useSubmitOrderRatingMutation,
  useRiderDutyQuery,
  useSetRiderDutyMutation,
  useRiderDayQuery,
  useRiderDeliveriesQuery,
  useRiderEarningsQuery,
  useAcceptOrderMutation,
  usePickupOrderMutation,
  useDeliverOrderMutation,
  useReturnOrderMutation,
  useAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useApplyCouponMutation,
  useRemoveCouponMutation,
  useDeliverySlotsQuery,
  useOrderWindowQuery,
  useServiceabilityCheckQuery,
  useCheckoutMutation,
  useOrdersQuery,
  useOrderDetailQuery,
  useLazyInvoiceForOrderQuery,
  useInitiatePaymentMutation,
  useWalletQuery,
  useWalletTopupMutation,
  useLazyWalletTopupStatusQuery,
  useWalletMockPayMutation,
  useSubscriptionsQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  useSubscriptionSummaryQuery,
  usePauseSubscriptionMutation,
  useResumeSubscriptionMutation,
  useCancelSubscriptionMutation,
  useAddVacationMutation,
  useRemoveVacationMutation,
  useFaqsQuery,
  useSupportTicketsQuery,
  useCreateSupportTicketMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useRegisterDeviceMutation,
  useAdminOrdersQuery,
  useAdminRidersQuery,
  useAdminConfirmOrderMutation,
  useAdminCancelOrderMutation,
  useAdminAssignOrderMutation,
  useAdminCategoriesQuery,
  useAdminCreateCategoryMutation,
  useAdminUpdateCategoryMutation,
  useAdminDeleteCategoryMutation,
  useAdminProductsQuery,
  useAdminProductQuery,
  useAdminCreateProductMutation,
  useAdminUpdateProductMutation,
  useAdminDeleteProductMutation,
  useAdminCreateVariantMutation,
  useAdminUpdateVariantMutation,
  useAdminDeleteVariantMutation,
  useAdminSalesQuery,
  useAdminOrderStatusQuery,
  useAdminTopProductsQuery,
  useAdminSubscriptionReportQuery,
  useAdminRiderReportQuery,
} = api;
