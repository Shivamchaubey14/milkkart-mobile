import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Local cart count for now (no backend cart wired yet): a map of productId → qty.
// Drives the badge over the Cart tab and the Add ↔ stepper on product cards.
interface CartState {
  items: Record<number, number>;
}

const initialState: CartState = { items: {} };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<number>) {
      const id = action.payload;
      state.items[id] = (state.items[id] || 0) + 1;
    },
    removeItem(state, action: PayloadAction<number>) {
      const id = action.payload;
      const next = (state.items[id] || 0) - 1;
      if (next <= 0) delete state.items[id];
      else state.items[id] = next;
    },
    clearCart(state) {
      state.items = {};
    },
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// Total number of items in the cart.
export const selectCartCount = (items: Record<number, number>) =>
  Object.values(items).reduce((sum, qty) => sum + qty, 0);
