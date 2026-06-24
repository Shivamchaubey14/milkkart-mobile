import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// A client-side wishlist (no backend endpoint — mirrors the web's localStorage
// wishlist), persisted to AsyncStorage. Keyed by product slug.
export type WishlistItem = {
  slug: string;
  name: string;
  image_url: string;
  price: string;
  variant_id?: number;
};

interface WishlistState {
  items: WishlistItem[];
}

const initialState: WishlistState = { items: [] };

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    hydrateWishlist(state, action: PayloadAction<WishlistItem[]>) {
      state.items = action.payload;
    },
    toggleWishlist(state, action: PayloadAction<WishlistItem>) {
      const i = state.items.findIndex((x) => x.slug === action.payload.slug);
      if (i >= 0) state.items.splice(i, 1);
      else state.items.unshift(action.payload);
    },
    removeWishlist(state, action: PayloadAction<string>) {
      state.items = state.items.filter((x) => x.slug !== action.payload);
    },
  },
});

export const { hydrateWishlist, toggleWishlist, removeWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
