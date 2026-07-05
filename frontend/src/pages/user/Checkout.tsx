import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Check, MapPin, CreditCard, Package, Clock, BadgePercent, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { checkout, confirmPayment, clearCheckoutData } from '../../store/slices/orderSlice';
import { fetchCart, clearCart } from '../../store/slices/cartSlice';
import { setSelectedAddress } from '../../store/slices/addressSlice';
import { authService } from '../../services/authService';
import { orderService } from '../../services/orderService';
import { Address } from '../../types';
import { DELIVERY_PROMISE } from '../../config/brand';
import { computeDeliveryFee, amountToFreeDelivery, FREE_DELIVERY_THRESHOLD } from '../../config/fees';
import { formatOrderNo } from '../../utils/orderNumber';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK || 'pk_test_placeholder');

const steps = ['Address', 'Review', 'Payment'];

const CheckoutForm = ({
  clientSecret,
  orderId,
  onSuccess
}: {
  clientSecret: string;
  orderId: string;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useAppDispatch();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      try {
        await orderService.reportPaymentFailure({
          order_id: orderId,
          error_code: error.code || undefined,
          error_message: error.message || 'Payment failed',
          decline_code: (error as any).decline_code || undefined,
        });
      } catch {
        // non-critical, don't block the user
      }
      setProcessing(false);
    } else if (paymentIntent) {
      await dispatch(confirmPayment({ orderId, paymentIntentId: paymentIntent.id }));
      dispatch(clearCart());
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-brand-500" />
          <span>Card Details</span>
        </h3>
        <div className="border border-gray-300 rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1e293b',
                  '::placeholder': { color: '#94a3b8' },
                },
              },
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};

const Checkout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, loading: cartLoading } = useAppSelector((state) => state.cart);
  const { checkoutData, loading } = useAppSelector((state) => state.orders);
  const { selectedId: headerAddressId } = useAppSelector((state) => state.address);
  const [currentStep, setCurrentStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchCart());
    loadAddresses();
    return () => {
      dispatch(clearCheckoutData());
    };
  }, [dispatch]);

  const loadAddresses = async () => {
    try {
      const data = await authService.getAddresses();
      setAddresses(data);
      // Honour the address chosen in the header; else default; else first.
      const preferred =
        (headerAddressId && data.find(a => a.id === headerAddressId)) ||
        data.find(a => a.is_default) ||
        data[0];
      if (preferred) setSelectedAddressId(preferred.id);
    } catch {
      // handled by interceptor
    }
  };

  const subtotal = items.reduce((sum, item) => sum + Number(item.product?.price || 0) * item.quantity, 0);
  const deliveryFee = computeDeliveryFee(subtotal);
  const toPay = subtotal + deliveryFee;
  const away = amountToFreeDelivery(subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  // The checkout response carries a friendly order number (not in the base type).
  const orderNo = checkoutData
    ? formatOrderNo({
        order_number: (checkoutData as { order_number?: number | null }).order_number,
        id: checkoutData.order_id,
      })
    : '';

  const handleCheckout = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }
    const result = await dispatch(checkout(selectedAddressId));
    if (checkout.fulfilled.match(result)) {
      setCurrentStep(2);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Order placed successfully!');
    // Drop straight into live tracking for the order just placed.
    navigate(checkoutData?.order_id ? `/orders/${checkoutData.order_id}/track` : '/orders');
  };

  // Empty-cart guard — don't show an empty form when there's nothing to buy.
  // (Skip once we're on the payment step, where the order is already created.)
  if (items.length === 0 && currentStep < 2 && !cartLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-11 h-11 text-brand-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Add some items before heading to checkout — delivered in minutes.</p>
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-title-sm font-bold text-gray-800 mb-6">Checkout</h1>

      {/* Delivery ETA banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{DELIVERY_PROMISE}</p>
          <p className="text-xs text-gray-500">Fast, contactless delivery from your nearest store</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-12">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
              index <= currentStep ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${index <= currentStep ? 'text-brand-500' : 'text-gray-500'}`}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${index < currentStep ? 'bg-brand-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Address */}
      {currentStep === 0 && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-brand-500" />
              <span>Select Delivery Address</span>
            </h3>
            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No addresses found. Please add one in your profile.</p>
                <button
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
                >
                  Go to Profile
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => { setSelectedAddressId(addr.id); dispatch(setSelectedAddress(addr.id)); }}
                    className={`text-left p-4 rounded-lg border-2 transition ${
                      selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-800">{addr.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{addr.street}</p>
                    <p className="text-sm text-gray-600">{addr.city}, {addr.state} {addr.zip_code}</p>
                    <p className="text-sm text-gray-600">{addr.country}</p>
                    {addr.is_default && (
                      <span className="inline-block mt-2 text-xs bg-brand-100 text-brand-500 px-2 py-0.5 rounded-full">Default</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep(1)}
              disabled={!selectedAddressId}
              className="px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50"
            >
              Continue to Review
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {currentStep === 1 && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <Package className="w-5 h-5 text-brand-500" />
              <span>Order Review</span>
            </h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{item.product?.name?.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{item.product?.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.product?.unit ? `${item.product.unit} · ` : ''}Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">₹{(Number(item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-4 pt-4">
              {/* Free-delivery progress — mirrors Cart.tsx */}
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

              <div className="space-y-3">
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
                  <span className="text-brand-500">₹{toPay.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(0)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Back
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {currentStep === 2 && checkoutData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Order</p>
                <p className="text-sm font-bold text-gray-800">{orderNo}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">To pay</p>
              <p className="text-sm font-bold text-brand-600">₹{toPay.toFixed(2)}</p>
            </div>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.client_secret }}>
            <CheckoutForm
              clientSecret={checkoutData.client_secret}
              orderId={checkoutData.order_id}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        </div>
      )}
    </div>
  );
};

export default Checkout;
