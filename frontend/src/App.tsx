import { useState, useEffect } from 'react';

// Explicit type layout matching our backend API payload structure
interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  createdAt: string;
}

interface Cursor {
  createdAt: string;
  id: string;
}

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Home', 'Books', 'Sports'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<string>('All');
  
  // Historical cursor tracking stack allows going backwards accurately in time
  const [cursorHistory, setCursorHistory] = useState<(Cursor | null)[]>([]); 
  const [currentCursor, setCurrentCursor] = useState<Cursor | null>(null);
  const [nextCursor, setNextCursor] = useState<Cursor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Reset pagination state whenever a user switches categories
  useEffect(() => {
    setCurrentCursor(null);
    setCursorHistory([]);
  }, [category]);

  // Main background polling effect synchronized to filter selectors
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
       let url = `${API_BASE_URL}/api/products?limit=15`;
        if (category !== 'All') url += `&category=${category}`;
        if (currentCursor) {
          url += `&nextCreatedAt=${encodeURIComponent(currentCursor.createdAt)}&nextId=${currentCursor.id}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        
        setProducts(data.items);
        setNextCursor(data.nextCursor);
      } catch (err) {
        console.error("Critical Failure: UI could not pull api stream data.", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [category, currentCursor]);

  const handleNextPage = () => {
    if (!nextCursor) return;
    // Push the current cursor position onto our tracking stack history
    setCursorHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(nextCursor);
  };

  const handlePrevPage = () => {
    if (cursorHistory.length === 0) return;
    const historyCopy = [...cursorHistory];
    const previousCursorLocation = historyCopy.pop(); // Take last frame off stack
    setCursorHistory(historyCopy);
    setCurrentCursor(previousCursorLocation || null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased selection:bg-blue-500 selection:text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header Branding Panel */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">⚡ Live Distributed Inventory</h1>
            <p className="text-sm text-gray-500 mt-1">Cursor-locked pagination tracking 200,000 active entries.</p>
          </div>
          
          <div className="flex items-center gap-3 self-start sm:self-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category Segment:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Content Section Renderer */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-500">Syncing indexes and executing pipeline layout...</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product Name</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category Tag</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price Matrix</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Creation Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {products.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-4 font-semibold text-gray-900">{item.name}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-blue-600">${parseFloat(item.price).toFixed(2)}</td>
                        <td className="p-4 text-gray-500 font-mono text-xs">{new Date(item.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls Wrapper */}
            <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <button
                onClick={handlePrevPage}
                disabled={cursorHistory.length === 0}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                ← Prev Frame
              </button>
              
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">Immutable Cursor Shield Active</span>
              </div>

              <button
                onClick={handleNextPage}
                disabled={!nextCursor}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next Frame →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
