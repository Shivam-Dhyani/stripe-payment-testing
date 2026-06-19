import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, themeAlpine } from 'ag-grid-community';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../../store/slices/productSlice';
import { fetchCategories, fetchSubCategories } from '../../store/slices/categorySlice';
import { Product } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  sub_category_id: z.string().min(1, 'Sub-category is required'),
  image_url: z.string().optional(),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

const Products = () => {
  const dispatch = useAppDispatch();
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

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', description: '', price: 0, stock: 0, sub_category_id: '', image_url: '', is_active: true },
  });

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
  }, [dispatch, filterCategoryId, filterSubCategoryId, search]);

  const refetchProducts = () => dispatch(fetchProducts({ page: 1, size: 100, category_id: filterCategoryId, sub_category_id: filterSubCategoryId, search: search || undefined, include_inactive: true }));

  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'active') return p.is_active;
    if (statusFilter === 'inactive') return !p.is_active;
    return true;
  });

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
      price: Number(product.price),
      stock: product.stock,
      sub_category_id: product.sub_category_id,
      image_url: product.image_url || '',
      is_active: product.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setSelectedCategoryInForm(undefined);
    form.reset({ name: '', description: '', price: 0, stock: 0, sub_category_id: '', image_url: '', is_active: true });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await dispatch(deleteProduct(id));
      refetchProducts();
    }
  };

  const handleFormCategoryChange = (catId: string) => {
    setSelectedCategoryInForm(catId);
    form.setValue('sub_category_id', '');
    if (catId) dispatch(fetchSubCategories({ categoryId: catId, includeInactive: true }));
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

  const PriceCellRenderer = (params: ICellRendererParams) => (
    <span>${Number(params.value).toFixed(2)}</span>
  );

  const columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 70, valueFormatter: (params) => String(params.value).substring(0, 8) },
    { field: 'name', headerName: 'Name', flex: 1, filter: true },
    { headerName: 'Category', flex: 1, valueGetter: (params) => params.data?.sub_category?.category?.name || '-' },
    { headerName: 'SubCategory', flex: 1, valueGetter: (params) => params.data?.sub_category?.name || '-' },
    { field: 'price', headerName: 'Price', width: 110, cellRenderer: PriceCellRenderer },
    { field: 'stock', headerName: 'Stock', width: 90 },
    { field: 'is_active', headerName: 'Status', width: 110, cellRenderer: StatusCellRenderer },
    { headerName: 'Actions', width: 160, cellRenderer: ActionCellRenderer, sortable: false, filter: false },
  ];

  const defaultColDef: ColDef = { sortable: true, resizable: true };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Products</h1>
        <button
          onClick={() => {
            setEditingProduct(null);
            setSelectedCategoryInForm(undefined);
            form.reset({ name: '', description: '', price: 0, stock: 0, sub_category_id: '', image_url: '', is_active: true });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-64"
        />
        <select
          value={filterCategoryId || ''}
          onChange={(e) => {
            const val = e.target.value || undefined;
            setFilterCategoryId(val);
            setFilterSubCategoryId(undefined);
            if (val) dispatch(fetchSubCategories({ categoryId: val, includeInactive: true }));
          }}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
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
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
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
          rowData={filteredProducts}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={10}
          loading={loading}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input {...form.register('name')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                {form.formState.errors.name && <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea {...form.register('description')} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                {form.formState.errors.description && <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                  <input type="number" step="0.01" {...form.register('price', { valueAsNumber: true })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                  {form.formState.errors.price && <p className="mt-1 text-sm text-red-600">{form.formState.errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                  <input type="number" {...form.register('stock', { valueAsNumber: true })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                  {form.formState.errors.stock && <p className="mt-1 text-sm text-red-600">{form.formState.errors.stock.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={selectedCategoryInForm || ''}
                  onChange={(e) => handleFormCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category</label>
                <select
                  {...form.register('sub_category_id')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Sub Category</option>
                  {subcategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
                {form.formState.errors.sub_category_id && <p className="mt-1 text-sm text-red-600">{form.formState.errors.sub_category_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (optional)</label>
                <input {...form.register('image_url')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
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
