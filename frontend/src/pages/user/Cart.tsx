import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Clock, BadgePercent } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCart, updateCartItem, removeFromCart } from '../../store/slices/cartSlice';
import { computeDeliveryFee, amountToFreeDelivery, FREE_DELIVERY_THRESHOLD } from '../../config/fees';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const Cart = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, loading, submitting } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const subtotal = items.reduce((sum, item) => sum + Number(item.product?.price || 0) * item.quantity, 0);
  const deliveryFee = computeDeliveryFee(subtotal);
  const toPay = subtotal + deliveryFee;
  const away = amountToFreeDelivery(subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const handleUpdateQuantity = (itemId: string, newQuantity: number, stock: number) => {
    if (newQuantity < 1 || newQuantity > stock) return;
    dispatch(updateCartItem({ itemId, quantity: newQuantity }));
  };

  const goToCheckout = () => {
    if (user) navigate('/checkout');
    else navigate('/login');
  };

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-11 h-11 text-brand-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Add fresh groceries and daily essentials — delivered in minutes.</p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-semibold"
        >
          Start shopping <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-title-sm font-bold text-gray-800 mb-4">Your Cart</h1>

      {/* Delivery banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">Delivery in 10 minutes</p>
          <p className="text-xs text-gray-500">Shipment of {items.length} item{items.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const stock = item.product?.stock ?? 99;
            const atMax = item.quantity >= stock;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {item.product?.image_url ? (
                    <img src={item.product.image_url} alt={item.product?.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-300 font-bold text-lg">{item.product?.name?.substring(0, 2).toUpperCase() || 'P'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_id}`} className="font-semibold text-gray-800 hover:text-brand-500 truncate block">
                    {item.product?.name || 'Product'}
                  </Link>
                  {item.product?.unit && <p className="text-xs text-gray-400 mt-0.5">{item.product.unit}</p>}
                  <p className="text-gray-900 font-semibold mt-0.5">₹{Number(item.product?.price || 0).toFixed(2)}</p>
                  {atMax && <p className="text-[11px] font-medium text-amber-600 mt-0.5">Max available reached</p>}
                </div>
                <div className="qc-stepper">
                  <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, stock)} disabled={submitting} aria-label="Decrease quantity">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, stock)}
                    disabled={submitting || atMax}
                    aria-label="Increase quantity"
                    className={atMax ? 'opacity-40 cursor-not-allowed' : ''}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="font-semibold text-gray-800">₹{(Number(item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => dispatch(removeFromCart(item.id))}
                  disabled={submitting}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit sticky top-24">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bill details</h2>

          {/* Free-delivery progress */}
          {away > 0 ? (
            <div className="mb-5 rounded-xl bg-accent-50 border border-accent-100 p-3">
              <p className="text-xs font-medium text-ink-900 flex items-center gap-1.5">
                <BadgePercent className="w-4 h-4 text-accent-600" />
                Add <span className="font-bold">₹{away.toFixed(0)}</span> more for FREE delivery
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
                <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-xl bg-brand-50 border border-brand-100 p-3">
              <p className="text-xs font-semibold text-brand-700 flex items-center gap-1.5">
                <BadgePercent className="w-4 h-4" /> You've unlocked FREE delivery!
              </p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Item total ({items.length} item{items.length > 1 ? 's' : ''})</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery &amp; handling</span>
              {deliveryFee === 0 ? (
                <span className="text-brand-600 font-medium">FREE</span>
              ) : (
                <span>₹{deliveryFee.toFixed(2)}</span>
              )}
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between font-bold text-lg text-gray-900">
              <span>To pay</span>
              <span>₹{toPay.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={goToCheckout}
            disabled={submitting}
            className="w-full py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <ButtonSpinner />}
            <span>{user ? 'Proceed to Checkout' : 'Sign in to Checkout'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link to="/products" className="block text-center mt-4 text-brand-600 hover:text-brand-700 text-sm font-medium">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
