import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, RotateCcw, Clock } from 'lucide-react';
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
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [dispatch, id]);

  // Reset the gallery selection whenever we land on a different product.
  useEffect(() => {
    setActiveImage(0);
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      dispatch(addToCart({ product, quantity }));
    }
  };

  if (loading || !product) {
    return <LoadingSpinner />;
  }

  // Guests (local cart) and customers can shop; staff cannot.
  const isCustomer = !user || user.role === 'customer';
  const totalPrice = (Number(product.price) * quantity).toFixed(2);

  // Gallery: prefer the API-built gallery, otherwise fall back to the single image.
  const gallery = (
    product.gallery && product.gallery.length > 0 ? product.gallery : [product.image_url]
  ).filter((src): src is string => !!src);
  const mainImage = gallery[activeImage] ?? gallery[0] ?? null;

  // Price block — same rules as ProductCard.
  const discount = product.discount_percent || 0;
  const mrp = product.mrp ? Number(product.mrp) : null;
  const showMrp = !!mrp && mrp > Number(product.price);

  const specs = product.specifications?.filter((s) => s && s.label) || [];

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
        {/* Product Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative bg-gray-100 rounded-2xl h-96 lg:h-[520px] flex items-center justify-center overflow-hidden">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-8xl lg:text-9xl font-semibold text-gray-200 select-none tracking-wider">
                {product.name.substring(0, 2).toUpperCase()}
              </span>
            )}
            {discount > 0 && (
              <span className="absolute top-3 left-3 rounded-md bg-brand-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                {discount}% OFF
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {gallery.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1} of ${gallery.length}`}
                  aria-current={i === activeImage}
                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 transition-colors ${
                    i === activeImage
                      ? 'border-brand-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={src}
                    alt={`${product.name} thumbnail ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
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

          {/* Name + pack size */}
          <div className="mb-4">
            {product.brand && (
              <Link
                to={`/products?brand_id=${product.brand.id}`}
                className="inline-block mb-1 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
              >
                {product.brand.name}
              </Link>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.unit && (
              <span className="mt-1.5 inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-600">
                {product.unit}
              </span>
            )}
          </div>

          {/* Price + delivery */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <p className="text-3xl font-bold text-gray-900">
              ₹{Number(product.price).toFixed(2)}
              {product.unit && (
                <span className="ml-2 text-sm font-medium text-gray-400">/ {product.unit}</span>
              )}
            </p>
            {showMrp && (
              <span className="text-lg text-gray-400 line-through">₹{mrp!.toFixed(2)}</span>
            )}
            {discount > 0 && (
              <span className="rounded-md bg-brand-500 px-2 py-1 text-xs font-bold text-white">
                {discount}% OFF
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
              <Clock className="w-3.5 h-3.5" /> 10 min delivery
            </span>
          </div>

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

          {/* Return Policy */}
          {product.is_returnable && (
            <p className="text-sm text-brand-600 mb-6 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              {product.return_window_days
                ? `Returnable within ${product.return_window_days} days of delivery`
                : 'Returnable'}
            </p>
          )}

          {/* Description */}
          <div className="border-t border-gray-100 pt-6 mb-8">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Specifications */}
          {specs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Specifications
              </h3>
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map((spec, i) => (
                      <tr
                        key={`${spec.label}-${i}`}
                        className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <th
                          scope="row"
                          className="w-2/5 px-4 py-2.5 text-left align-top font-medium text-gray-500"
                        >
                          {spec.label}
                        </th>
                        <td className="px-4 py-2.5 align-top text-gray-800">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                  <span className="text-white/70 ml-1">&middot; ₹{totalPrice}</span>
                </button>
              </div>
            </div>
          )}

          {user && user.role !== 'customer' && (
            <p className="text-sm text-gray-400 mt-auto italic">Shopping is available from a customer account.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
