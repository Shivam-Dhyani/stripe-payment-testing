import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import categoryReducer from './slices/categorySlice';
import productReducer from './slices/productSlice';
import cartReducer from './slices/cartSlice';
import orderReducer from './slices/orderSlice';
import adminCartReducer from './slices/adminCartSlice';
import cancellationReducer from './slices/cancellationSlice';
import returnReducer from './slices/returnSlice';
import addressReducer from './slices/addressSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    categories: categoryReducer,
    products: productReducer,
    cart: cartReducer,
    orders: orderReducer,
    adminCart: adminCartReducer,
    cancellations: cancellationReducer,
    returns: returnReducer,
    address: addressReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
