import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Check, MapPin, CreditCard, Package } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { checkout, confirmPayment, clearCheckoutData } from '../../store/slices/orderSlice';
import { fetchCart, clearCart } from '../../store/slices/cartSlice';
import { authService } from '../../services/authService';
import { orderService } from '../../services/orderService';
import { Address } from '../../types';
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
      <div className="bg-white rounded-xl shadow-theme-xs border border-gray-200 p-6">
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
  const { items } = useAppSelector((state) => state.cart);
  const { checkoutData, loading } = useAppSelector((state) => state.orders);
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
      const defaultAddr = data.find(a => a.is_default);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (data.length > 0) setSelectedAddressId(data[0].id);
    } catch {
      // handled by interceptor
    }
  };

  const subtotal = items.reduce((sum, item) => sum + Number(item.product?.price || 0) * item.quantity, 0);

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
    navigate('/orders');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-title-sm font-bold text-gray-800 mb-8">Checkout</h1>

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
          <div className="bg-white rounded-xl shadow-theme-xs border border-gray-200 p-6 mb-6">
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
                    onClick={() => setSelectedAddressId(addr.id)}
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
          <div className="bg-white rounded-xl shadow-theme-xs border border-gray-200 p-6 mb-6">
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
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-semibold">${(Number(item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-brand-500">${subtotal.toFixed(2)}</span>
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
        <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.client_secret }}>
          <CheckoutForm
            clientSecret={checkoutData.client_secret}
            orderId={checkoutData.order_id}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
    </div>
  );
};

export default Checkout;
