import React, { useEffect, useState, useCallback } from 'react';
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

// --- MAIN APP COMPONENT ---
function MainApp({ user, handleLogout }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]); 
  const [purchaseVersion, setPurchaseVersion] = useState(0); 
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isAiLoading, setIsAiLoading] = useState(false); 
  const [activeTab, setActiveTab] = useState('shop'); // Toggle between 'shop' and 'settings'

  const loadData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error("Failed to load products from server.");
    }
  };

  const handleAiPricing = async () => {
    setIsAiLoading(true);
    const toastId = toast.loading("AI Engine: Analyzing expiry dates...");
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

  const handleAddToCart = (product) => {
    if (product.stockLevel <= 0) {
      toast.error("Item is out of stock!");
      return;
    }
    setCart((prev) => [...prev, product]);
    toast.success(`"${product.name}" added to cart!`);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.currentPrice, 0);

  const handleBuy = async () => {
    if (cart.length === 0) return;
    const toastId = toast.loading("Processing transaction...");
    try {
      const response = await axios.post('http://localhost:5000/api/purchase', { 
        cartItems: cart 
      });
      if (response.data.success) {
        toast.success(`Purchase Successful!`, { id: toastId });
        setCart([]); 
        setIsCartOpen(false); 
        setPurchaseVersion(prev => prev + 1); 
        await loadData(); 
      }
    } catch (err) {
      console.error("Transaction Error:", err);
      toast.error("Transaction failed.", { id: toastId });
    }
  };

  const limitedOffers = products.filter(p => {
    const now = new Date().getTime();
    const end = new Date(p.expiryDate).getTime();
    const distance = end - now;
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    const isNearExpiry = distance > 0 && distance <= tenDaysInMs;
    const isLowStock = p.stockLevel > 0 && p.stockLevel < 5;
    return isNearExpiry || isLowStock;
  });

  // --- RENDER LOGIC FOR SETTINGS VIEW ---
  if (activeTab === 'settings') {
    return <Settings user={user} onBack={() => setActiveTab('shop')} />;
  }

  return (
    <div className="main-container">
      <Toaster position="top-right" />
      <nav className="navbar">
        <h1 style={{ margin: 0 }}>🛒 FreshMart {user.role === 'admin' ? '📊 Admin' : '✨ AI Shop'}</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          
          {/* Universal Settings Button for both Admin and Customer */}
          <button onClick={() => setActiveTab('settings')} className="settings-btn">
            {user.role === 'admin' ? '🔒 Security' : '⚙️ Profile'}
          </button>

          {user.role === 'customer' && (
            <div className="cart-trigger" onClick={() => setIsCartOpen(!isCartOpen)}>
              <span className="cart-icon">🛒</span>
              {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
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
          />
        ) : (
          <>
            <Sidebar activeCategory={category} setCategory={setCategory} />
            <div className="product-grid-container">
              {isCartOpen && (
                <div className="cart-overlay-modal">
                  <div className="cart-header">
                    <h3>📝 My Shopping List</h3>
                    <button className="close-cart" onClick={() => setIsCartOpen(false)}>✕</button>
                  </div>
                  <div className="cart-items-scroll">
                    {cart.length > 0 ? (
                      cart.map((item, index) => (
                        <div key={index} className="cart-item-row">
                          <span>{item.name}</span>
                          <b>₹{item.currentPrice.toFixed(2)}</b>
                        </div>
                      ))
                    ) : (
                      <p className="empty-msg">Your list is empty.</p>
                    )}
                  </div>
                  <div className="cart-footer">
                    <div className="total-display">
                      <span>Total:</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <button onClick={handleBuy} className="buy-all-btn" disabled={cart.length === 0}>
                      Buy Now
                    </button>
                  </div>
                </div>
              )}

              {category === "All" && limitedOffers.length > 0 && (
                <div className="trending-section">
                  <h2 className="section-title">🔥 Limited Time Offers</h2>
                  <div className="trending-scroll">
                    {limitedOffers.map(p => (
                      <ProductCard 
                        key={`${p._id}-${purchaseVersion}-trending`} 
                        product={p} 
                        onAddToCart={handleAddToCart}
                        userRole={user.role}
                      />
                    ))}
                  </div>
                  <hr className="divider" />
                </div>
              )}   

              <h2 className="section-title">{category} Products</h2>
              <div className="product-grid">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(p => (
                    <ProductCard 
                      key={`${p._id}-${purchaseVersion}`} 
                      product={p} 
                      onAddToCart={handleAddToCart} 
                      userRole={user.role} 
                    />
                  ))
                ) : (
                  <p className="no-products">No products available in this category.</p>
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
        
        <Route 
          path="/login" 
          element={!user ? <Auth setUser={handleLogin} /> : <Navigate to="/dashboard" />} 
        />
        
        <Route 
          path="/dashboard" 
          element={user ? <MainApp user={user} handleLogout={handleLogout} /> : <Navigate to="/" />} 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;