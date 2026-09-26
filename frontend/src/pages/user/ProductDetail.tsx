import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, RotateCcw, Clock } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProductById, clearSelectedProduct } from '../../store/slices/productSlice';
import { addToCart } from '../../store/slices/cartSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { ProductVariant } from '../../types';

/** Variants render in the order the catalogue admin gave them. */
const sortVariants = (list?: ProductVariant[] | null): ProductVariant[] =>
  [...(list || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

/** Server sends a computed label ("500 g · Red"); rebuild one if it's missing. */
const variantLabel = (v: ProductVariant): string =>
  v.label ||
  Object.values(v.option_values || {})
    .filter(Boolean)
    .join(' · ') ||
  v.sku ||
  'Option';

const pctOff = (price: number, mrp: number | null): number =>
  mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

/** One selectable chip inside an option group. */
interface ChipOption {
  value: string;
  variant: ProductVariant | null;
  selected: boolean;
  disabled: boolean;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { selectedProduct: product, loading } = useAppSelector((state) => state.products);
  const { user } = useAppSelector((state) => state.auth);
  const { items: cartItems, submitting } = useAppSelector((state) => state.cart);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  // Set once the shopper picks a thumbnail, which overrides the variant's own photo.
  const [thumbPicked, setThumbPicked] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [dispatch, id]);

  // Reset the gallery + option selection whenever we land on a different product.
  useEffect(() => {
    setActiveImage(0);
    setSelectedVariantId(null);
    setThumbPicked(false);
  }, [id]);

  // A product with active variants must always have one chosen — the API rejects
  // an add-to-cart with no variant. Default to the first in-stock option.
  useEffect(() => {
    const choices = sortVariants(product?.variants).filter((v) => v.is_active);
    if (choices.length === 0) {
      setSelectedVariantId(null);
      return;
    }
    setSelectedVariantId((prev) => {
      if (prev && choices.some((v) => v.id === prev)) return prev;
      return (choices.find((v) => v.stock > 0) || choices[0]).id;
    });
  }, [product]);

  const variants = sortVariants(product?.variants);
  const hasVariants = variants.some((v) => v.is_active);
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || null;

  // Everything price/stock related comes from the selected variant when there is one.
  const rawStock = Number(selectedVariant ? selectedVariant.stock : product?.stock ?? 0);

  // How much of this exact line (product + variant) is already sitting in the
  // customer's own cart — "Add to Cart" doesn't reserve stock on the server,
  // so we subtract it here or the stepper/"left in stock" numbers look stale
  // right after adding (they'd still show the pre-cart total).
  const qtyAlreadyInCart = product
    ? cartItems
        .filter((item) => item.product_id === product.id && (item.variant_id ?? null) === (selectedVariant?.id ?? null))
        .reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const effectiveStock = Math.max(0, rawStock - qtyAlreadyInCart);

  // Keep the stepper inside what's actually still available to add.
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, effectiveStock)));
  }, [effectiveStock]);

  const handleAddToCart = async () => {
    if (!product) return;
    if (hasVariants && !selectedVariant) return;
    if (effectiveStock <= 0) return;
    const result = await dispatch(addToCart({ product, quantity, variant: selectedVariant }));
    if (addToCart.fulfilled.match(result)) {
      // Reset the stepper — quantity now reflects what's left to add, not what
      // was just added, so leaving it at (e.g.) 3 would misread as available.
      setQuantity(1);
    }
  };

  if (loading || !product) {
    return <LoadingSpinner />;
  }

  // Guests (local cart) and customers can shop; staff cannot.
  const isCustomer = !user || user.role === 'customer';

  const effectivePrice = Number(selectedVariant ? selectedVariant.price : product.price);
  const outOfStock = effectiveStock <= 0;
  const totalPrice = (effectivePrice * quantity).toFixed(2);

  // Gallery: prefer the API-built gallery, otherwise fall back to the single image.
  const gallery = (
    product.gallery && product.gallery.length > 0 ? product.gallery : [product.image_url]
  ).filter((src): src is string => !!src);
  const variantImage = selectedVariant?.image_url || null;
  // A selected variant's own photo becomes the hero shot until a thumbnail is clicked.
  const usingVariantImage = !thumbPicked && !!variantImage;
  const mainImage = (usingVariantImage && variantImage) || gallery[activeImage] || gallery[0] || null;

  // Price block — same rules as ProductCard, but variant-aware.
  const mrpSource = selectedVariant ? selectedVariant.mrp : product.mrp;
  const mrp = mrpSource ? Number(mrpSource) : null;
  const showMrp = !!mrp && mrp > effectivePrice;
  const discount = selectedVariant
    ? selectedVariant.discount_percent || pctOff(effectivePrice, mrp)
    : product.discount_percent || 0;

  // Option groups: names come from the product, or are derived from the variants.
  const declaredNames = (product.variant_options || []).filter(
    (n): n is string => typeof n === 'string' && n.trim() !== ''
  );
  const derivedNames: string[] = [];
  variants.forEach((v) => {
    Object.keys(v.option_values || {}).forEach((n) => {
      if (n && !derivedNames.includes(n)) derivedNames.push(n);
    });
  });
  const optionNames = declaredNames.length > 0 ? declaredNames : derivedNames;
  const selectedValues = selectedVariant?.option_values || {};

  // Picking a chip keeps the other options where they are when that combo is buyable,
  // otherwise it falls back to a buyable variant carrying that value, so a shopper
  // can never get stuck on a dead-end combination.
  const resolveTarget = (name: string, value: string): ProductVariant | null => {
    const others = optionNames.filter((n) => n !== name);
    const matches = variants.filter((v) => (v.option_values?.[name] || '') === value);
    const buyable = (v: ProductVariant) => v.is_active && v.stock > 0;
    const exact = matches.find((v) =>
      others.every((n) => (v.option_values?.[n] || '') === (selectedValues[n] || ''))
    );
    if (exact && buyable(exact)) return exact;
    return matches.find(buyable) || exact || matches[0] || null;
  };

  const optionGroups: { name: string; options: ChipOption[] }[] =
    optionNames.length > 0
      ? optionNames
          .map((name) => {
            const values: string[] = [];
            variants.forEach((v) => {
              const val = v.option_values?.[name];
              if (val && !values.includes(val)) values.push(val);
            });
            return {
              name,
              options: values.map((value) => {
                const variant = resolveTarget(name, value);
                return {
                  value,
                  variant,
                  selected: (selectedValues[name] || '') === value,
                  disabled: !variant || !variant.is_active || variant.stock <= 0,
                };
              }),
            };
          })
          .filter((g) => g.options.length > 0)
      : [
          {
            name: 'Option',
            options: variants.map((v) => ({
              value: variantLabel(v),
              variant: v,
              selected: v.id === selectedVariant?.id,
              disabled: !v.is_active || v.stock <= 0,
            })),
          },
        ];

  const selectVariant = (variant: ProductVariant | null) => {
    if (!variant) return;
    setSelectedVariantId(variant.id);
    setThumbPicked(false);
  };

  const specs = product.specifications?.filter((s) => s && s.label) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center flex-wrap gap-1 text-sm text-gray-400 mb-10">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span className="mx-1">&middot;</span>
        <Link to="/products" className="hover:text-brand-500 transition-colors">Products</Link>
        {product.sub_category?.category && (
          <>
            <span className="mx-1">&middot;</span>
            <Link
              to={`/products?category=${product.sub_category.category.id}`}
              className="hover:text-brand-500 transition-colors"
            >
              {product.sub_category.category.name}
            </Link>
          </>
        )}
        {product.sub_category && (
          <>
            <span className="mx-1">&middot;</span>
            <span>{product.sub_category.name}</span>
          </>
        )}
        <span className="mx-1">&middot;</span>
        <span className="text-gray-700 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Product Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative bg-gray-100 rounded-2xl h-96 lg:h-[520px] flex items-center justify-center overflow-hidden">
            {mainImage ? (
              <img src={mainImage} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-8xl lg:text-9xl font-semibold text-gray-200 select-none tracking-wider">
                {product.name.substring(0, 2).toUpperCase()}
              </span>
            )}
            {discount > 0 && (
              <span className="absolute top-3 left-3 rounded-md bg-brand-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                {discount}% OFF
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {gallery.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => {
                    setActiveImage(i);
                    setThumbPicked(true);
                  }}
                  aria-label={`View image ${i + 1} of ${gallery.length}`}
                  aria-current={!usingVariantImage && i === activeImage}
                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 transition-colors ${
                    !usingVariantImage && i === activeImage
                      ? 'border-brand-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={src}
                    alt={`${product.name} thumbnail ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          {/* Category Badge */}
          <div className="mb-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
              {product.sub_category?.category?.name || 'Category'}
              {product.sub_category && (
                <> / {product.sub_category.name}</>
              )}
            </span>
          </div>

          {/* Name + pack size */}
          <div className="mb-4">
            {product.brand && (
              <Link
                to={`/products?brand_id=${product.brand.id}`}
                className="inline-block mb-1 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
              >
                {product.brand.name}
              </Link>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.unit && (
              <span className="mt-1.5 inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-600">
                {product.unit}
              </span>
            )}
          </div>

          {/* Price + delivery */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <p className="text-3xl font-bold text-gray-900">
              ₹{effectivePrice.toFixed(2)}
              {product.unit && (
                <span className="ml-2 text-sm font-medium text-gray-400">/ {product.unit}</span>
              )}
            </p>
            {showMrp && (
              <span className="text-lg text-gray-400 line-through">₹{mrp!.toFixed(2)}</span>
            )}
            {discount > 0 && (
              <span className="rounded-md bg-brand-500 px-2 py-1 text-xs font-bold text-white">
                {discount}% OFF
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
              <Clock className="w-3.5 h-3.5" /> 10 min delivery
            </span>
          </div>

          {/* Variant options — one chip group per option name */}
          {hasVariants && (
            <div className="mb-6 space-y-4">
              {optionGroups.map((group) => (
                <div key={group.name} role="group" aria-label={group.name}>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    {group.name}
                    {selectedVariant && (
                      <span className="ml-2 normal-case tracking-normal font-semibold text-gray-700">
                        {optionNames.length > 0
                          ? selectedValues[group.name] || ''
                          : variantLabel(selectedVariant)}
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => (
                      <button
                        key={`${group.name}-${opt.value}`}
                        type="button"
                        onClick={() => selectVariant(opt.variant)}
                        disabled={opt.disabled}
                        aria-pressed={opt.selected}
                        title={opt.disabled ? `${opt.value} — out of stock` : opt.value}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          opt.selected
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : opt.disabled
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <span className={opt.disabled ? 'line-through' : ''}>{opt.value}</span>
                        {opt.disabled && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide">
                            Out of stock
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stock — of the selected variant when the product has options */}
          <p className={`text-sm mb-6 ${
            effectiveStock > 10
              ? 'text-emerald-600'
              : effectiveStock > 0
              ? 'text-amber-600'
              : 'text-red-500'
          }`}>
            {effectiveStock > 10
              ? 'In Stock'
              : effectiveStock > 0
              ? `Only ${effectiveStock} left in stock`
              : 'Out of Stock'}
          </p>

          {/* Return Policy */}
          {product.is_returnable && (
            <p className="text-sm text-brand-600 mb-6 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              {product.return_window_days
                ? `Returnable within ${product.return_window_days} days of delivery`
                : 'Returnable'}
            </p>
          )}

          {/* Description */}
          <div className="border-t border-gray-100 pt-6 mb-8">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Specifications */}
          {specs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Specifications
              </h3>
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map((spec, i) => (
                      <tr
                        key={`${spec.label}-${i}`}
                        className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <th
                          scope="row"
                          className="w-2/5 px-4 py-2.5 text-left align-top font-medium text-gray-500"
                        >
                          {spec.label}
                        </th>
                        <td className="px-4 py-2.5 align-top text-gray-800">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add to Cart */}
          {isCustomer && (hasVariants || product.stock > 0) && (
            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={submitting}
                    className="p-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="px-4 py-2 font-medium text-sm min-w-[48px] text-center text-gray-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(Math.max(1, effectiveStock), quantity + 1))}
                    disabled={submitting}
                    className="p-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={submitting || outOfStock || (hasVariants && !selectedVariant)}
                  className="flex-1 sm:flex-none px-8 py-3 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <ButtonSpinner /> : <ShoppingCart className="w-4 h-4" />}
                  <span>
                    {submitting ? 'Adding...' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
                  </span>
                  {!outOfStock && <span className="text-white/70 ml-1">&middot; ₹{totalPrice}</span>}
                </button>
              </div>
            </div>
          )}

          {user && user.role !== 'customer' && (
            <p className="text-sm text-gray-400 mt-auto italic">Shopping is available from a customer account.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
