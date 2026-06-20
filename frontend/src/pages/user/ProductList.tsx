import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ShoppingCart, Filter, X, Package } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProducts } from '../../store/slices/productSlice';
import { fetchCategories, fetchSubCategories } from '../../store/slices/categorySlice';
import { addToCart } from '../../store/slices/cartSlice';
import { CardSkeleton } from '../../components/common/Skeleton';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const ProductList = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products = [], loading, pagination } = useAppSelector((state) => state.products);
  const { categories = [], subcategories = [] } = useAppSelector((state) => state.categories);
  const { user } = useAppSelector((state) => state.auth);
  const { submitting } = useAppSelector((state) => state.cart);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

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
      dispatch(fetchSubCategories({ categoryId }));
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

  const handleAddToCart = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (user && user.role === 'customer') {
      setAddingProductId(productId);
      await dispatch(addToCart({ productId, quantity: 1 }));
      setAddingProductId(null);
    }
  };

  const hasActiveFilters = categoryId || subCategoryId || searchParams.get('search');

  const clearAllFilters = () => {
    setSearch('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          {pagination.total > 0 && (
            <p className="mt-1 text-sm text-gray-400">
              Showing {products.length} of {pagination.total} products
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, category..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-full h-10 text-sm focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 w-64 bg-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden p-2 border border-gray-200 rounded-full h-10 w-10 flex items-center justify-center"
          >
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-');
              updateParams({ sort: sb, order: so });
            }}
            className="px-4 py-2 border border-gray-200 rounded-full h-10 text-sm focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 bg-white text-gray-700"
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
        {/* Mobile Filter Backdrop */}
        {showFilters && (
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setShowFilters(false)}
          />
        )}

        {/* Sidebar Filters */}
        <aside
          className={`${
            showFilters
              ? 'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-lg p-6 overflow-y-auto'
              : 'hidden'
          } md:block md:relative md:w-56 md:shadow-none md:p-0 flex-shrink-0`}
        >
          <div className="bg-white rounded-2xl border border-gray-200 p-5 md:sticky md:top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Filters</h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                  >
                    Clear All
                  </button>
                )}
                <button onClick={() => setShowFilters(false)} className="md:hidden">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Categories</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => updateParams({ category: undefined, subcategory: undefined })}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !categoryId
                        ? 'bg-brand-50 text-brand-600 font-medium border-l-2 border-brand-500'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.filter(c => c.is_active).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateParams({ category: cat.id, subcategory: undefined })}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        categoryId === cat.id
                          ? 'bg-brand-50 text-brand-600 font-medium border-l-2 border-brand-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {categoryId && subcategories.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Subcategories</h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => updateParams({ subcategory: undefined })}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !subCategoryId
                          ? 'bg-brand-50 text-brand-600 font-medium border-l-2 border-brand-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      All Subcategories
                    </button>
                    {subcategories.filter(sc => sc.is_active).map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => updateParams({ subcategory: sc.id })}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          subCategoryId === sc.id
                            ? 'bg-brand-50 text-brand-600 font-medium border-l-2 border-brand-500'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {sc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
                <Package className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">No products found</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                We could not find any products matching your criteria. Try adjusting your filters or search terms.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm text-brand-500 hover:text-brand-600 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="group rounded-2xl border border-gray-200 hover:border-brand-200 transition-all duration-300 overflow-hidden bg-white"
                  >
                    <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                      <span className="text-5xl font-semibold text-gray-300 select-none">
                        {product.name.substring(0, 2).toUpperCase()}
                      </span>
                      {user?.role === 'customer' && product.stock > 0 && (
                        <button
                          onClick={(e) => handleAddToCart(e, product.id)}
                          disabled={addingProductId === product.id}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5"
                        >
                          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-800 shadow-sm flex items-center gap-1.5 hover:bg-brand-50 transition-colors">
                            {addingProductId === product.id ? (
                              <ButtonSpinner />
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5" /> Quick Add
                              </>
                            )}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        {product.sub_category?.category?.name || 'Category'} / {product.sub_category?.name || 'Sub'}
                      </p>
                      <h3 className="font-medium text-gray-800 group-hover:text-brand-500 transition-colors truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-base font-semibold text-gray-900">${Number(product.price).toFixed(2)}</span>
                        <span className={`text-xs font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {product.stock > 0 ? `${product.stock} left` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center mt-10 gap-1.5">
                  <button
                    onClick={() => updateParams({ page: String(page - 1) })}
                    disabled={page <= 1}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-600"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateParams({ page: String(p) })}
                      className={`w-9 h-9 text-sm rounded-full transition-colors ${
                        p === page
                          ? 'bg-brand-500 text-white font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => updateParams({ page: String(page + 1) })}
                    disabled={page >= pagination.pages}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-600"
                  >
                    Next
                  </button>
                  <span className="ml-3 text-xs text-gray-400">
                    Page {page} of {pagination.pages}
                  </span>
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
