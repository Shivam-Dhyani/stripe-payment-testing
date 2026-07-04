import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Clock, ShieldCheck, RotateCcw, Truck, MapPin, ArrowRight,
  Search, Store, Bike, CreditCard, Boxes, PackageCheck, ShoppingBag,
} from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCategories } from '../../store/slices/categorySlice';
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

const features = [
  { icon: Clock, title: '10-minute delivery', desc: 'Ordered from the nearest dark store and rushed to your door in minutes — not days.' },
  { icon: Boxes, title: 'Everything you need', desc: 'Fresh fruits & veg, dairy, snacks, drinks, household and personal care — all in one cart.' },
  { icon: Truck, title: 'Live order tracking', desc: 'Watch your order move from picking to packed to out-for-delivery in real time.' },
  { icon: CreditCard, title: 'Secure payments', desc: 'Checkout powered by Stripe with instant, reliable payment confirmation.' },
  { icon: RotateCcw, title: 'Easy returns & refunds', desc: 'Eligible items can be returned; a rider collects them and your refund is automatic.' },
  { icon: ShieldCheck, title: 'Quality you can trust', desc: 'Clear pack sizes on every item and freshness you can count on, every single time.' },
];

const steps = [
  { icon: Search, title: 'Browse & add', desc: 'Search or shop by category and add items to your cart in a tap.' },
  { icon: CreditCard, title: 'Checkout securely', desc: 'Pick your address and pay in seconds with Stripe.' },
  { icon: Bike, title: 'Delivered in minutes', desc: 'A rider brings it to your door — fast, fresh, and tracked.' },
];

const roles = [
  { icon: ShoppingBag, title: 'Customers', desc: 'Shop essentials and track every order.' },
  { icon: Store, title: 'Warehouse operators', desc: 'Pick, pack and dispatch from the dark store.' },
  { icon: Bike, title: 'Delivery partners', desc: 'Deliver orders and collect returns.' },
  { icon: PackageCheck, title: 'Admins', desc: 'Run the catalog, orders and refunds.' },
];

const Landing = () => {
  const dispatch = useAppDispatch();
  const { categories = [] } = useAppSelector((state) => state.categories);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const activeCategories = categories.filter((c) => c.is_active).slice(0, 8);

  return (
    <div className="flex flex-col">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-accent-400">
        <div className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 85% 12%, rgba(255,255,255,0.75) 0%, transparent 45%), radial-gradient(circle at 10% 90%, rgba(255,255,255,0.5) 0%, transparent 40%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1 text-xs font-bold text-white">
            <Zap className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} /> {DELIVERY_PROMISE.toUpperCase()}
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-extrabold text-ink-900 leading-[1.05] tracking-tight">
            Groceries &amp; daily essentials, delivered in minutes.
          </h1>
          <p className="mt-4 max-w-xl text-ink-900/75 text-base sm:text-lg font-medium">
            Fresh produce, snacks, household must-haves and more — picked at the
            store nearest you and brought to your door in a flash.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/products" className="inline-flex items-center gap-2 h-12 px-6 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors shadow-qc-card">
              <ShoppingBag className="w-4.5 h-4.5" /> Start shopping
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 h-12 px-6 bg-ink-900 text-white rounded-xl font-semibold hover:bg-ink-800 transition-colors">
              Create account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ink-900/70">
            <MapPin className="w-4 h-4" /> Delivering to your doorstep
          </p>
        </div>
      </section>

      {/* ===== Stats strip ===== */}
      <section className="bg-ink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { big: '10 min', small: 'Average delivery' },
            { big: '9', small: 'Grocery categories' },
            { big: '90+', small: 'Everyday products' },
            { big: '100%', small: 'Secure checkout' },
          ].map((s) => (
            <div key={s.small}>
              <p className="text-2xl sm:text-3xl font-extrabold text-accent-400">{s.big}</p>
              <p className="text-xs sm:text-sm text-gray-300 mt-0.5">{s.small}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* ===== How it works ===== */}
        <section className="py-14">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">How {APP_NAME} works</h2>
            <p className="mt-2 text-gray-500">Three simple steps between you and your groceries.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {steps.map((step, i) => (
              <div key={step.title} className="relative qc-card p-6">
                <span className="absolute -top-3 left-6 inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent-400 text-ink-900 text-sm font-extrabold shadow-qc-card">
                  {i + 1}
                </span>
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Features ===== */}
        <section className="py-4 pb-14">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Why shop with {APP_NAME}</h2>
            <p className="mt-2 text-gray-500">Everything a modern quick-commerce experience should be.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="qc-card p-6">
                <div className="w-11 h-11 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center mb-4">
                  <f.icon className="w-5.5 h-5.5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Category preview ===== */}
        {activeCategories.length > 0 && (
          <section className="py-4 pb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Shop by category</h2>
              <Link to="/products" className="text-sm text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
                See all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
              {activeCategories.map((category, index) => (
                <Link key={category.id} to={`/products?category=${category.id}`} className="group flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold transition-transform group-hover:scale-105 ${categoryTints[index % categoryTints.length]}`}>
                    {category.name.charAt(0)}
                  </div>
                  <span className="text-[11px] sm:text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== Built for everyone ===== */}
        <section className="py-4 pb-14">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">One platform, every role</h2>
            <p className="mt-2 text-gray-500">
              {APP_NAME} is a complete quick-commerce operation — from storefront to dark store to doorstep.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((r) => (
              <div key={r.title} className="qc-card p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                  <r.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{r.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ===== Final CTA ===== */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-accent-400 px-6 sm:px-12 py-12 text-center">
          <div className="absolute inset-0 opacity-25"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7) 0%, transparent 45%)' }} />
          <div className="relative">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink-900">Ready in 10 minutes. Are you?</h2>
            <p className="mt-3 text-ink-900/75 font-medium max-w-lg mx-auto">
              Join {APP_NAME} and get groceries & essentials delivered to your door faster than ever.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 h-12 px-7 bg-ink-900 text-white rounded-xl font-semibold hover:bg-ink-800 transition-colors">
                Get started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/products" className="inline-flex items-center gap-2 h-12 px-7 bg-white text-ink-900 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-qc-card">
                Browse products
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
