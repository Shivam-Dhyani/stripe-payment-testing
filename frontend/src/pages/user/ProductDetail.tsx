import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProductById, clearSelectedProduct } from '../../store/slices/productSlice';
import { addToCart } from '../../store/slices/cartSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';

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
  const totalPrice = (Number(product.price) * quantity).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center flex-wrap gap-1 text-sm text-gray-400 mb-10">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span className="mx-1">&middot;</span>
        <Link to="/products" className="hover:text-brand-500 transition-colors">Products</Link>
        {product.sub_category?.category && (
          <>
            <span className="mx-1">&middot;</span>
            <Link
              to={`/products?category=${product.sub_category.category.id}`}
              className="hover:text-brand-500 transition-colors"
            >
              {product.sub_category.category.name}
            </Link>
          </>
        )}
        {product.sub_category && (
          <>
            <span className="mx-1">&middot;</span>
            <span>{product.sub_category.name}</span>
          </>
        )}
        <span className="mx-1">&middot;</span>
        <span className="text-gray-700 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Product Image */}
        <div className="bg-gray-100 rounded-2xl h-96 lg:h-[520px] flex items-center justify-center">
          <span className="text-8xl lg:text-9xl font-semibold text-gray-200 select-none tracking-wider">
            {product.name.substring(0, 2).toUpperCase()}
          </span>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          {/* Category Badge */}
          <div className="mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
              {product.sub_category?.category?.name || 'Category'}
              {product.sub_category && (
                <> / {product.sub_category.name}</>
              )}
            </span>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{product.name}</h1>

          {/* Price */}
          <p className="text-3xl font-bold text-gray-900 mb-4">${Number(product.price).toFixed(2)}</p>

          {/* Stock */}
          <p className={`text-sm mb-6 ${
            product.stock > 10
              ? 'text-emerald-600'
              : product.stock > 0
              ? 'text-amber-600'
              : 'text-red-500'
          }`}>
            {product.stock > 10
              ? 'In Stock'
              : product.stock > 0
              ? `Only ${product.stock} left in stock`
              : 'Out of Stock'}
          </p>

          {/* Description */}
          <div className="border-t border-gray-100 pt-6 mb-8">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Add to Cart */}
          {isCustomer && product.stock > 0 && (
            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={submitting}
                    className="p-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="px-4 py-2 font-medium text-sm min-w-[48px] text-center text-gray-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={submitting}
                    className="p-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={submitting}
                  className="flex-1 sm:flex-none px-8 py-3 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <ButtonSpinner /> : <ShoppingCart className="w-4 h-4" />}
                  <span>{submitting ? 'Adding...' : 'Add to Cart'}</span>
                  <span className="text-white/70 ml-1">&middot; ${totalPrice}</span>
                </button>
              </div>
            </div>
          )}

          {user && user.role === 'admin' && (
            <p className="text-sm text-gray-400 mt-auto italic">Products can only be purchased from a customer account.</p>
          )}

          {!user && (
            <Link
              to="/login"
              className="mt-auto inline-flex items-center justify-center px-8 py-3 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-colors font-medium"
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
