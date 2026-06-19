import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, themeAlpine } from 'ag-grid-community';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../store/slices/categorySlice';
import { Category } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  image_url: z.string().optional(),
  is_active: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const Categories = () => {
  const dispatch = useAppDispatch();
  const { categories, loading, submitting } = useAppSelector((state) => state.categories);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', image_url: '', is_active: true },
  });

  useEffect(() => {
    dispatch(fetchCategories(true));
  }, [dispatch]);

  const filteredCategories = categories.filter((cat) => {
    if (statusFilter === 'active') return cat.is_active;
    if (statusFilter === 'inactive') return !cat.is_active;
    return true;
  });

  const handleSubmit = async (data: CategoryFormData) => {
    if (editingCategory) {
      await dispatch(updateCategory({ id: editingCategory.id, data }));
    } else {
      await dispatch(createCategory(data));
    }
    closeModal();
    dispatch(fetchCategories(true));
  };

  const handleToggleStatus = async (category: Category) => {
    setTogglingId(category.id);
    await dispatch(updateCategory({ id: category.id, data: { is_active: !category.is_active } }));
    dispatch(fetchCategories(true));
    setTogglingId(null);
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
      dispatch(fetchCategories(true));
    }
  };

  const ActionCellRenderer = (params: ICellRendererParams) => (
    <div className="flex items-center space-x-2 h-full">
      <button
        onClick={() => handleToggleStatus(params.data)}
        disabled={togglingId === params.data.id}
        className={`p-1.5 rounded transition disabled:opacity-50 ${params.data.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
        title={params.data.is_active ? 'Deactivate' : 'Activate'}
      >
        {togglingId === params.data.id ? <ButtonSpinner /> : params.data.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
      </button>
      <button
        onClick={() => openEditModal(params.data)}
        disabled={submitting}
        className="p-1.5 text-brand-500 hover:bg-brand-50 rounded transition disabled:opacity-50"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleDelete(params.data.id)}
        disabled={submitting}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
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
    { field: 'is_active', headerName: 'Status', width: 120, cellRenderer: StatusCellRenderer },
    { headerName: 'Actions', width: 160, cellRenderer: ActionCellRenderer, sortable: false, filter: false },
  ];

  const defaultColDef: ColDef = { sortable: true, resizable: true };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Categories</h1>
        <button
          onClick={() => {
            setEditingCategory(null);
            form.reset({ name: '', description: '', image_url: '', is_active: true });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-theme-xs border border-gray-200" style={{ height: 500 }}>
        <AgGridReact
          theme={themeAlpine}
          rowData={filteredCategories}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={10}
          loading={loading}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-theme-lg w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  {...form.register('name')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition"
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  {...form.register('description')}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition"
                />
                {form.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                <input
                  {...form.register('image_url')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition"
                />
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" {...form.register('is_active')} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-700">Active</span>
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
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonSpinner />}
                  <span>{editingCategory ? 'Update' : 'Create'}</span>
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
