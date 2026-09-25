import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Search, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { brandService } from '../../services/brandService';
import { Brand } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { useConfirm } from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const brandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  is_active: z.boolean(),
});

type BrandFormData = z.infer<typeof brandSchema>;

const emptyBrandForm: BrandFormData = { name: '', description: '', logo_url: '', is_active: true };

const Brands = () => {
  const confirm = useConfirm();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: emptyBrandForm,
  });

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      setBrands(await brandService.getAll(true));
    } catch {
      // api interceptor surfaces the error toast
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const filteredBrands = brands.filter((brand) => {
    const matchesStatus =
      statusFilter === 'active' ? brand.is_active :
      statusFilter === 'inactive' ? !brand.is_active :
      true;
    const matchesSearch = search
      ? brand.name.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredBrands.length / perPage);
  const paginatedBrands = filteredBrands.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const handleSubmit = async (data: BrandFormData) => {
    setSubmitting(true);
    try {
      if (editingBrand) {
        await brandService.update(editingBrand.id, {
          name: data.name,
          description: data.description || null,
          logo_url: data.logo_url || null,
          is_active: data.is_active,
        });
        toast.success('Brand updated successfully');
      } else {
        await brandService.create({
          name: data.name,
          description: data.description || undefined,
          logo_url: data.logo_url || undefined,
        });
        toast.success('Brand created successfully');
      }
      closeModal();
      loadBrands();
    } catch {
      // api interceptor surfaces the error toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (brand: Brand) => {
    setTogglingId(brand.id);
    try {
      await brandService.update(brand.id, { is_active: !brand.is_active });
      toast.success('Brand updated successfully');
      await loadBrands();
    } catch {
      // api interceptor surfaces the error toast
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      is_active: brand.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    form.reset(emptyBrandForm);
  };

  const handleDelete = async (brand: Brand) => {
    const ok = await confirm({
      title: 'Delete brand?',
      message: `Products stay in the catalog — they are simply unlinked from ${brand.name}. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await brandService.remove(brand.id);
      toast.success('Brand deleted successfully');
      await loadBrands();
    } catch {
      // api interceptor surfaces the error toast
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-title-sm font-bold text-gray-800">Brands</h1>
          <p className="text-sm text-gray-500 mt-1">Group products by the makers shoppers already trust.</p>
        </div>
        <button
          onClick={() => {
            setEditingBrand(null);
            form.reset(emptyBrandForm);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Brand</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand name..."
            className="pl-9 pr-4 py-2 h-10 w-64 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
          />
        </div>
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
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Brand</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Description</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Products</th>
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
                    <td className="px-5 py-4"><div className="h-4 w-48 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-10 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedBrands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No brands found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedBrands.map((brand) => (
                  <tr key={brand.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center overflow-hidden">
                          {brand.logo_url ? (
                            <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-brand-600 text-xs font-bold">{brand.name.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{brand.name}</p>
                          <p className="font-mono text-xs text-gray-500">{brand.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-800 max-w-xs truncate">{brand.description || '-'}</td>
                    <td className="px-5 py-4 text-sm text-gray-800">{brand.product_count ?? 0}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${brand.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(brand)}
                          disabled={togglingId === brand.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${brand.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={brand.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {togglingId === brand.id ? <ButtonSpinner /> : brand.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openEditModal(brand)}
                          disabled={submitting}
                          className="p-1.5 text-brand-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(brand)}
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
        {!loading && filteredBrands.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * perPage + 1, filteredBrands.length)} to {Math.min(currentPage * perPage, filteredBrands.length)} of {filteredBrands.length} results
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
                {editingBrand ? 'Edit Brand' : 'Add Brand'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  {...form.register('description')}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (optional)</label>
                <input
                  {...form.register('logo_url')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition"
                />
              </div>
              {editingBrand && (
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...form.register('is_active')} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              )}
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
                  <span>{editingBrand ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brands;
