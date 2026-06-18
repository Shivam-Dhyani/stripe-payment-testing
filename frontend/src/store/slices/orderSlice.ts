import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderService } from '../../services/orderService';
import { Order } from '../../types';
import toast from 'react-hot-toast';

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
  checkoutData: { order: Order; client_secret: string } | null;
}

const initialState: OrderState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,
  checkoutData: null,
};

export const checkout = createAsyncThunk(
  'orders/checkout',
  async (addressId: number, { rejectWithValue }) => {
    try {
      return await orderService.checkout(addressId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Checkout failed');
    }
  }
);

export const confirmPayment = createAsyncThunk(
  'orders/confirmPayment',
  async ({ orderId, paymentIntentId }: { orderId: number; paymentIntentId: string }, { rejectWithValue }) => {
    try {
      const order = await orderService.confirmPayment(orderId, paymentIntentId);
      toast.success('Payment confirmed! Order placed successfully.');
      return order;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Payment confirmation failed');
    }
  }
);

export const fetchOrders = createAsyncThunk('orders/fetchAll', async () => {
  return await orderService.getOrders();
});

export const fetchAllOrders = createAsyncThunk('orders/fetchAllAdmin', async () => {
  return await orderService.getAllOrders();
});

export const fetchOrderById = createAsyncThunk('orders/fetchById', async (id: number) => {
  return await orderService.getOrderById(id);
});

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, status }: { id: number; status: string }, { rejectWithValue }) => {
    try {
      const order = await orderService.updateOrderStatus(id, status);
      toast.success('Order status updated');
      return order;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update status');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearCheckoutData: (state) => {
      state.checkoutData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkout.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(checkout.fulfilled, (state, action) => {
        state.loading = false;
        state.checkoutData = action.payload;
      })
      .addCase(checkout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(confirmPayment.pending, (state) => { state.loading = true; })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.checkoutData = null;
        state.selectedOrder = action.payload;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      })
      .addCase(fetchAllOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchAllOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.selectedOrder = action.payload;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const index = state.orders.findIndex(o => o.id === action.payload.id);
        if (index !== -1) state.orders[index] = action.payload;
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      });
  },
});

export const { clearCheckoutData } = orderSlice.actions;
export default orderSlice.reducer;
