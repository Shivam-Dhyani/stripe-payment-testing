import { Link } from 'react-router-dom';
import { Plus, Minus, Clock } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { addToCart, updateCartItem, removeFromCart } from '../../store/slices/cartSlice';
import { Product } from '../../types';

const ProductCard = ({ product }: { product: Product }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { items } = useAppSelector((s) => s.cart);

  const cartItem = items.find((i) => i.product_id === product.id);
  const qty = cartItem?.quantity || 0;
  const isCustomer = user?.role === 'customer';
  const outOfStock = product.stock <= 0;

  const add = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch(addToCart({ productId: product.id, quantity: 1 }));
  };
  const inc = (e: React.MouseEvent) => {
    e.preventDefault();
    if (cartItem) dispatch(updateCartItem({ itemId: cartItem.id, quantity: Math.min(qty + 1, product.stock) }));
  };
  const dec = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cartItem) return;
    if (qty <= 1) dispatch(removeFromCart(cartItem.id));
    else dispatch(updateCartItem({ itemId: cartItem.id, quantity: qty - 1 }));
  };

  return (
    <div className="qc-card p-2.5 flex flex-col">
      <Link to={`/products/${product.id}`} className="block flex-1">
        <div className="relative rounded-xl bg-gray-50 aspect-square flex items-center justify-center mb-2 overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-gray-200 select-none">
              {product.name.substring(0, 2).toUpperCase()}
            </span>
          )}
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 shadow-sm">
            <Clock className="w-3 h-3 text-brand-500" /> 10 min
          </span>
          {outOfStock && (
            <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-semibold text-gray-500">
              Out of stock
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate">{product.sub_category?.name || 'Grocery'}</p>
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        {product.unit && (
          <span className="mt-0.5 inline-block rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
            {product.unit}
          </span>
        )}
      </Link>

      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-sm font-bold text-gray-900">${Number(product.price).toFixed(2)}</span>
        {outOfStock ? (
          <span className="text-[11px] font-medium text-gray-400">Sold out</span>
        ) : isCustomer ? (
          qty === 0 ? (
            <button onClick={add} className="qc-add-btn">ADD</button>
          ) : (
            <div className="qc-stepper">
              <button onClick={dec} aria-label="decrease"><Minus className="w-3.5 h-3.5" /></button>
              <span className="w-7 text-center text-sm font-bold">{qty}</span>
              <button onClick={inc} aria-label="increase"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          )
        ) : (
          <Link to="/login" className="qc-add-btn" onClick={(e) => e.stopPropagation()}>ADD</Link>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
