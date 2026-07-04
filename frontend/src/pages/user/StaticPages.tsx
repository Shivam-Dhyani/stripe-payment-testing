import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Mail, ShieldCheck, Clock, Truck, RotateCcw, CreditCard } from 'lucide-react';
import { APP_NAME, DELIVERY_PROMISE } from '../../config/brand';

const PageShell = ({ icon, title, subtitle, children }: {
  icon: ReactNode; title: string; subtitle: string; children: ReactNode;
}) => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-11 h-11 rounded-2xl bg-accent-100 text-accent-700 flex items-center justify-center">{icon}</div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{title}</h1>
    </div>
    <p className="text-gray-500 mb-8">{subtitle}</p>
    {children}
  </div>
);

const faqs = [
  { icon: Truck, q: 'How fast is delivery?', a: `Most orders arrive within about 10 minutes, picked from the ${APP_NAME} dark store nearest you.` },
  { icon: Clock, q: 'How do I track my order?', a: 'Open My Orders and tap “Track this order live” to watch it move from packed to out-for-delivery to delivered in real time.' },
  { icon: RotateCcw, q: 'Can I return an item?', a: 'Eligible items can be returned from My Orders. A rider collects the item and your refund is issued automatically once it reaches the store.' },
  { icon: CreditCard, q: 'Which payments are accepted?', a: 'Payments are processed securely via Stripe. Your card details never touch our servers.' },
];

export const HelpCenter = () => (
  <PageShell icon={<LifeBuoy className="w-5 h-5" />} title="Help Center" subtitle={`Answers to the most common questions about ${APP_NAME}.`}>
    <div className="space-y-3">
      {faqs.map((f) => (
        <div key={f.q} className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <f.icon className="w-4.5 h-4.5 text-brand-500" /> {f.q}
          </h3>
          <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{f.a}</p>
        </div>
      ))}
    </div>
    <p className="mt-6 text-sm text-gray-500">
      Still need help? <Link to="/contact" className="text-brand-600 font-semibold">Contact us</Link>.
    </p>
  </PageShell>
);

export const ContactUs = () => (
  <PageShell icon={<Mail className="w-5 h-5" />} title="Contact Us" subtitle="We’re here to help — reach out any time.">
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Customer support</p>
        <a href="mailto:support@zippy.app" className="text-brand-600 font-medium">support@zippy.app</a>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">Support hours</p>
        <p className="text-sm text-gray-600">Every day, 7:00 AM – 12:00 AM ({DELIVERY_PROMISE.toLowerCase()} whenever we’re open).</p>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">Business & press</p>
        <a href="mailto:hello@zippy.app" className="text-brand-600 font-medium">hello@zippy.app</a>
      </div>
    </div>
  </PageShell>
);

export const PrivacyPolicy = () => (
  <PageShell icon={<ShieldCheck className="w-5 h-5" />} title="Privacy Policy" subtitle="How we handle your data at Zippy.">
    <div className="prose-sm space-y-5 text-sm text-gray-600 leading-relaxed">
      <section>
        <h3 className="text-base font-semibold text-gray-900">What we collect</h3>
        <p>We collect the details you provide to place and deliver orders — your name, email, delivery addresses, and order history — plus basic device information needed to run the app.</p>
      </section>
      <section>
        <h3 className="text-base font-semibold text-gray-900">How we use it</h3>
        <p>Your information is used solely to process payments, fulfil and deliver your orders, handle returns and refunds, and, if you opt in, send order notifications. We never sell your data.</p>
      </section>
      <section>
        <h3 className="text-base font-semibold text-gray-900">Payments</h3>
        <p>Card payments are processed by Stripe. We never see or store your full card number.</p>
      </section>
      <section>
        <h3 className="text-base font-semibold text-gray-900">Your choices</h3>
        <p>You can update your profile and addresses, turn delivery notifications on or off, and request account deletion at any time by contacting <a href="mailto:support@zippy.app" className="text-brand-600 font-medium">support@zippy.app</a>.</p>
      </section>
      <p className="text-xs text-gray-400">This summary is provided for the {APP_NAME} demo and is not legal advice.</p>
    </div>
  </PageShell>
);
