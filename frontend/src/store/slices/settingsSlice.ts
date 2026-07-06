import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsService } from '../../services/settingsService';
import { StoreSettings } from '../../types';
import { DEFAULT_STORE_SETTINGS } from '../../config/fees';

interface SettingsState {
  settings: StoreSettings;
  loaded: boolean;
  saving: boolean;
}

const initialState: SettingsState = {
  settings: DEFAULT_STORE_SETTINGS,
  loaded: false,
  saving: false,
};

export const fetchStoreSettings = createAsyncThunk('settings/fetch', async () => {
  return await settingsService.get();
});

export const updateStoreSettings = createAsyncThunk(
  'settings/update',
  async (data: Partial<StoreSettings>) => {
    return await settingsService.update(data);
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStoreSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.loaded = true;
      })
      .addCase(updateStoreSettings.pending, (state) => { state.saving = true; })
      .addCase(updateStoreSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.settings = action.payload;
      })
      .addCase(updateStoreSettings.rejected, (state) => { state.saving = false; });
  },
});

export default settingsSlice.reducer;
