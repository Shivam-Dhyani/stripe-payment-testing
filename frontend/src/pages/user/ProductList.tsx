import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ShoppingCart, Filter, X, ShoppingBag } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProducts } from '../../store/slices/productSlice';
import { fetchCategories, fetchSubCategories } from '../../store/slices/categorySlice';
import { addToCart } from '../../store/slices/cartSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const gradients = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-blue-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-purple-600',
];

const ProductList = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products = [], loading, pagination } = useAppSelector((state) => state.products);
  const { categories = [], subcategories = [] } = useAppSelector((state) => state.categories);
  const { user } = useAppSelector((state) => state.auth);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);

  const categoryId = searchParams.get('category') || undefined;
  const subCategoryId = searchParams.get('subcategory') || undefined;
  const sortBy = searchParams.get('sort') || 'created_at';
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
  const page = Number(searchParams.get('page') || '1');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (categoryId) {
      dispatch(fetchSubCategories(categoryId));
    }
  }, [dispatch, categoryId]);

  useEffect(() => {
    dispatch(fetchProducts({
      page,
      size: 12,
      category_id: categoryId,
      sub_category_id: subCategoryId,
      search: search || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    }));
  }, [dispatch, page, categoryId, subCategoryId, search, sortBy, sortOrder]);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    if (updates.category || updates.subcategory || updates.search) {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: search || undefined });
  };

  const handleAddToCart = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      dispatch(addToCart({ productId, quantity: 1 }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Products</h1>
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden p-2.5 border border-gray-300 rounded-lg"
          >
            <Filter className="w-5 h-5" />
          </button>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-');
              updateParams({ sort: sb, order: so });
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="created_at-desc">Newest</option>
            <option value="created_at-asc">Oldest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A-Z</option>
            <option value="name-desc">Name: Z-A</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : 'hidden'} md:block md:relative md:w-64 flex-shrink-0`}>
          {showFilters && (
            <button onClick={() => setShowFilters(false)} className="md:hidden absolute top-4 right-4">
              <X className="w-6 h-6" />
            </button>
          )}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => updateParams({ category: undefined, subcategory: undefined })}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${!categoryId ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-gray-50'}`}
                >
                  All Categories
                </button>
                {categories.filter(c => c.is_active).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParams({ category: cat.id, subcategory: undefined })}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${categoryId === cat.id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-gray-50'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {categoryId && subcategories.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Subcategories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => updateParams({ subcategory: undefined })}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${!subCategoryId ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-gray-50'}`}
                  >
                    All Subcategories
                  </button>
                  {subcategories.filter(sc => sc.is_active).map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => updateParams({ subcategory: sc.id })}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${subCategoryId === sc.id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-gray-50'}`}
                    >
                      {sc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700">No products found</h3>
              <p className="text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, index) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className={`h-48 bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center relative`}>
                      <span className="text-5xl font-bold text-white/20">
                        {product.name.substring(0, 2).toUpperCase()}
                      </span>
                      {user && product.stock > 0 && (
                        <button
                          onClick={(e) => handleAddToCart(e, product.id)}
                          className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-50"
                        >
                          <ShoppingCart className="w-5 h-5 text-indigo-600" />
                        </button>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-indigo-600 font-medium mb-1">
                        {product.sub_category?.category?.name || 'Category'} / {product.sub_category?.name || 'Sub'}
                      </p>
                      <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-indigo-600">${Number(product.price).toFixed(2)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {product.stock > 0 ? `${product.stock} left` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  <button
                    onClick={() => updateParams({ page: String(page - 1) })}
                    disabled={page <= 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateParams({ page: String(p) })}
                      className={`px-4 py-2 rounded-lg transition ${p === page ? 'bg-indigo-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => updateParams({ page: String(page + 1) })}
                    disabled={page >= pagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
