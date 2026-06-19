import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, ChevronRight, Package } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProductById, clearSelectedProduct } from '../../store/slices/productSlice';
import { addToCart } from '../../store/slices/cartSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const gradients = [
  'from-brand-400 to-brand-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-blue-500 to-cyan-600',
];

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { selectedProduct: product, loading } = useAppSelector((state) => state.products);
  const { user } = useAppSelector((state) => state.auth);
  const { submitting } = useAppSelector((state) => state.cart);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [dispatch, id]);

  const handleAddToCart = () => {
    if (product && user) {
      dispatch(addToCart({ productId: product.id, quantity }));
    }
  };

  if (loading || !product) {
    return <LoadingSpinner />;
  }

  const isCustomer = user?.role === 'customer';
  const gradientIndex = product.name.length % gradients.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
        <Link to="/" className="hover:text-brand-500">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/products" className="hover:text-brand-500">Products</Link>
        <ChevronRight className="w-4 h-4" />
        {product.sub_category?.category && (
          <>
            <Link to={`/products?category=${product.sub_category.category.id}`} className="hover:text-brand-500">
              {product.sub_category.category.name}
            </Link>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        {product.sub_category && (
          <>
            <span className="hover:text-brand-500">{product.sub_category.name}</span>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        <span className="text-gray-800 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className={`h-96 lg:h-[500px] rounded-2xl bg-gradient-to-br ${gradients[gradientIndex]} flex items-center justify-center`}>
          <Package className="w-32 h-32 text-white/30" />
        </div>

        <div>
          <div className="mb-2">
            <span className="text-sm text-brand-500 font-medium">
              {product.sub_category?.category?.name || 'Category'} / {product.sub_category?.name || 'Subcategory'}
            </span>
          </div>
          <h1 className="text-title-sm font-bold text-gray-800 mb-4">{product.name}</h1>
          <p className="text-2xl font-bold text-brand-500 mb-6">${Number(product.price).toFixed(2)}</p>

          <div className="mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              product.stock > 10
                ? 'bg-green-100 text-green-700'
                : product.stock > 0
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
            </span>
          </div>

          <p className="text-gray-600 leading-relaxed mb-8">{product.description}</p>

          {isCustomer && product.stock > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={submitting}
                    className="p-2 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-medium min-w-[48px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={submitting}
                    className="p-2 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {submitting ? <ButtonSpinner /> : <ShoppingCart className="w-5 h-5" />}
                <span>{submitting ? 'Adding...' : 'Add to Cart'}</span>
              </button>
            </div>
          )}

          {user && user.role === 'admin' && (
            <p className="text-sm text-gray-500 italic">Products can only be purchased from a customer account.</p>
          )}

          {!user && (
            <Link
              to="/login"
              className="inline-block px-8 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
            >
              Login to Purchase
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
