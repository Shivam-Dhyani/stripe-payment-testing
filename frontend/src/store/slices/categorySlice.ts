import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoryService } from '../../services/categoryService';
import { Category, SubCategory } from '../../types';
import toast from 'react-hot-toast';

interface CategoryState {
  categories: Category[];
  subcategories: SubCategory[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  subcategories: [],
  loading: false,
  submitting: false,
  error: null,
};

export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async (includeInactive: boolean | undefined, { rejectWithValue }: any) => {
    try {
      return await categoryService.getAll(includeInactive);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch categories');
    }
  }
);

export const fetchSubCategories = createAsyncThunk(
  'categories/fetchSubCategories',
  async ({ categoryId, includeInactive }: { categoryId?: string; includeInactive?: boolean } = {}) => {
    return await categoryService.getSubCategories(categoryId, includeInactive);
  }
);

export const createCategory = createAsyncThunk(
  'categories/create',
  async (data: Partial<Category>, { rejectWithValue }) => {
    try {
      const category = await categoryService.create(data);
      toast.success('Category created successfully');
      return category;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create category');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({ id, data }: { id: string; data: Partial<Category> }, { rejectWithValue }) => {
    try {
      const category = await categoryService.update(id, data);
      toast.success('Category updated successfully');
      return category;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await categoryService.delete(id);
      toast.success('Category deleted successfully');
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete category');
    }
  }
);

export const createSubCategory = createAsyncThunk(
  'categories/createSubCategory',
  async (data: Partial<SubCategory>, { rejectWithValue }) => {
    try {
      const subCategory = await categoryService.createSubCategory(data);
      toast.success('Sub-category created successfully');
      return subCategory;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create sub-category');
    }
  }
);

export const updateSubCategory = createAsyncThunk(
  'categories/updateSubCategory',
  async ({ id, data }: { id: string; data: Partial<SubCategory> }, { rejectWithValue }) => {
    try {
      const subCategory = await categoryService.updateSubCategory(id, data);
      toast.success('Sub-category updated successfully');
      return subCategory;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update sub-category');
    }
  }
);

export const deleteSubCategory = createAsyncThunk(
  'categories/deleteSubCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      await categoryService.deleteSubCategory(id);
      toast.success('Sub-category deleted successfully');
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to delete sub-category');
    }
  }
);

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => { state.loading = true; })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchSubCategories.pending, (state) => { state.loading = true; })
      .addCase(fetchSubCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.subcategories = action.payload;
      })
      .addCase(fetchSubCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch subcategories';
      })
      .addCase(createCategory.pending, (state) => { state.submitting = true; })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.submitting = false;
        state.categories.push(action.payload);
      })
      .addCase(createCategory.rejected, (state) => { state.submitting = false; })
      .addCase(updateCategory.pending, (state) => { state.submitting = true; })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.categories[index] = action.payload;
      })
      .addCase(updateCategory.rejected, (state) => { state.submitting = false; })
      .addCase(deleteCategory.pending, (state) => { state.submitting = true; })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.submitting = false;
        state.categories = state.categories.filter(c => c.id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state) => { state.submitting = false; })
      .addCase(createSubCategory.pending, (state) => { state.submitting = true; })
      .addCase(createSubCategory.fulfilled, (state, action) => {
        state.submitting = false;
        state.subcategories.push(action.payload);
      })
      .addCase(createSubCategory.rejected, (state) => { state.submitting = false; })
      .addCase(updateSubCategory.pending, (state) => { state.submitting = true; })
      .addCase(updateSubCategory.fulfilled, (state, action) => {
        state.submitting = false;
        const index = state.subcategories.findIndex(sc => sc.id === action.payload.id);
        if (index !== -1) state.subcategories[index] = action.payload;
      })
      .addCase(updateSubCategory.rejected, (state) => { state.submitting = false; })
      .addCase(deleteSubCategory.pending, (state) => { state.submitting = true; })
      .addCase(deleteSubCategory.fulfilled, (state, action) => {
        state.submitting = false;
        state.subcategories = state.subcategories.filter(sc => sc.id !== action.payload);
      })
      .addCase(deleteSubCategory.rejected, (state) => { state.submitting = false; });
  },
});

export default categorySlice.reducer;
