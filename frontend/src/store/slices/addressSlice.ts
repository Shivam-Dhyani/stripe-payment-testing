import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { Address } from '../../types';

const STORAGE_KEY = 'selected_address_id';

interface AddressState {
  addresses: Address[];
  selectedId: string | null;
  loaded: boolean;
}

const initialState: AddressState = {
  addresses: [],
  selectedId: localStorage.getItem(STORAGE_KEY),
  loaded: false,
};

export const fetchAddresses = createAsyncThunk('address/fetch', async () => {
  return await authService.getAddresses();
});

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    setSelectedAddress: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload;
      if (action.payload) localStorage.setItem(STORAGE_KEY, action.payload);
      else localStorage.removeItem(STORAGE_KEY);
    },
    clearAddresses: (state) => {
      state.addresses = [];
      state.selectedId = null;
      state.loaded = false;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAddresses.fulfilled, (state, action) => {
      state.addresses = action.payload;
      state.loaded = true;
      const ids = action.payload.map((a) => a.id);
      // Keep the stored selection if still valid; otherwise pick default/first.
      if (!state.selectedId || !ids.includes(state.selectedId)) {
        const fallback = action.payload.find((a) => a.is_default) || action.payload[0];
        state.selectedId = fallback ? fallback.id : null;
        if (fallback) localStorage.setItem(STORAGE_KEY, fallback.id);
        else localStorage.removeItem(STORAGE_KEY);
      }
    });
  },
});

export const { setSelectedAddress, clearAddresses } = addressSlice.actions;
export default addressSlice.reducer;
