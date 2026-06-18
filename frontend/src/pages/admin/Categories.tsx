import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, themeAlpine } from 'ag-grid-community';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../store/slices/categorySlice';
import { Category } from '../../types';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  image_url: z.string().optional(),
  is_active: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const Categories = () => {
  const dispatch = useAppDispatch();
  const { categories, loading } = useAppSelector((state) => state.categories);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', image_url: '', is_active: true },
  });

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleSubmit = async (data: CategoryFormData) => {
    if (editingCategory) {
      await dispatch(updateCategory({ id: editingCategory.id, data }));
    } else {
      await dispatch(createCategory(data));
    }
    closeModal();
    dispatch(fetchCategories());
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description,
      image_url: category.image_url || '',
      is_active: category.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    form.reset({ name: '', description: '', image_url: '', is_active: true });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      await dispatch(deleteCategory(id));
      dispatch(fetchCategories());
    }
  };

  const ActionCellRenderer = (params: ICellRendererParams) => (
    <div className="flex items-center space-x-2 h-full">
      <button
        onClick={() => openEditModal(params.data)}
        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleDelete(params.data.id)}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const StatusCellRenderer = (params: ICellRendererParams) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      params.value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {params.value ? 'Active' : 'Inactive'}
    </span>
  );

  const columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Name', flex: 1, filter: true },
    { field: 'description', headerName: 'Description', flex: 2 },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 120,
      cellRenderer: StatusCellRenderer,
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: ActionCellRenderer,
      sortable: false,
      filter: false,
    },
  ];

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Categories</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            form.reset({ name: '', description: '', image_url: '', is_active: true });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100" style={{ height: 500 }}>
        <AgGridReact
          theme={themeAlpine}
          rowData={categories}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={10}
          loading={loading}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  {...form.register('name')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  {...form.register('description')}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                {form.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (optional)</label>
                <input
                  {...form.register('image_url')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" {...form.register('is_active')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Active</span>
              </label>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
