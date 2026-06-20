import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { returnService } from '../../services/returnService';
import { ReturnRequest } from '../../types';
import toast from 'react-hot-toast';

interface ReturnState {
  requests: ReturnRequest[];
  pendingCount: number;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: ReturnState = {
  requests: [],
  pendingCount: 0,
  loading: false,
  submitting: false,
  error: null,
};

export const fetchReturnRequests = createAsyncThunk(
  'returns/fetchAll',
  async () => {
    return await returnService.getAll();
  }
);

export const fetchReturnPendingCount = createAsyncThunk(
  'returns/fetchPendingCount',
  async () => {
    const result = await returnService.getPendingCount();
    return result.count;
  }
);

export const createReturnRequest = createAsyncThunk(
  'returns/create',
  async (data: { order_id: string; reason: string; items: { order_item_id: string; quantity: number }[] }, { rejectWithValue }) => {
    try {
      const result = await returnService.create(data);
      toast.success('Return request submitted');
      return result;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to submit return request');
      return rejectWithValue(detail || 'Failed');
    }
  }
);

export const resolveReturnRequest = createAsyncThunk(
  'returns/resolve',
  async ({ id, data }: { id: string; data: { status: string; admin_notes?: string; pickup_date?: string; pickup_address?: string } }, { rejectWithValue }) => {
    try {
      const result = await returnService.resolve(id, data);
      toast.success(`Return request updated`);
      return result;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update request');
      return rejectWithValue(detail || 'Failed');
    }
  }
);

const returnSlice = createSlice({
  name: 'returns',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReturnRequests.pending, (state) => { state.loading = true; })
      .addCase(fetchReturnRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchReturnRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch';
      })
      .addCase(fetchReturnPendingCount.fulfilled, (state, action) => {
        state.pendingCount = action.payload;
      })
      .addCase(createReturnRequest.pending, (state) => { state.submitting = true; })
      .addCase(createReturnRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.requests.unshift(action.payload);
      })
      .addCase(createReturnRequest.rejected, (state) => { state.submitting = false; })
      .addCase(resolveReturnRequest.pending, (state) => { state.submitting = true; })
      .addCase(resolveReturnRequest.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.requests.findIndex(r => r.id === action.payload.id);
        if (index !== -1) state.requests[index] = action.payload;
      })
      .addCase(resolveReturnRequest.rejected, (state) => { state.submitting = false; });
  },
});

export default returnSlice.reducer;
