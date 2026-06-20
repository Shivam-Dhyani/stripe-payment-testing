import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, Star, ShoppingCart } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCategories } from '../../store/slices/categorySlice';
import { fetchProducts } from '../../store/slices/productSlice';
import Skeleton, { CardSkeleton } from '../../components/common/Skeleton';

const categoryTints = [
  'bg-brand-50',
  'bg-emerald-50',
  'bg-amber-50',
  'bg-sky-50',
  'bg-rose-50',
  'bg-violet-50',
  'bg-teal-50',
  'bg-orange-50',
];

const categoryIconColors = [
  'text-brand-400',
  'text-emerald-400',
  'text-amber-400',
  'text-sky-400',
  'text-rose-400',
  'text-violet-400',
  'text-teal-400',
  'text-orange-400',
];

const Home = () => {
  const dispatch = useAppDispatch();
  const { categories = [], loading: categoriesLoading } = useAppSelector((state) => state.categories);
  const { products = [], loading: productsLoading } = useAppSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchProducts({ size: 8 }));
  }, [dispatch]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
                Curated Essentials for Modern Living
              </h1>
              <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-lg">
                Thoughtfully selected products that blend quality craftsmanship with contemporary design. Elevate your everyday.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center px-6 py-3 bg-brand-500 text-white rounded-full font-medium hover:bg-brand-600 transition-colors"
                >
                  Explore Collection <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                <Link
                  to="/products"
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:border-gray-400 hover:text-gray-900 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 rounded-full bg-brand-100/60" />
                <div className="absolute top-6 left-6 right-6 bottom-6 rounded-full bg-brand-50/80" />
                <div className="absolute top-16 left-16 right-16 bottom-16 rounded-full bg-white border border-brand-100 flex items-center justify-center">
                  <span className="text-5xl font-light text-brand-300 tracking-widest">CE</span>
                </div>
                <div className="absolute -top-2 right-12 w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 rotate-12" />
                <div className="absolute -bottom-2 left-8 w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 -rotate-6" />
                <div className="absolute top-1/2 -right-4 w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="flex items-center gap-3 py-4 md:py-0 md:pr-8">
              <Truck className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Free Shipping</p>
                <p className="text-xs text-gray-400">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-4 md:py-0 md:px-8">
              <Shield className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Secure Payment</p>
                <p className="text-xs text-gray-400">Powered by Stripe</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-4 md:py-0 md:pl-8">
              <Star className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Quality Products</p>
                <p className="text-xs text-gray-400">Curated selections</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
              <p className="mt-1 text-sm text-gray-400">Browse our curated collections</p>
            </div>
            <Link to="/products" className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {categoriesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <Skeleton className="h-36" />
                </div>
              ))
            ) : (
              categories.filter(c => c.is_active).slice(0, 8).map((category, index) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  className="group rounded-2xl border border-gray-200 hover:border-brand-200 transition-all duration-300 overflow-hidden"
                >
                  <div className={`${categoryTints[index % categoryTints.length]} h-28 flex items-center justify-center`}>
                    <span className={`text-4xl font-semibold ${categoryIconColors[index % categoryIconColors.length]} opacity-40`}>
                      {category.name.charAt(0)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-800 text-sm group-hover:text-brand-500 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {category.sub_categories?.length || 0} subcategories
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Trending Products</h2>
              <p className="mt-1 text-sm text-gray-400">Our most popular picks this season</p>
            </div>
            <Link to="/products" className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {productsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              products.filter(p => p.is_active).slice(0, 8).map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group rounded-2xl border border-gray-200 hover:border-brand-200 transition-all duration-300 overflow-hidden bg-white"
                >
                  <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                    <span className="text-5xl font-semibold text-gray-300 select-none">
                      {product.name.substring(0, 2).toUpperCase()}
                    </span>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-800 shadow-sm flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" /> Quick Add
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">
                      {product.sub_category?.category?.name || 'Category'}
                    </p>
                    <h3 className="font-medium text-gray-800 group-hover:text-brand-500 transition-colors truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-base font-semibold text-gray-900">${Number(product.price).toFixed(2)}</span>
                      <span className={`text-xs font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-brand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to Start Shopping?</h2>
          <p className="text-gray-500 mb-8 text-base max-w-md mx-auto">
            Create an account to unlock exclusive collections and member pricing.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-6 py-3 bg-brand-500 text-white rounded-full font-medium hover:bg-brand-600 transition-colors"
          >
            Get Started <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
