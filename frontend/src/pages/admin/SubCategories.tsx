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
  fetchSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from '../../store/slices/categorySlice';
import { SubCategory } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const subCategorySchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  is_active: z.boolean(),
});

type SubCategoryFormData = z.infer<typeof subCategorySchema>;

const SubCategories = () => {
  const dispatch = useAppDispatch();
  const { categories, subcategories, loading, submitting } = useAppSelector((state) => state.categories);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const form = useForm<SubCategoryFormData>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: { category_id: '', name: '', description: '', is_active: true },
  });

  useEffect(() => {
    dispatch(fetchCategories(true));
    dispatch(fetchSubCategories({ includeInactive: true }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchSubCategories({ categoryId: filterCategoryId, includeInactive: true }));
  }, [dispatch, filterCategoryId]);

  const filteredSubcategories = subcategories.filter((sc) => {
    if (statusFilter === 'active') return sc.is_active;
    if (statusFilter === 'inactive') return !sc.is_active;
    return true;
  });

  const handleSubmit = async (data: SubCategoryFormData) => {
    if (editingSub) {
      await dispatch(updateSubCategory({ id: editingSub.id, data }));
    } else {
      await dispatch(createSubCategory(data));
    }
    closeModal();
    dispatch(fetchSubCategories({ categoryId: filterCategoryId, includeInactive: true }));
  };

  const handleToggleStatus = async (sub: SubCategory) => {
    setTogglingId(sub.id);
    await dispatch(updateSubCategory({ id: sub.id, data: { is_active: !sub.is_active } }));
    dispatch(fetchSubCategories({ categoryId: filterCategoryId, includeInactive: true }));
    setTogglingId(null);
  };

  const openEditModal = (sub: SubCategory) => {
    setEditingSub(sub);
    form.reset({
      category_id: sub.category_id,
      name: sub.name,
      description: sub.description,
      is_active: sub.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSub(null);
    form.reset({ category_id: '', name: '', description: '', is_active: true });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sub-category?')) {
      await dispatch(deleteSubCategory(id));
      dispatch(fetchSubCategories({ categoryId: filterCategoryId, includeInactive: true }));
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
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
      <button onClick={() => openEditModal(params.data)} disabled={submitting} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition disabled:opacity-50">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => handleDelete(params.data.id)} disabled={submitting} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const StatusCellRenderer = (params: ICellRendererParams) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${params.value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {params.value ? 'Active' : 'Inactive'}
    </span>
  );

  const columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 80, valueFormatter: (params) => String(params.value).substring(0, 8) },
    { field: 'name', headerName: 'Name', flex: 1, filter: true },
    {
      field: 'category_id',
      headerName: 'Parent Category',
      flex: 1,
      valueFormatter: (params) => getCategoryName(params.value),
    },
    { field: 'description', headerName: 'Description', flex: 2 },
    { field: 'is_active', headerName: 'Status', width: 120, cellRenderer: StatusCellRenderer },
    { headerName: 'Actions', width: 160, cellRenderer: ActionCellRenderer, sortable: false, filter: false },
  ];

  const defaultColDef: ColDef = { sortable: true, resizable: true };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Sub Categories</h1>
        <button
          onClick={() => {
            setEditingSub(null);
            form.reset({ category_id: '', name: '', description: '', is_active: true });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sub Category</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={filterCategoryId || ''}
          onChange={(e) => setFilterCategoryId(e.target.value || undefined)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100" style={{ height: 500 }}>
        <AgGridReact
          theme={themeAlpine}
          rowData={filteredSubcategories}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={10}
          loading={loading}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingSub ? 'Edit Sub Category' : 'Add Sub Category'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Parent Category</label>
                <select
                  {...form.register('category_id')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {form.formState.errors.category_id && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.category_id.message}</p>
                )}
              </div>
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
              <label className="flex items-center space-x-2">
                <input type="checkbox" {...form.register('is_active')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Active</span>
              </label>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonSpinner />}
                  <span>{editingSub ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubCategories;
