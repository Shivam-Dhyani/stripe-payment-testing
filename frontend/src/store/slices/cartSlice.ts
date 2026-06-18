import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService } from '../../services/cartService';
import { CartItem } from '../../types';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchCart = createAsyncThunk('cart/fetch', async () => {
  return await cartService.getCart();
});

export const addToCart = createAsyncThunk(
  'cart/add',
  async ({ productId, quantity }: { productId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const item = await cartService.addItem(productId, quantity);
      toast.success('Added to cart');
      return item;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to add to cart');
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/update',
  async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
    return await cartService.updateItem(itemId, quantity);
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/remove',
  async (itemId: string) => {
    await cartService.removeItem(itemId);
    toast.success('Removed from cart');
    return itemId;
  }
);

export const clearCart = createAsyncThunk('cart/clear', async () => {
  await cartService.clearCart();
  return [];
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
      .addCase(addToCart.fulfilled, (state, action) => {
        const existingIndex = state.items.findIndex(item => item.product_id === action.payload.product_id);
        if (existingIndex !== -1) {
          state.items[existingIndex] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.items = [];
      });
  },
});

export default cartSlice.reducer;
