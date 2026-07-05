import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService } from '../../services/cartService';
import { CartItem, Product } from '../../types';
import { getGuestCart, guestAdd, guestUpdate, guestRemove, clearGuestCart } from '../../utils/guestCart';
import type { RootState } from '../index';
// No success toasts for cart actions — the cart badge is the feedback.
// Errors surface globally via the axios response interceptor.

interface CartState {
  items: CartItem[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  loading: false,
  submitting: false,
  error: null,
};

const isAuthed = (getState: () => unknown) => !!(getState() as RootState).auth.user;

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { getState }) => {
  return isAuthed(getState) ? await cartService.getCart() : getGuestCart();
});

// Adds accept the full product so a guest cart can render offline.
export const addToCart = createAsyncThunk(
  'cart/add',
  async ({ product, quantity }: { product: Product; quantity: number }, { getState }) => {
    if (isAuthed(getState)) {
      await cartService.addItem(product.id, quantity);
      return await cartService.getCart();
    }
    return guestAdd(product, quantity);
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/update',
  async ({ itemId, quantity }: { itemId: string; quantity: number }, { getState }) => {
    if (isAuthed(getState)) {
      await cartService.updateItem(itemId, quantity);
      return await cartService.getCart();
    }
    return guestUpdate(itemId, quantity);
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/remove',
  async (itemId: string, { getState }) => {
    if (isAuthed(getState)) {
      await cartService.removeItem(itemId);
      return await cartService.getCart();
    }
    return guestRemove(itemId);
  }
);

export const clearCart = createAsyncThunk('cart/clear', async (_, { getState }) => {
  if (isAuthed(getState)) await cartService.clearCart();
  else clearGuestCart();
  return [] as CartItem[];
});

// On login, push any guest-cart items to the server, then load the merged cart.
export const mergeGuestCart = createAsyncThunk('cart/merge', async () => {
  const guest = getGuestCart();
  for (const it of guest) {
    try {
      await cartService.addItem(it.product_id, it.quantity);
    } catch {
      /* skip items that fail (e.g. out of stock) */
    }
  }
  clearGuestCart();
  return await cartService.getCart();
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.loading = true; })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cart';
      })
      .addCase(addToCart.pending, (state) => { state.submitting = true; })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = action.payload;
      })
      .addCase(addToCart.rejected, (state) => { state.submitting = false; })
      .addCase(updateCartItem.pending, (state) => { state.submitting = true; })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = action.payload;
      })
      .addCase(updateCartItem.rejected, (state) => { state.submitting = false; })
      .addCase(removeFromCart.pending, (state) => { state.submitting = true; })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = action.payload;
      })
      .addCase(removeFromCart.rejected, (state) => { state.submitting = false; })
      .addCase(mergeGuestCart.fulfilled, (state, action) => { state.items = action.payload; })
      .addCase(clearCart.fulfilled, (state) => { state.items = []; });
  },
});

export default cartSlice.reducer;
