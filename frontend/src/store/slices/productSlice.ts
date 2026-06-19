import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from '../../services/productService';
import { Product, ProductFilters } from '../../types';
import toast from 'react-hot-toast';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    size: number;
    pages: number;
  };
}

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  loading: false,
  submitting: false,
  error: null,
  pagination: { total: 0, page: 1, size: 12, pages: 0 },
};

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async (filters?: ProductFilters) => {
    return await productService.getAll(filters);
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchById',
  async (id: string) => {
    return await productService.getById(id);
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async (data: Partial<Product>, { rejectWithValue }) => {
    try {
      const product = await productService.create(data);
      toast.success('Product created successfully');
      return product;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, data }: { id: string; data: Partial<Product> }, { rejectWithValue }) => {
    try {
      const product = await productService.update(id, data);
      toast.success('Product updated successfully');
      return product;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await productService.delete(id);
      toast.success('Product deleted successfully');
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete product');
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.items;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          size: action.payload.size,
          pages: action.payload.pages,
        };
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch products';
      })
      .addCase(fetchProductById.pending, (state) => { state.loading = true; })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch product';
      })
      .addCase(createProduct.pending, (state) => { state.submitting = true; })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.submitting = false;
        state.products.push(action.payload);
      })
      .addCase(createProduct.rejected, (state) => { state.submitting = false; })
      .addCase(updateProduct.pending, (state) => { state.submitting = true; })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.products.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.products[index] = action.payload;
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state) => { state.submitting = false; })
      .addCase(deleteProduct.pending, (state) => { state.submitting = true; })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.submitting = false;
        state.products = state.products.filter(p => p.id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state) => { state.submitting = false; });
  },
});

export const { clearSelectedProduct } = productSlice.actions;
export default productSlice.reducer;
