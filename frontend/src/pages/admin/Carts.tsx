import { useEffect, useState } from 'react';
import { ShoppingCart, ChevronDown, ChevronUp, User, Package, Search } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchAllCarts } from '../../store/slices/adminCartSlice';
import { AdminCartUser } from '../../types';

const Carts = () => {
  const dispatch = useAppDispatch();
  const { carts, loading } = useAppSelector((state) => state.adminCart);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchAllCarts());
  }, [dispatch]);

  const toggleExpand = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const filteredCarts = carts.filter((cart) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const fullName = `${cart.first_name || ''} ${cart.last_name || ''}`.toLowerCase();
    return fullName.includes(q) || cart.email.toLowerCase().includes(q);
  });

  const totalCartValue = carts.reduce((sum, c) => sum + c.cart_total, 0);
  const totalItems = carts.reduce((sum, c) => sum + c.total_items, 0);

  if (loading) {
    return (
      <div>
        <h1 className="text-title-sm font-bold text-gray-800 mb-6">User Carts</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-title-sm font-bold text-gray-800">User Carts</h1>
          {carts.length > 0 && (
            <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {carts.length} active
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name or email..."
            className="pl-9 pr-4 py-2 h-10 w-72 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <User className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Users with Carts</p>
              <p className="text-2xl font-bold text-gray-800">{carts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cart Value</p>
              <p className="text-2xl font-bold text-gray-800">${totalCartValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {filteredCarts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-lg">{search ? 'No matching carts found' : 'No users have items in their cart'}</p>
          {search && <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCarts.map((cart: AdminCartUser) => (
            <div key={cart.user_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleExpand(cart.user_id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {(cart.first_name?.[0] || cart.email[0]).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">
                      {cart.first_name && cart.last_name
                        ? `${cart.first_name} ${cart.last_name}`
                        : cart.email}
                    </p>
                    <p className="text-sm text-gray-500">{cart.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{cart.total_items} items</p>
                    <p className="font-semibold text-gray-800">${cart.cart_total.toFixed(2)}</p>
                  </div>
                  {expandedUser === cart.user_id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedUser === cart.user_id && (
                <div className="border-t border-gray-200 px-5 pb-5">
                  <div className="mt-4 space-y-3">
                    {cart.cart_items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {item.product_name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{item.product_name}</p>
                            <p className="text-sm text-gray-500">
                              ${item.product_price.toFixed(2)} x {item.quantity}
                            </p>
                            <p className="text-xs text-gray-400">
                              Stock: {item.stock} | Added: {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-gray-800">
                          ${(item.product_price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Carts;
