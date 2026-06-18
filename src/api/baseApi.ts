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
  tagTypes: ["Me"],
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
    banners: build.query<Banner[], void>({
      query: () => "/banners/",
    }),
  }),
});

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useMeQuery,
  useLazyMeQuery,
  useBannersQuery,
} = api;
