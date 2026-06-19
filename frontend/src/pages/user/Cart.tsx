import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
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
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link
          to="/products"
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          Continue Shopping <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {item.product?.name?.substring(0, 2).toUpperCase() || 'P'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="font-semibold text-slate-800 hover:text-indigo-600 truncate block">
                  {item.product?.name || 'Product'}
                </Link>
                <p className="text-indigo-600 font-medium">${Number(item.product?.price || 0).toFixed(2)}</p>
              </div>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={submitting}
                  className="p-1.5 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-medium text-sm">{item.quantity}</span>
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={submitting}
                  className="p-1.5 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="font-semibold text-slate-800">
                  ${(Number(item.product?.price || 0) * item.quantity).toFixed(2)}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit sticky top-24">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Order Summary</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({items.length} items)</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            <hr />
            <div className="flex justify-between font-semibold text-lg text-slate-800">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {submitting && <ButtonSpinner />}
            <span>Proceed to Checkout</span>
          </button>
          <Link to="/products" className="block text-center mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
