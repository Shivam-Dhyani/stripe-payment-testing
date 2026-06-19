import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminCartService } from '../../services/adminCartService';
import { AdminCartUser } from '../../types';

interface AdminCartState {
  carts: AdminCartUser[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminCartState = {
  carts: [],
  loading: false,
  error: null,
};

export const fetchAllCarts = createAsyncThunk('adminCart/fetchAll', async () => {
  return await adminCartService.getAllCarts();
});

const adminCartSlice = createSlice({
  name: 'adminCart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllCarts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllCarts.fulfilled, (state, action) => {
        state.loading = false;
        state.carts = action.payload;
      })
      .addCase(fetchAllCarts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch carts';
      });
  },
});

export default adminCartSlice.reducer;
