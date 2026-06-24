import { configureStore } from "@reduxjs/toolkit";

import { api } from "../api/baseApi";
import authReducer from "./authSlice";
import wishlistReducer from "./wishlistSlice";
import { saveWishlist } from "./wishlistStorage";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    wishlist: wishlistReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// Persist the wishlist to AsyncStorage whenever it changes (Immer returns a
// fresh array reference on change, so the identity check keeps writes minimal).
let lastWishlist = store.getState().wishlist.items;
store.subscribe(() => {
  const current = store.getState().wishlist.items;
  if (current !== lastWishlist) {
    lastWishlist = current;
    saveWishlist(current);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
