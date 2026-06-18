import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchCurrentUser } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { Address } from '../../types';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
});

const addressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip_code: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
  is_default: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type AddressFormData = z.infer<typeof addressSchema>;

const Profile = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses'>('profile');

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
    },
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: '',
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      is_default: false,
    },
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    if (user) {
      profileForm.reset({
        first_name: user.first_name,
        last_name: user.last_name,
      });
    }
  }, [user, profileForm]);

  const loadAddresses = async () => {
    try {
      const data = await authService.getAddresses();
      setAddresses(data);
    } catch {
      // handled by interceptor
    }
  };

  const handleProfileSubmit = async (data: ProfileFormData) => {
    try {
      await authService.updateProfile(data);
      dispatch(fetchCurrentUser());
      toast.success('Profile updated successfully');
    } catch {
      // handled by interceptor
    }
  };

  const handleAddressSubmit = async (data: AddressFormData) => {
    try {
      if (editingAddress) {
        await authService.updateAddress(editingAddress.id, data);
        toast.success('Address updated');
      } else {
        await authService.addAddress(data);
        toast.success('Address added');
      }
      loadAddresses();
      setShowAddressForm(false);
      setEditingAddress(null);
      addressForm.reset();
    } catch {
      // handled by interceptor
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await authService.deleteAddress(id);
      toast.success('Address deleted');
      loadAddresses();
    } catch {
      // handled by interceptor
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    addressForm.reset({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      country: address.country,
      is_default: address.is_default,
    });
    setShowAddressForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">My Profile</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-1 font-medium transition border-b-2 ${
            activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 px-1 font-medium transition border-b-2 ${
            activeTab === 'addresses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Addresses</span>
          </div>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  {...profileForm.register('first_name')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                {profileForm.formState.errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  {...profileForm.register('last_name')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                {profileForm.formState.errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Saved Addresses</h2>
            <button
              onClick={() => {
                setEditingAddress(null);
                addressForm.reset({ label: '', street: '', city: '', state: '', zip_code: '', country: '', is_default: false });
                setShowAddressForm(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Address</span>
            </button>
          </div>

          {showAddressForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {editingAddress ? 'Edit Address' : 'New Address'}
              </h3>
              <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                  <input
                    {...addressForm.register('label')}
                    placeholder="e.g., Home, Office"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  {addressForm.formState.errors.label && (
                    <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.label.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Street</label>
                  <input
                    {...addressForm.register('street')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  {addressForm.formState.errors.street && (
                    <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.street.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                    <input
                      {...addressForm.register('city')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    {addressForm.formState.errors.city && (
                      <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                    <input
                      {...addressForm.register('state')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    {addressForm.formState.errors.state && (
                      <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.state.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Zip Code</label>
                    <input
                      {...addressForm.register('zip_code')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    {addressForm.formState.errors.zip_code && (
                      <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.zip_code.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                    <input
                      {...addressForm.register('country')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    {addressForm.formState.errors.country && (
                      <p className="mt-1 text-sm text-red-600">{addressForm.formState.errors.country.message}</p>
                    )}
                  </div>
                </div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" {...addressForm.register('is_default')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Set as default address</span>
                </label>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                  >
                    {editingAddress ? 'Update Address' : 'Add Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddressForm(false); setEditingAddress(null); }}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div key={address.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-slate-800">{address.label}</h3>
                    {address.is_default && (
                      <span className="flex items-center space-x-1 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" />
                        <span>Default</span>
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditAddress(address)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{address.street}</p>
                <p className="text-sm text-slate-600">{address.city}, {address.state} {address.zip_code}</p>
                <p className="text-sm text-slate-600">{address.country}</p>
              </div>
            ))}
          </div>

          {addresses.length === 0 && !showAddressForm && (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-slate-500">No addresses saved yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
