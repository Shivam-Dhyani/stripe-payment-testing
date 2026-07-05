import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X } from 'lucide-react';
import { productService } from '../../services/productService';
import { Product } from '../../types';

const RECENT_KEY = 'recent_searches';

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  const list = [q, ...getRecent().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

/** Search with product autocomplete + recent searches. */
const SearchBox = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>(getRecent());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced product autocomplete.
  useEffect(() => {
    const term = q.trim();
    if (timer.current) clearTimeout(timer.current);
    if (!term) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await productService.getAll({ search: term, size: 6 });
        setSuggestions(res.items || []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const runSearch = (term: string) => {
    const t = term.trim();
    setOpen(false);
    if (t) {
      pushRecent(t);
      setRecent(getRecent());
    }
    navigate(t ? `/products?search=${encodeURIComponent(t)}` : '/products');
  };

  const clearRecent = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  };

  return (
    <div className="relative w-full">
      <form onSubmit={(e) => { e.preventDefault(); runSearch(q); }} role="search">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder='Search "milk", "atta", "maggi"...'
          aria-label="Search products"
          className="w-full h-11 pl-10 pr-9 rounded-xl bg-white border border-black/5 shadow-qc-card text-sm text-ink-900 placeholder:text-gray-400 focus:outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/15 transition"
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setSuggestions([]); }} aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-theme-lg border border-gray-100 py-1 z-50 max-h-96 overflow-y-auto">
            {q.trim() ? (
              suggestions.length > 0 ? (
                suggestions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setOpen(false); navigate(`/products/${p.id}`); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[10px] font-bold text-gray-300">{p.name.substring(0, 2).toUpperCase()}</span>}
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-800 truncate">{p.name}</span>
                      {p.unit && <span className="block text-xs text-gray-400">{p.unit}</span>}
                    </span>
                    <span className="text-sm font-semibold text-gray-700 shrink-0">₹{Number(p.price).toFixed(0)}</span>
                  </button>
                ))
              ) : (
                <button onClick={() => runSearch(q)} className="w-full text-left px-4 py-3 text-sm text-gray-500 hover:bg-gray-50">
                  No matches — press Enter to search “{q.trim()}”
                </button>
              )
            ) : recent.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-4 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Recent</span>
                  <button onClick={clearRecent} className="text-[11px] font-medium text-brand-600 hover:text-brand-700">Clear</button>
                </div>
                {recent.map((r) => (
                  <button key={r} onClick={() => runSearch(r)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-gray-50 transition-colors">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700">{r}</span>
                  </button>
                ))}
              </>
            ) : (
              <p className="px-4 py-3 text-sm text-gray-400">Search for products, brands and more</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchBox;
