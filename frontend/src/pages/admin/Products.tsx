import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Search, Package, ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../../store/slices/productSlice';
import { fetchCategories, fetchSubCategories } from '../../store/slices/categorySlice';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { useConfirm } from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().optional(),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  sub_category_id: z.string().min(1, 'Sub-category is required'),
  image_url: z.string().optional(),
  is_active: z.boolean(),
  is_returnable: z.boolean(),
  return_window_days: z.number().nullable().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const Products = () => {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { products = [], loading, submitting } = useAppSelector((state) => state.products);
  const { categories, subcategories } = useAppSelector((state) => state.categories);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>(undefined);
  const [filterSubCategoryId, setFilterSubCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [selectedCategoryInForm, setSelectedCategoryInForm] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [generatingImage, setGeneratingImage] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', description: '', unit: '', price: 0, stock: 0, sub_category_id: '', image_url: '', is_active: true, is_returnable: false, return_window_days: null },
  });

  const handleGenerateImage = async () => {
    const name = form.getValues('name')?.trim();
    if (!name) {
      toast.error('Enter a product name first');
      return;
    }
    const categoryName = categories.find((c) => c.id === selectedCategoryInForm)?.name;
    setGeneratingImage(true);
    try {
      const { image_url } = await productService.generateImage(name, categoryName);
      // Preload so "Generating…" stays until the real image is ready (gen can take ~10-30s).
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = image_url;
      });
      form.setValue('image_url', image_url);
      toast.success('Image generated');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  };

  useEffect(() => {
    dispatch(fetchCategories(true));
    dispatch(fetchSubCategories({ includeInactive: true }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchProducts({
      page: 1,
      size: 100,
      category_id: filterCategoryId,
      sub_category_id: filterSubCategoryId,
      search: search || undefined,
      include_inactive: true,
    }));
    setCurrentPage(1);
  }, [dispatch, filterCategoryId, filterSubCategoryId, search]);

  const refetchProducts = () => dispatch(fetchProducts({ page: 1, size: 100, category_id: filterCategoryId, sub_category_id: filterSubCategoryId, search: search || undefined, include_inactive: true }));

  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'active') return p.is_active;
    if (statusFilter === 'inactive') return !p.is_active;
    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / perPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const handleToggleStatus = async (product: Product) => {
    setTogglingId(product.id);
    await dispatch(updateProduct({ id: product.id, data: { is_active: !product.is_active } }));
    refetchProducts();
    setTogglingId(null);
  };

  const handleSubmit = async (data: ProductFormData) => {
    if (editingProduct) {
      await dispatch(updateProduct({ id: editingProduct.id, data }));
    } else {
      await dispatch(createProduct(data));
    }
    closeModal();
    refetchProducts();
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    const catId = product.sub_category?.category?.id;
    setSelectedCategoryInForm(catId);
    if (catId) dispatch(fetchSubCategories({ categoryId: catId, includeInactive: true }));
    form.reset({
      name: product.name,
      description: product.description,
      unit: product.unit || '',
      price: Number(product.price),
      stock: product.stock,
      sub_category_id: product.sub_category_id,
      image_url: product.image_url || '',
      is_active: product.is_active,
      is_returnable: product.is_returnable || false,
      return_window_days: product.return_window_days ?? null,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setSelectedCategoryInForm(undefined);
    form.reset({ name: '', description: '', unit: '', price: 0, stock: 0, sub_category_id: '', image_url: '', is_active: true, is_returnable: false, return_window_days: null });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete product?',
      message: 'This permanently removes the product from the catalog.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await dispatch(deleteProduct(id));
    refetchProducts();
  };

  const handleFormCategoryChange = (catId: string) => {
    setSelectedCategoryInForm(catId);
    form.setValue('sub_category_id', '');
    if (catId) dispatch(fetchSubCategories({ categoryId: catId, includeInactive: true }));
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-title-sm font-bold text-gray-800">Products</h1>
        <button
          onClick={() => {
            setEditingProduct(null);
            setSelectedCategoryInForm(undefined);
            form.reset({ name: '', description: '', unit: '', price: 0, stock: 0, sub_category_id: '', image_url: '', is_active: true, is_returnable: false, return_window_days: null });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name..."
            className="pl-9 pr-4 py-2 h-10 w-64 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={filterCategoryId || ''}
          onChange={(e) => {
            const val = e.target.value || undefined;
            setFilterCategoryId(val);
            setFilterSubCategoryId(undefined);
            if (val) dispatch(fetchSubCategories({ categoryId: val, includeInactive: true }));
          }}
          className="px-4 py-2 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {filterCategoryId && (
          <select
            value={filterSubCategoryId || ''}
            onChange={(e) => setFilterSubCategoryId(e.target.value || undefined)}
            className="px-4 py-2 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
          >
            <option value="">All SubCategories</option>
            {subcategories.map((sc) => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>
        )}
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
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Product</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Category</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">SubCategory</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Price</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Stock</th>
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
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No products found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                          <span className="text-brand-600 text-xs font-bold">{product.name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{product.name}</p>
                          <p className="font-mono text-xs text-gray-500">{product.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-800">{product.sub_category?.category?.name || '-'}</td>
                    <td className="px-5 py-4 text-sm text-gray-800">{product.sub_category?.name || '-'}</td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-800">${Number(product.price).toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm text-gray-800">{product.stock}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          disabled={togglingId === product.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${product.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={product.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {togglingId === product.id ? <ButtonSpinner /> : product.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          disabled={submitting}
                          className="p-1.5 text-brand-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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
        {!loading && filteredProducts.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * perPage + 1, filteredProducts.length)} to {Math.min(currentPage * perPage, filteredProducts.length)} of {filteredProducts.length} results
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
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input {...form.register('name')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition" />
                {form.formState.errors.name && <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pack size / Unit <span className="text-gray-400 font-normal">(e.g. 500 g, 1 L, 6 pcs)</span>
                </label>
                <input {...form.register('unit')} placeholder="e.g. 500 g" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea {...form.register('description')} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition" />
                {form.formState.errors.description && <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input type="number" step="0.01" {...form.register('price', { valueAsNumber: true })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition" />
                  {form.formState.errors.price && <p className="mt-1 text-sm text-red-600">{form.formState.errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" {...form.register('stock', { valueAsNumber: true })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition" />
                  {form.formState.errors.stock && <p className="mt-1 text-sm text-red-600">{form.formState.errors.stock.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategoryInForm || ''}
                  onChange={(e) => handleFormCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
                <select
                  {...form.register('sub_category_id')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden bg-white"
                >
                  <option value="">Select Sub Category</option>
                  {subcategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
                {form.formState.errors.sub_category_id && <p className="mt-1 text-sm text-red-600">{form.formState.errors.sub_category_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="flex gap-3">
                  <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.watch('image_url') ? (
                      <img src={form.watch('image_url')} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      {...form.register('image_url')}
                      placeholder="Paste an image URL, or generate one"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden transition text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {generatingImage ? <ButtonSpinner /> : <Sparkles className="w-4 h-4" />}
                      {generatingImage ? 'Generating…' : 'Generate from name'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">AI-generates a product photo from the name. Regenerate for a different result.</p>
              </div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" {...form.register('is_active')} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="border-t border-gray-200 pt-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...form.register('is_returnable')} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">Returnable</span>
                </label>
                {form.watch('is_returnable') && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Window</label>
                    <select
                      value={form.watch('return_window_days') ?? ''}
                      onChange={(e) => form.setValue('return_window_days', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 focus:border-brand-300 focus:outline-hidden bg-white"
                    >
                      <option value="">Select return window</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <ButtonSpinner />}
                  <span>{editingProduct ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
