import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Clock } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCart, updateCartItem, removeFromCart } from '../../store/slices/cartSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const Cart = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, loading, submitting } = useAppSelector((state) => state.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.product?.price || 0) * item.quantity;
  }, 0);

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    dispatch(updateCartItem({ itemId, quantity: newQuantity }));
  };

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
        >
          Continue Shopping <ArrowRight className="ml-2 w-5 h-5" />
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
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {item.product?.name?.substring(0, 2).toUpperCase() || 'P'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="font-semibold text-gray-800 hover:text-brand-500 truncate block">
                  {item.product?.name || 'Product'}
                </Link>
                {item.product?.unit && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.product.unit}</p>
                )}
                <p className="text-brand-500 font-medium mt-0.5">₹{Number(item.product?.price || 0).toFixed(2)}</p>
              </div>
              <div className="qc-stepper">
                <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={submitting} aria-label="decrease">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} disabled={submitting} aria-label="increase">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="font-semibold text-gray-800">
                  ₹{(Number(item.product?.price || 0) * item.quantity).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => dispatch(removeFromCart(item.id))}
                disabled={submitting}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              >
                {submitting ? <ButtonSpinner /> : <Trash2 className="w-5 h-5" />}
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit sticky top-24">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bill details</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Item total ({items.length} item{items.length > 1 ? 's' : ''})</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery fee</span>
              <span className="text-brand-600 font-medium">FREE</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Handling charge</span>
              <span className="text-brand-600 font-medium">FREE</span>
            </div>
            <hr className="border-gray-100" />
            <div className="flex justify-between font-bold text-lg text-gray-900">
              <span>To pay</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            disabled={submitting}
            className="w-full py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {submitting && <ButtonSpinner />}
            <span>Proceed to Checkout</span>
          </button>
          <Link to="/products" className="block text-center mt-4 text-brand-500 hover:text-brand-600 text-sm font-medium">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
