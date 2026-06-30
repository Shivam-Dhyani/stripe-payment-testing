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

export const schedulePickup = createAsyncThunk(
  'returns/schedulePickup',
  async ({ id, data }: { id: string; data: { pickup_date: string; pickup_address?: string } }, { rejectWithValue }) => {
    try {
      const result = await returnService.schedulePickup(id, data);
      toast.success('Pickup scheduled');
      return result;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to schedule pickup');
      return rejectWithValue(detail || 'Failed');
    }
  }
);

export const confirmHandover = createAsyncThunk(
  'returns/confirmHandover',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await returnService.confirmHandover(id);
      toast.success('Hand-over confirmed');
      return result;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to confirm hand-over');
      return rejectWithValue(detail || 'Failed');
    }
  }
);

export const withdrawReturn = createAsyncThunk(
  'returns/withdraw',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await returnService.withdraw(id);
      toast.success('Return request withdrawn');
      return result;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to withdraw return');
      return rejectWithValue(detail || 'Failed');
    }
  }
);

const upsertRequest = (state: ReturnState, payload: ReturnRequest) => {
  const index = state.requests.findIndex((r) => r.id === payload.id);
  if (index !== -1) state.requests[index] = payload;
};

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
        upsertRequest(state, action.payload);
      })
      .addCase(resolveReturnRequest.rejected, (state) => { state.submitting = false; })
      .addCase(schedulePickup.pending, (state) => { state.submitting = true; })
      .addCase(schedulePickup.fulfilled, (state, action) => { state.submitting = false; upsertRequest(state, action.payload); })
      .addCase(schedulePickup.rejected, (state) => { state.submitting = false; })
      .addCase(confirmHandover.pending, (state) => { state.submitting = true; })
      .addCase(confirmHandover.fulfilled, (state, action) => { state.submitting = false; upsertRequest(state, action.payload); })
      .addCase(confirmHandover.rejected, (state) => { state.submitting = false; })
      .addCase(withdrawReturn.pending, (state) => { state.submitting = true; })
      .addCase(withdrawReturn.fulfilled, (state, action) => { state.submitting = false; upsertRequest(state, action.payload); })
      .addCase(withdrawReturn.rejected, (state) => { state.submitting = false; });
  },
});

export default returnSlice.reducer;
