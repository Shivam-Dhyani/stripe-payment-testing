import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Truck, Shield, Star } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCategories } from '../../store/slices/categorySlice';
import { fetchProducts } from '../../store/slices/productSlice';
import Skeleton, { CardSkeleton } from '../../components/common/Skeleton';

const gradients = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-blue-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-purple-600',
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
      <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Discover Amazing Products at Great Prices
            </h1>
            <p className="text-xl text-indigo-100 mb-8">
              Shop the latest trends with fast delivery and secure payments. Your satisfaction is our priority.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition"
            >
              Shop Now <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Free Shipping</h3>
                <p className="text-sm text-slate-500">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Secure Payment</h3>
                <p className="text-sm text-slate-500">Powered by Stripe</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Quality Products</h3>
                <p className="text-sm text-slate-500">Curated selections</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Shop by Category</h2>
            <Link to="/products" className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categoriesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <Skeleton className="h-48" />
                </div>
              ))
            ) : (
              categories.filter(c => c.is_active).slice(0, 8).map((category, index) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  className="group relative overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className={`h-48 bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center`}>
                    <span className="text-4xl font-bold text-white/30">{category.name.charAt(0)}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-lg">{category.name}</h3>
                    <p className="text-white/80 text-sm">{category.sub_categories?.length || 0} subcategories</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Trending Products</h2>
            <Link to="/products" className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              products.filter(p => p.is_active).slice(0, 8).map((product, index) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  <div className={`h-48 bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center`}>
                    <ShoppingBag className="w-12 h-12 text-white/40" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-indigo-600">${Number(product.price).toFixed(2)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

      {/* CTA Section */}
      <section className="py-16 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Shopping?</h2>
          <p className="text-indigo-100 mb-8 text-lg">Create an account and get exclusive deals.</p>
          <Link
            to="/register"
            className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
