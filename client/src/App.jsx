import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import ProductCard from './components/ProductCard';
import Sidebar from './components/Sidebar';
import AdminDashboard from './components/AdminDashboard';
import Auth from './components/Auth';
import Landing from './components/Landing'; 
import Settings from './components/Settings'; 
import './App.css';

// --- NEW: FESTIVE DECORATION COMPONENT ---
// This adds visual elements like lanterns/sparkles only when festive mode is on.
const FestiveDecorations = () => (
  <div className="festive-overlay">
    <div className="lantern lantern-left">🏮</div>
    <div className="lantern lantern-right">🏮</div>
    <div className="sparkle-layer"></div>
  </div>
);

function MainApp({ user, handleLogout }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]); 
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]); 
  const [purchaseVersion, setPurchaseVersion] = useState(0); 
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isAiLoading, setIsAiLoading] = useState(false); 
  const [activeTab, setActiveTab] = useState('shop');

  // --- FESTIVE STATES ---
  const [isFestiveMode, setIsFestiveMode] = useState(false);
  const [adminFestiveMode, setAdminFestiveMode] = useState('none'); 

  const loadData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data);
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error("Failed to load products from server.");
    }
  };

  const handleAiPricing = async () => {
    setIsAiLoading(true);
    const toastId = toast.loading("AI Engine: Calculating Festive Hikes & Discounts...");
    try {
      await axios.post('http://localhost:5000/api/update-prices');
      toast.success("AI Pricing Applied!", { id: toastId });
      await loadData(); 
    } catch (err) {
      console.error("AI Error:", err);
      toast.error("AI Engine failed to start.", { id: toastId });
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (category === "All") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p => p.category === category));
    }
  }, [category, products]);

  const displayedProducts = useMemo(() => {
    if (isFestiveMode) {
      const now = new Date();
      return filteredProducts.filter(p => {
        const isDateActive = p.festivalEndDate && now <= new Date(p.festivalEndDate);
        return p.isFestive || isDateActive;
      });
    }
    return filteredProducts;
  }, [filteredProducts, isFestiveMode]);

  const handleAddToCart = (productWithQty) => {
    if (productWithQty.stockLevel <= 0) {
      toast.error("Item is out of stock!");
      return;
    }
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(item => item._id === productWithQty._id);
      if (existingItemIndex !== -1) {
        const updatedCart = [...prevCart];
        const newQty = updatedCart[existingItemIndex].selectedQuantity + productWithQty.selectedQuantity;
        if (newQty > productWithQty.stockLevel) {
          toast.error(`Only ${productWithQty.stockLevel} in stock.`);
          return prevCart;
        }
        updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], selectedQuantity: newQty };
        return updatedCart;
      } else {
        toast.success(`"${productWithQty.name}" added to cart!`);
        return [...prevCart, productWithQty];
      }
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.currentPrice * item.selectedQuantity), 0);

  const handleBuy = async () => {
    if (cart.length === 0) return;
    const toastId = toast.loading("Processing transaction...");
    try {
      const response = await axios.post('http://localhost:5000/api/purchase', { cartItems: cart });
      if (response.data.success) {
        toast.success(`Purchase Successful!`, { id: toastId });
        setCart([]); 
        setIsCartOpen(false); 
        setPurchaseVersion(prev => prev + 1); 
        await loadData(); 
      }
    } catch (err) {
      toast.error("Transaction failed.", { id: toastId });
    }
  };

  const limitedOffers = products.filter(p => {
    const now = new Date();
    const isFestiveActive = p.isFestive || (p.festivalEndDate && now <= new Date(p.festivalEndDate));
    if (isFestiveMode) return isFestiveActive;
    const end = new Date(p.expiryDate).getTime();
    const distance = end - now.getTime();
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    const isNearExpiry = distance > 0 && distance <= tenDaysInMs;
    const isLowStock = p.stockLevel > 0 && p.stockLevel < 5;
    return isFestiveActive || isNearExpiry || isLowStock;
  });

  if (activeTab === 'settings') {
    return <Settings user={user} onBack={() => setActiveTab('shop')} />;
  }

  return (
    <div className={`main-container ${isFestiveMode ? 'festive-active' : ''} theme-${adminFestiveMode}`}>
      {/* Visual hook: Overlay decorations */}
      {isFestiveMode && <FestiveDecorations />}
      
      <Toaster position="top-right" />
      <nav className="navbar">
        <h1 className={isFestiveMode ? 'festive-title' : ''}>
          {isFestiveMode ? '✨ FestiveMart' : '🛒 FreshMart'} {user.role === 'admin' ? '📊 Admin' : ''}
        </h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {user.role === 'customer' && (
             <button 
               className={`festive-toggle-btn ${isFestiveMode ? 'active' : ''}`}
               onClick={() => setIsFestiveMode(!isFestiveMode)}
             >
               {isFestiveMode ? '🕶️ Show Standard' : '🎈 Festive Mode'}
             </button>
          )}
          <button onClick={() => setActiveTab('settings')} className="settings-btn">
            {user.role === 'admin' ? '🔒 Security' : '⚙️ Profile'}
          </button>
          {user.role === 'customer' && (
            <div className="cart-trigger" onClick={() => setIsCartOpen(!isCartOpen)}>
              <span className="cart-icon">🛒</span>
              {cart.length > 0 && <span className="cart-badge">{cart.reduce((acc, item) => acc + item.selectedQuantity, 0)}</span>}
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="content-layout">
        {user.role === 'admin' ? (
          <AdminDashboard 
            products={products} 
            refreshData={loadData} 
            onRunAi={handleAiPricing} 
            isAiLoading={isAiLoading}
            setAdminFestiveMode={setAdminFestiveMode}
            adminFestiveMode={adminFestiveMode}
          />
        ) : (
          <>
            <Sidebar activeCategory={category} setCategory={setCategory} />
            <div className="product-grid-container">
              
              {/* Cart UI with festive class injection */}
              {isCartOpen && (
                <div className={`cart-overlay-modal ${isFestiveMode ? 'festive-cart' : ''}`}>
                  <div className="cart-header">
                    <h3>{isFestiveMode ? '🎁 My Festive Bag' : '📝 My Shopping List'}</h3>
                    <button className="close-cart" onClick={() => setIsCartOpen(false)}>✕</button>
                  </div>
                  <div className="cart-items-scroll">
                    {cart.map((item, index) => (
                      <div key={index} className="cart-item-row">
                        <div>
                          <span className="cart-item-name">{item.name}</span>
                          <span className="cart-item-qty">x{item.selectedQuantity}</span>
                        </div>
                        <b className="cart-item-price">₹{(item.currentPrice * item.selectedQuantity).toFixed(2)}</b>
                      </div>
                    ))}
                  </div>
                  <div className="cart-footer">
                    <div className="total-display"><span>Total:</span><span>₹{totalAmount.toFixed(2)}</span></div>
                    <button onClick={handleBuy} className="buy-all-btn" disabled={cart.length === 0}>
                      {isFestiveMode ? '✨ Checkout Now' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              )}

              {category === "All" && limitedOffers.length > 0 && (
                <div className="trending-section">
                  <div className={isFestiveMode ? 'festive-hero-banner' : 'festive-banner'}>
                      {isFestiveMode && <h2 className="festive-glow-text">✨ Exclusive Season Offers! ✨</h2>}
                  </div>
                  <h2 className="section-title">{isFestiveMode ? '🎊 Top Festive Picks' : '🔥 Trending & Offers'}</h2>
                  <div className="trending-scroll">
                    {limitedOffers.map(p => (
                      <ProductCard 
                        key={`${p._id}-${purchaseVersion}-trending`} 
                        product={p} 
                        onAddToCart={handleAddToCart}
                        userRole={user.role}
                        isFestiveMode={isFestiveMode}
                      />
                    ))}
                  </div>
                  <hr className="divider" />
                </div>
              )}   

              <h2 className="section-title">{category} Products</h2>
              <div className="product-grid">
                {displayedProducts.length > 0 ? (
                  displayedProducts.map(p => (
                    <ProductCard 
                      key={`${p._id}-${purchaseVersion}`} 
                      product={p} 
                      onAddToCart={handleAddToCart} 
                      userRole={user.role} 
                      isFestiveMode={isFestiveMode}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <p className="no-products">
                      {isFestiveMode ? "🎋 No festive items found." : "No products available."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- ROOT APP COMPONENT ---
function App() {
  const SESSION_DURATION = 15 * 60 * 1000;
  const [user, setUser] = useState(() => {
    const savedData = localStorage.getItem('userSession');
    if (!savedData) return null;
    const { user, loginTime } = JSON.parse(savedData);
    if (Date.now() - loginTime > SESSION_DURATION) {
      localStorage.removeItem('userSession');
      return null;
    }
    return user;
  });

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('userSession');
    toast.success("Logged out successfully");
  }, []);

  const handleLogin = (userData) => {
    const sessionData = { user: userData, loginTime: Date.now() };
    localStorage.setItem('userSession', JSON.stringify(sessionData));
    setUser(userData);
  };

  useEffect(() => {
    if (user) {
      const savedData = JSON.parse(localStorage.getItem('userSession'));
      if (savedData) {
        const remainingTime = SESSION_DURATION - (Date.now() - savedData.loginTime);
        const timeout = setTimeout(() => {
          alert("Session expired. Please log in again.");
          handleLogout();
        }, remainingTime);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, handleLogout]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!user ? <Auth setUser={handleLogin} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <MainApp user={user} handleLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;