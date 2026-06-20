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

export type OrderSummary = {
  id: number;
  order_number: string;
  status: string;
  total: string;
  item_count: number;
  placed_at: string;
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

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.access;
    if (token) headers.set("Authorization", `Bearer ${token}`);
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
  tagTypes: ["Me", "Address", "Rating", "Cart", "Wallet", "Order"],
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
    updateMe: build.mutation<User, { name?: string; email?: string }>({
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
    checkout: build.mutation<{ order_number: string }, { address_id: number; delivery_slot_id?: number }>({
      query: (body) => ({ url: "/orders/checkout/", method: "POST", body }),
      invalidatesTags: ["Cart", "Order"],
    }),
    orders: build.query<OrderSummary[], void>({
      query: () => "/orders/",
      providesTags: ["Order"],
    }),
    initiatePayment: build.mutation<unknown, { order_number: string; method: string }>({
      query: (body) => ({ url: "/payments/initiate/", method: "POST", body }),
    }),
    wallet: build.query<Wallet, void>({
      query: () => "/wallet/",
      providesTags: ["Wallet"],
    }),
    walletTopup: build.mutation<{ topup_id: number; gateway: { order_id: string } }, number>({
      query: (amount) => ({ url: "/wallet/topup/", method: "POST", body: { amount } }),
    }),
    walletMockPay: build.mutation<unknown, string>({
      query: (gateway_order_id) => ({
        url: "/wallet/topup/mock-pay/",
        method: "POST",
        body: { gateway_order_id },
      }),
      invalidatesTags: ["Wallet"],
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
  useServiceabilityCheckQuery,
  useCheckoutMutation,
  useOrdersQuery,
  useInitiatePaymentMutation,
  useWalletQuery,
  useWalletTopupMutation,
  useWalletMockPayMutation,
} = api;
