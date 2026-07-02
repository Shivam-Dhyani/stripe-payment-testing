import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Clock, ShieldCheck, RotateCcw, Search, MapPin } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCategories } from '../../store/slices/categorySlice';
import { fetchProducts } from '../../store/slices/productSlice';
import Skeleton, { CardSkeleton } from '../../components/common/Skeleton';
import ProductCard from '../../components/product/ProductCard';
import Landing from './Landing';
import { APP_NAME, DELIVERY_PROMISE } from '../../config/brand';

const categoryTints = [
  'bg-brand-50 text-brand-500',
  'bg-amber-50 text-amber-500',
  'bg-sky-50 text-sky-500',
  'bg-rose-50 text-rose-500',
  'bg-violet-50 text-violet-500',
  'bg-teal-50 text-teal-500',
  'bg-orange-50 text-orange-500',
  'bg-emerald-50 text-emerald-500',
];

const Home = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { categories = [], loading: categoriesLoading } = useAppSelector((state) => state.categories);
  const { products = [], loading: productsLoading } = useAppSelector((state) => state.products);
  const [search, setSearch] = useState('');
  const isGuest = !user;

  useEffect(() => {
    if (isGuest) return;
    dispatch(fetchCategories());
    dispatch(fetchProducts({ size: 12 }));
  }, [dispatch, isGuest]);

  // Guests see the marketing landing page (features + how it works);
  // signed-in shoppers drop straight into the storefront.
  if (isGuest) return <Landing />;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      {/* Hero — yellow identity strip: delivery promise + location + search */}
      <section className="relative overflow-hidden rounded-3xl bg-accent-400 px-6 sm:px-10 py-8 sm:py-12">
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 88% 15%, rgba(255,255,255,0.7) 0%, transparent 42%)' }} />
        <div className="relative">
          {/* Top row: delivery promise + location */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1 text-xs font-bold text-white">
              <Zap className="w-3.5 h-3.5" fill="currentColor" /> {DELIVERY_PROMISE.toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900/80">
              <MapPin className="w-4 h-4" /> Delivering to your doorstep
            </span>
          </div>

          <h1 className="mt-5 max-w-xl text-3xl sm:text-5xl font-extrabold text-ink-900 leading-tight tracking-tight">
            {APP_NAME} — groceries & essentials at your door in minutes
          </h1>
          <p className="mt-3 max-w-xl text-ink-800/80 text-base sm:text-lg font-medium">
            Fresh picks, everyday needs, and more — delivered fast.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-6 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search for "milk", "bananas", "chips"...'
                className="w-full h-12 rounded-xl bg-white pl-11 pr-4 text-sm text-ink-900 shadow-qc-card placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/25"
              />
            </div>
            <button
              type="submit"
              className="h-12 shrink-0 inline-flex items-center gap-2 px-5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
            >
              Search <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Shop by category — Blinkit-style circles */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Shop by category</h2>
          <Link to="/products" className="text-sm text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {categoriesLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))
          ) : (
            categories.filter((c) => c.is_active).slice(0, 16).map((category, index) => (
              <Link key={category.id} to={`/products?category=${category.id}`} className="group flex flex-col items-center gap-2">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold transition-transform group-hover:scale-105 ${categoryTints[index % categoryTints.length]}`}>
                  {category.name.charAt(0)}
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2">
                  {category.name}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Bestsellers */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Bestsellers</h2>
          <Link to="/products" className="text-sm text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {productsLoading
            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            : products.filter((p) => p.is_active).slice(0, 10).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Clock, title: '10-minute delivery', sub: 'From our nearest dark store' },
          { icon: ShieldCheck, title: 'Secure payments', sub: 'Powered by Stripe' },
          { icon: RotateCcw, title: 'Easy returns', sub: 'On eligible items' },
        ].map((b) => (
          <div key={b.title} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <b.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{b.title}</p>
              <p className="text-xs text-gray-400">{b.sub}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Home;
