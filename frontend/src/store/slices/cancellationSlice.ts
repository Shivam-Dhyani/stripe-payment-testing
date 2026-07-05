import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cancellationService } from '../../services/cancellationService';
import { CancellationRequest } from '../../types';
import toast from 'react-hot-toast';

interface CancellationState {
  requests: CancellationRequest[];
  pendingCount: number;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: CancellationState = {
  requests: [],
  pendingCount: 0,
  loading: false,
  submitting: false,
  error: null,
};

export const fetchCancellationRequests = createAsyncThunk(
  'cancellations/fetchAll',
  async () => {
    return await cancellationService.getAll();
  }
);

export const fetchCancellationPendingCount = createAsyncThunk(
  'cancellations/fetchPendingCount',
  async () => {
    const result = await cancellationService.getPendingCount();
    return result.count;
  }
);

export const createCancellationRequest = createAsyncThunk(
  'cancellations/create',
  async (data: { order_id: string; reason: string }, { rejectWithValue }) => {
    try {
      const result = await cancellationService.create(data);
      return result;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to submit cancellation request');
      return rejectWithValue(detail || 'Failed');
    }
  }
);

export const resolveCancellationRequest = createAsyncThunk(
  'cancellations/resolve',
  async ({ id, data }: { id: string; data: { status: string; admin_notes?: string } }, { rejectWithValue }) => {
    try {
      const result = await cancellationService.resolve(id, data);
      toast.success(`Cancellation request ${data.status}`);
      return result;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to resolve request');
      return rejectWithValue(detail || 'Failed');
    }
  }
);

const cancellationSlice = createSlice({
  name: 'cancellations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCancellationRequests.pending, (state) => { state.loading = true; })
      .addCase(fetchCancellationRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchCancellationRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch';
      })
      .addCase(fetchCancellationPendingCount.fulfilled, (state, action) => {
        state.pendingCount = action.payload;
      })
      .addCase(createCancellationRequest.pending, (state) => { state.submitting = true; })
      .addCase(createCancellationRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.requests.unshift(action.payload);
      })
      .addCase(createCancellationRequest.rejected, (state) => { state.submitting = false; })
      .addCase(resolveCancellationRequest.pending, (state) => { state.submitting = true; })
      .addCase(resolveCancellationRequest.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.requests.findIndex(r => r.id === action.payload.id);
        if (index !== -1) state.requests[index] = action.payload;
        state.pendingCount = state.requests.filter(r => r.status === 'pending').length;
      })
      .addCase(resolveCancellationRequest.rejected, (state) => { state.submitting = false; });
  },
});

export default cancellationSlice.reducer;
