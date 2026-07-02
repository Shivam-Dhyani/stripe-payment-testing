import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Search, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useConfirm } from '../../components/common/ConfirmDialog';

const subCategorySchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  is_active: z.boolean(),
});

type SubCategoryFormData = z.infer<typeof subCategorySchema>;

const SubCategories = () => {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { categories, subcategories, loading, submitting } = useAppSelector((state) => state.categories);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

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
    const matchesStatus =
      statusFilter === 'active' ? sc.is_active :
      statusFilter === 'inactive' ? !sc.is_active :
      true;
    const matchesSearch = search
      ? sc.name.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredSubcategories.length / perPage);
  const paginatedSubcategories = filteredSubcategories.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

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
    const ok = await confirm({
      title: 'Delete sub-category?',
      message: 'This may affect its products. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await dispatch(deleteSubCategory(id));
    dispatch(fetchSubCategories({ categoryId: filterCategoryId, includeInactive: true }));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-title-sm font-bold text-gray-800">Sub Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Fine-tune the aisles shoppers browse within each category.</p>
        </div>
        <button
          onClick={() => {
            setEditingSub(null);
            form.reset({ category_id: '', name: '', description: '', is_active: true });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Sub Category</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subcategory name..."
            className="pl-9 pr-4 py-2 h-10 w-64 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={filterCategoryId || ''}
          onChange={(e) => setFilterCategoryId(e.target.value || undefined)}
          className="px-4 py-2 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Sub Category</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Parent Category</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Description</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-200 animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-48 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedSubcategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No sub categories found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedSubcategories.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                          <span className="text-brand-600 text-xs font-bold">{sub.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{sub.name}</p>
                          <p className="font-mono text-xs text-gray-500">{sub.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-800">{getCategoryName(sub.category_id)}</td>
                    <td className="px-5 py-4 text-sm text-gray-800 max-w-xs truncate">{sub.description}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {sub.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(sub)}
                          disabled={togglingId === sub.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${sub.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={sub.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {togglingId === sub.id ? <ButtonSpinner /> : sub.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openEditModal(sub)}
                          disabled={submitting}
                          className="p-1.5 text-brand-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          disabled={submitting}
                          className="p-1.5 text-red-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredSubcategories.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * perPage + 1, filteredSubcategories.length)} to {Math.min(currentPage * perPage, filteredSubcategories.length)} of {filteredSubcategories.length} results
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {getPageNumbers().map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingSub ? 'Edit Sub Category' : 'Add Sub Category'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                <select
                  {...form.register('category_id')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden bg-white"
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
              <label className="flex items-center space-x-2">
                <input type="checkbox" {...form.register('is_active')} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50 flex items-center space-x-2"
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
