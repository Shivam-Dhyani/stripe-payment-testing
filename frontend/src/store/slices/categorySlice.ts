import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoryService } from '../../services/categoryService';
import { Category, SubCategory } from '../../types';
import toast from 'react-hot-toast';

interface CategoryState {
  categories: Category[];
  subcategories: SubCategory[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  subcategories: [],
  loading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk('categories/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await categoryService.getAll();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.detail || 'Failed to fetch categories');
  }
});

export const fetchSubCategories = createAsyncThunk(
  'categories/fetchSubCategories',
  async (categoryId?: number) => {
    return await categoryService.getSubCategories(categoryId);
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
  async ({ id, data }: { id: number; data: Partial<Category> }, { rejectWithValue }) => {
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
  async (id: number, { rejectWithValue }) => {
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
  async ({ id, data }: { id: number; data: Partial<SubCategory> }, { rejectWithValue }) => {
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
  async (id: number, { rejectWithValue }) => {
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
      .addCase(fetchSubCategories.fulfilled, (state, action) => {
        state.subcategories = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) state.categories[index] = action.payload;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(c => c.id !== action.payload);
      })
      .addCase(createSubCategory.fulfilled, (state, action) => {
        state.subcategories.push(action.payload);
      })
      .addCase(updateSubCategory.fulfilled, (state, action) => {
        const index = state.subcategories.findIndex(sc => sc.id === action.payload.id);
        if (index !== -1) state.subcategories[index] = action.payload;
      })
      .addCase(deleteSubCategory.fulfilled, (state, action) => {
        state.subcategories = state.subcategories.filter(sc => sc.id !== action.payload);
      });
  },
});

export default categorySlice.reducer;
