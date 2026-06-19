import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Local cart for now (no backend cart wired yet). Each line keeps a small
// product snapshot so the cart screen can render without re-fetching.
export interface CartLine {
  id: number; // product id
  name: string;
  variantLabel: string;
  price: number;
  image: string; // image_url (relative path; resolve with imageUrl)
  slug: string;
  qty: number;
}

interface CartState {
  items: Record<number, CartLine>;
}

const initialState: CartState = { items: {} };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartLine, "qty">>) {
      const p = action.payload;
      const existing = state.items[p.id];
      if (existing) existing.qty += 1;
      else state.items[p.id] = { ...p, qty: 1 };
    },
    removeItem(state, action: PayloadAction<number>) {
      const id = action.payload;
      const existing = state.items[id];
      if (!existing) return;
      if (existing.qty <= 1) delete state.items[id];
      else existing.qty -= 1;
    },
    clearCart(state) {
      state.items = {};
    },
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

export const selectCartCount = (items: Record<number, CartLine>) =>
  Object.values(items).reduce((sum, line) => sum + line.qty, 0);
