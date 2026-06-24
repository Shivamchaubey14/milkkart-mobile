import * as SecureStore from "expo-secure-store";

import type { WishlistItem } from "./wishlistSlice";

// Persisted wishlist, the RN equivalent of the web's localStorage "mk_wishlist".
// Uses expo-secure-store (already used for auth tokens) so no extra native module
// is needed — the data is small (slug, name, image path, price per item).
const KEY = "mk_wishlist";

export async function loadWishlist(): Promise<WishlistItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveWishlist(items: WishlistItem[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(items));
  } catch {
    /* best-effort persistence */
  }
}
