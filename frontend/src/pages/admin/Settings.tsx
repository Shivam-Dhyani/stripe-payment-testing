import { useEffect, useState } from 'react';
import { SlidersHorizontal, Save } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchStoreSettings, updateStoreSettings } from '../../store/slices/settingsSlice';
import { StoreSettings } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import toast from 'react-hot-toast';

type FieldKey = keyof StoreSettings;

const FIELDS: { key: FieldKey; label: string; help: string; unit: '₹' | '%' }[] = [
  { key: 'delivery_fee', label: 'Delivery fee', help: 'Charged when the order is below the free-delivery threshold.', unit: '₹' },
  { key: 'free_delivery_threshold', label: 'Free delivery above', help: 'Item total at/above which delivery is free.', unit: '₹' },
  { key: 'small_cart_fee', label: 'Small-cart handling fee', help: 'Extra fee for very small orders.', unit: '₹' },
  { key: 'small_cart_threshold', label: 'Small-cart threshold', help: 'Item total below which the handling fee applies.', unit: '₹' },
  { key: 'tax_percent', label: 'Tax', help: 'Percentage tax applied to the item total.', unit: '%' },
];

const Settings = () => {
  const dispatch = useAppDispatch();
  const { settings, saving } = useAppSelector((state) => state.settings);
  const [form, setForm] = useState<StoreSettings>(settings);

  useEffect(() => {
    dispatch(fetchStoreSettings());
  }, [dispatch]);

  // Sync local form when settings load/update.
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const setField = (key: FieldKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value === '' ? 0 : Number(value) }));
  };

  const handleSave = async () => {
    const result = await dispatch(updateStoreSettings(form));
    if (updateStoreSettings.fulfilled.match(result)) {
      toast.success('Store settings saved');
    }
  };

  // Live preview of the fee logic for a sample subtotal.
  const preview = (subtotal: number) => {
    let fee = 0;
    if (subtotal < form.free_delivery_threshold) fee += Number(form.delivery_fee);
    if (subtotal < form.small_cart_threshold) fee += Number(form.small_cart_fee);
    const tax = Math.round(subtotal * Number(form.tax_percent)) / 100;
    return { fee, tax, total: subtotal + fee + tax };
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-accent-100 text-accent-700 flex items-center justify-center">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-title-sm font-bold text-gray-900">Store Settings</h1>
          <p className="text-sm text-gray-500">Delivery fees, free-delivery threshold and taxes.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <div className="relative">
                {f.unit === '₹' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>}
                <input
                  type="number"
                  min={0}
                  step={f.unit === '%' ? 0.5 : 1}
                  value={Number(form[f.key])}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={`w-full ${f.unit === '₹' ? 'pl-7' : 'pl-4'} pr-8 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 transition`}
                />
                {f.unit === '%' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>}
              </div>
              <p className="mt-1 text-xs text-gray-400">{f.help}</p>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-xl bg-gray-50 border border-gray-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Preview</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[80, 150, 250].map((s) => {
              const p = preview(s);
              return (
                <div key={s} className="rounded-lg bg-white border border-gray-100 p-3">
                  <p className="text-gray-500 text-xs">Order ₹{s}</p>
                  <p className="text-gray-700 mt-1">Delivery: {p.fee === 0 ? <span className="text-brand-600 font-medium">FREE</span> : `₹${p.fee}`}</p>
                  <p className="text-gray-700">Tax: ₹{p.tax.toFixed(2)}</p>
                  <p className="font-semibold text-gray-900 mt-0.5">Pay ₹{p.total.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium disabled:opacity-50"
          >
            {saving ? <ButtonSpinner /> : <Save className="w-4 h-4" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
