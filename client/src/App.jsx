import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf'; 
import ProductCard from './components/ProductCard';
import Sidebar from './components/Sidebar';
import AdminDashboard from './components/AdminDashboard';
import Auth from './components/Auth';
import Landing from './components/Landing'; 
import Settings from './components/Settings'; 
import './App.css';

// --- CATEGORY ICON MAPPING ---
const CATEGORY_ICONS = {
  "Beverages": "🧃",
  "Snacks": "🥨",
  "Produce": "🌾", 
  "Vegetables": "🥦",
  "Dairy": "🧀",
  "Bakery": "🍞",
  "All": "🏪"
};

// --- CONFIGURATION FOR UPSELLING AI ---
const COMPLEMENTARY_MAP = {
  "Dairy": "Bakery",     
  "Bakery": "Dairy",     
  "Vegetables": "Produce",  
  "Produce": "Vegetables", 
  "Snacks": "Beverages", 
  "Beverages": "Snacks"  
};

// --- FESTIVE DECORATION COMPONENT ---
const FestiveDecorations = () => (
  <div className="festive-overlay">
    <div className="lantern lantern-left">🏮</div>
    <div className="lantern lantern-right">🏮</div>
    <div className="sparkle-layer"></div>
  </div>
);

// --- RECEIPT GENERATOR UTILITY ---
const generateReceipt = (cartItems, total, totalSavings, isFestive, pointsEarned = 0, pointsRedeemed = 0) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 160] 
  });

  const date = new Date().toLocaleString();
  const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(isFestive ? "✨ FESTIVE MART" : "FRESH MART", 40, 10, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Near Tech Park, Kochi, Kerala", 40, 15, { align: 'center' });
  doc.text(`Order ID: ${orderId}`, 5, 25);
  doc.text(`Date: ${date}`, 5, 30);
  doc.line(5, 32, 75, 32); 

  doc.setFont(undefined, 'bold');
  doc.text("Item", 5, 37);
  doc.text("Qty", 40, 37);
  doc.text("Price", 75, 37, { align: 'right' });
  doc.line(5, 39, 75, 39);
  doc.setFont(undefined, 'normal');

  let y = 45;
  cartItems.forEach((item) => {
    const displayName = item.name.length > 18 ? item.name.substring(0, 15) + "..." : item.name;
    doc.text(displayName, 5, y);
    doc.text(item.selectedQuantity.toString(), 40, y);
    doc.text(`Rs.${(item.currentPrice * item.selectedQuantity).toFixed(2)}`, 75, y, { align: 'right' });
    y += 6;
  });

  doc.line(5, y + 2, 75, y + 2);
  
  if (totalSavings > 0) {
    doc.setFontSize(9);
    doc.setTextColor(0, 128, 0); 
    doc.setFont(undefined, 'bold');
    doc.text(`YOU SAVED: Rs.${totalSavings.toFixed(2)}`, 40, y + 8, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Bulk Discount (5%)", 5, y + 13);
    doc.text(`-Rs.${totalSavings.toFixed(2)}`, 75, y + 13, { align: 'right' });
    y += 12;
  }

  // Loyalty Point Deduction on Receipt
  if (pointsRedeemed > 0) {
    doc.setFontSize(8);
    doc.text("Points Redemption", 5, y + 7);
    doc.text(`-Rs.${pointsRedeemed.toFixed(2)}`, 75, y + 7, { align: 'right' });
    y += 6;
  }

  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text("TOTAL AMOUNT:", 5, y + 8);
  doc.text(`Rs.${total.toFixed(2)}`, 75, y + 8, { align: 'right' });

  // Earned Points Notice
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  doc.text(`Points earned this order: ${pointsEarned}`, 40, y + 14, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont(undefined, 'italic');
  doc.text(isFestive ? "✨ Happy Festivities! ✨" : "Thank you for shopping!", 40, y + 20, { align: 'center' });
  doc.text("Visit again!", 40, y + 24, { align: 'center' });

  doc.save(`Receipt_${orderId}.pdf`);
};

function MainApp({ user, handleLogout }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]); 
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]); 
  const [purchaseVersion, setPurchaseVersion] = useState(0); 
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isAiLoading, setIsAiLoading] = useState(false); 
  const [activeTab, setActiveTab] = useState('shop');
  const [isFestiveMode, setIsFestiveMode] = useState(false);
  const [adminFestiveMode, setAdminFestiveMode] = useState('none'); 

  // --- NEW STATES FOR FEATURES ---
  const [searchQuery, setSearchQuery] = useState(""); 
  const [loyaltyPoints, setLoyaltyPoints] = useState(0); 
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState(null); 
  const [showConfirmModal, setShowConfirmModal] = useState(false); // New State for Custom Modal
  
  // --- SLIDER REF ---
  const sliderRef = useRef(null);

  const loadData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data);
      
      // PERSISTENCE FIX: Fetch actual points from the User DB model via the new route
      if (user && user.role === 'customer' && user._id) {
          const userRes = await axios.get(`http://localhost:5000/api/users/${user._id}`);
          setLoyaltyPoints(userRes.data.loyaltyPoints || 0);
      }
    } catch (err) {
      console.error("Critical Sync Error:", err);
      toast.error("Failed to sync with server.");
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
    let result = filteredProducts;
    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (isFestiveMode) {
      const now = new Date();
      return result.filter(p => {
        const isDateActive = p.festivalEndDate && now <= new Date(p.festivalEndDate);
        return p.isFestive || isDateActive;
      });
    }
    return result;
  }, [filteredProducts, isFestiveMode, searchQuery]);

  const cartSuggestions = useMemo(() => {
    if (cart.length === 0) return [];
    const cartCategories = [...new Set(cart.map(item => item.category))];
    const targetCats = cartCategories
      .map(cat => COMPLEMENTARY_MAP[cat])
      .filter(cat => cat && !cartCategories.includes(cat));

    return products
      .filter(p => targetCats.includes(p.category) && p.stockLevel > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 2);
  }, [cart, products]);

  const handleRemoveFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter(item => item._id !== productId));
    toast.dismiss(); // Clear any existing toasts first
    toast.success("Item removed from cart");
  };

  const handleAddToCart = (productWithQty) => {
    if (productWithQty.stockLevel <= 0) {
      toast.error("Item is out of stock!");
      return;
    }

    const existingItem = cart.find(item => item._id === productWithQty._id);
    
    if (existingItem) {
      const totalNewQty = existingItem.selectedQuantity + productWithQty.selectedQuantity;
      if (totalNewQty > productWithQty.stockLevel) {
        toast.error(`Stock limit reached! Max available: ${productWithQty.stockLevel}`);
        return;
      }
      setCart(prev => prev.map(item => 
        item._id === productWithQty._id ? { ...item, selectedQuantity: totalNewQty } : item
      ));
      toast.dismiss(); 
      toast.success(`Updated "${productWithQty.name}" quantity to ${totalNewQty}`);
    } else {
      setCart(prev => [...prev, productWithQty]);
      toast.dismiss(); 
      toast.success(`Added ${productWithQty.selectedQuantity}x "${productWithQty.name}" to cart!`);
    }
  };

  // --- UPDATED MATH LOGIC FOR POINTS CAPPING ---
  const { subtotal, totalAmount, totalSavings, totalQty, pointsToRedeemValue, maxUsablePoints } = useMemo(() => {
    const stats = cart.reduce((acc, item) => {
      acc.subtotal += item.currentPrice * item.selectedQuantity;
      acc.totalQty += item.selectedQuantity;
      return acc;
    }, { subtotal: 0, totalQty: 0 });

    const isEligible = stats.totalQty >= 5;
    const savings = isEligible ? (stats.subtotal * 0.05) : 0;
    
    // CRITICAL FIX: Ensure maxUsablePoints never exceeds the subtotal minus savings
    const maxUsable = Math.min(loyaltyPoints, Math.max(0, stats.subtotal - savings));
    const pointsValue = redeemPoints ? maxUsable : 0;
    const finalTotal = Math.max(0, stats.subtotal - savings - pointsValue);

    return { 
      subtotal: stats.subtotal, 
      totalAmount: finalTotal, 
      totalSavings: savings, 
      totalQty: stats.totalQty,
      pointsToRedeemValue: pointsValue,
      maxUsablePoints: maxUsable // Exported to display safely in the cart popup
    };
  }, [cart, redeemPoints, loyaltyPoints]);

  // Handle Opening the Custom Confirmation Modal
  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setShowConfirmModal(true);
  };

  // Handle the Actual Purchase Logic
  const executePurchase = async () => {
    setShowConfirmModal(false); // Close modal first
    const toastId = toast.loading("Processing transaction...");
    
    try {
      const purchaseData = cart.map(item => ({
        _id: item._id,
        selectedQuantity: item.selectedQuantity 
      }));

      const earnedPoints = Math.floor(totalAmount / 50);

      const response = await axios.post('http://localhost:5000/api/purchase', { 
        userId: user._id,
        cartItems: purchaseData,
        pointsEarned: earnedPoints,
        pointsRedeemed: pointsToRedeemValue
      });

      if (response.data.success) {
        generateReceipt(cart, totalAmount, totalSavings, isFestiveMode, earnedPoints, pointsToRedeemValue);
        
        setRedeemPoints(false);
        setActiveDelivery({ id: Math.floor(Math.random() * 9000) + 1000, status: 'Packing' });
        
        await loadData(); 
        
        setCart([]); 
        setIsCartOpen(false); 
        setPurchaseVersion(prev => prev + 1); 
        
        // Updated text to 'Processing Order'
        setTimeout(() => setActiveDelivery(prev => prev ? {...prev, status: 'Processing Order'} : null), 5000);
        setTimeout(() => setActiveDelivery(null), 12000);

        toast.success(`Purchase Successful!`, { id: toastId });
      }
    } catch (err) {
      console.error("Purchase Error:", err);
      toast.error(err.response?.data?.message || "Transaction failed.", { id: toastId });
    }
  };

  // --- UPDATED LOGIC: Bringing Mania items to Trending section ---
  const limitedOffers = products.filter(p => {
    const now = new Date();
    const isFestiveActive = p.isFestive || (p.festivalEndDate && now <= new Date(p.festivalEndDate));
    if (isFestiveMode) return isFestiveActive || p.isOnMania; // Show mania items in festive mode too
    
    const end = new Date(p.expiryDate).getTime();
    const distance = end - now.getTime();
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    const isNearExpiry = distance > 0 && distance <= tenDaysInMs;
    const isLowStock = p.stockLevel > 0 && p.stockLevel < 5;
    
    // Add p.isOnMania so it passes the filter
    return isFestiveActive || isNearExpiry || isLowStock || p.isOnMania;
  }).sort((a, b) => {
    // Push Mania products to the front!
    if (a.isOnMania && !b.isOnMania) return -1;
    if (!a.isOnMania && b.isOnMania) return 1;
    return 0; // Keep normal sorting for the rest
  });

  if (activeTab === 'settings') {
    return <Settings user={user} onBack={() => setActiveTab('shop')} />;
  }

  return (
    <div className={`main-container ${isFestiveMode ? 'festive-active' : ''} theme-${adminFestiveMode}`}>
      {isFestiveMode && <FestiveDecorations />}
      <Toaster position="top-right" />

      {activeDelivery && (
        <div className="delivery-tracker-widget" style={{
          position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#111',
          border: '2px solid #00FF88', padding: '15px', borderRadius: '12px', zIndex: 1000,
          boxShadow: '0 0 15px rgba(0,255,136,0.3)', minWidth: '200px'
        }}>
          <h4 style={{ color: '#00FF88', margin: '0 0 5px 0' }}>🚚 Order Tracker</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccc' }}>ID: #{activeDelivery.id}</p>
          <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>{activeDelivery.status}</p>
          <div style={{ width: '100%', height: '4px', background: '#333', marginTop: '10px' }}>
            <div style={{ 
              // Updated to match 'Processing Order'
              width: activeDelivery.status === 'Processing Order' ? '75%' : (activeDelivery.status === 'Packing' ? '40%' : '100%'), 
              height: '100%', background: '#00FF88', transition: 'width 1s ease' 
            }}></div>
          </div>
        </div>
      )}

      <nav className="navbar">
        <h1 className={isFestiveMode ? 'festive-title' : ''}>
          {isFestiveMode ? '✨ FestiveMart' : '🛒 FreshMart'} {user.role === 'admin' ? '📊 Admin' : ''}
        </h1>

        {user.role === 'customer' && (
          <div className="search-container" style={{ flex: '0 1 400px', margin: '0 20px' }}>
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="live-search-input"
              style={{
                width: '100%', padding: '10px 15px', borderRadius: '25px',
                border: '1px solid #444', backgroundColor: '#1a1a1a', color: '#fff'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {user.role === 'customer' && (
            <div className="loyalty-badge" style={{
              backgroundColor: 'rgba(255, 215, 0, 0.1)', border: '1px solid #FFD700',
              padding: '5px 12px', borderRadius: '20px', color: '#FFD700', fontWeight: 'bold'
            }}>
              {/* FIXED: Prevents UI from showing negative points or messy decimals */}
              🪙 {Math.max(0, Math.floor(loyaltyPoints))} Pts
            </div>
          )}

          {user.role === 'customer' && (
             <button 
               className={`festive-toggle-btn ${isFestiveMode ? 'active' : ''}`}
               onClick={() => setIsFestiveMode(!isFestiveMode)}
             >
               {isFestiveMode ? '🕶️ Standard' : '🎈 Festive Mode'}
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
              {isCartOpen && (
                <div className={`cart-overlay-modal ${isFestiveMode ? 'festive-cart' : ''}`}>
                  <div className="cart-header">
                    <h3>{isFestiveMode ? '🎁 My Festive Bag' : '📝 My Shopping List'}</h3>
                    <button className="close-cart" onClick={() => setIsCartOpen(false)}>✕</button>
                  </div>
                  <div className="cart-items-scroll">
                    {cart.map((item, index) => (
                      <div key={item._id || index} className="cart-item-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span 
                            className="remove-item-btn" 
                            onClick={() => handleRemoveFromCart(item._id)}
                            style={{ color: '#ff4d4d', cursor: 'pointer', padding: '0 5px', fontWeight: 'bold' }}
                          >✕</span>
                          <div>
                            <span className="cart-item-name">
                              {CATEGORY_ICONS[item.category] || "📦"} {item.name}
                            </span>
                            <span className="cart-item-qty">x{item.selectedQuantity}</span>
                          </div>
                        </div>
                        <b className="cart-item-price">₹{(item.currentPrice * item.selectedQuantity).toFixed(2)}</b>
                      </div>
                    ))}
                  </div>

                  {loyaltyPoints > 0 && (
                    <div className="loyalty-redeem-panel" style={{
                      margin: '15px 0', padding: '12px', borderRadius: '8px',
                      backgroundColor: 'rgba(255, 215, 0, 0.05)', border: '1px dashed #FFD700'
                    }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {/* FIXED: Dynamically tells the user exactly how many points they can use, and shows remaining balance! */}
                          <span style={{ fontSize: '0.9rem' }}>
                            🪙 Use {Math.floor(maxUsablePoints)} points for ₹{maxUsablePoints.toFixed(2)} off?
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>
                               Remaining Balance: {Math.max(0, Math.floor(loyaltyPoints - (redeemPoints ? maxUsablePoints : 0)))} Pts
                            </div>
                          </span>
                          <button 
                            onClick={() => setRedeemPoints(!redeemPoints)}
                            style={{
                              backgroundColor: redeemPoints ? '#00FF88' : '#333',
                              color: redeemPoints ? '#000' : '#fff', border: 'none',
                              padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'
                            }}
                          >
                            {redeemPoints ? 'Applied' : 'Apply'}
                          </button>
                       </div>
                    </div>
                  )}

                  {cartSuggestions.length > 0 && (
                    <div className="cart-suggestions" style={{
                      marginTop: '20px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px', borderLeft: '4px solid #FFD700', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}>
                      <p className="suggestion-title" style={{ 
                        color: '#FFD700', fontWeight: '900', fontSize: '1rem', marginBottom: '12px',
                        display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>💡</span> Frequently Bought Together:
                      </p>
                      <div className="suggestion-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {cartSuggestions.map(s => (
                          <div key={s._id} className="suggestion-item" style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px'
                          }}>
                            <div className="suggestion-info">
                              <span style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                {CATEGORY_ICONS[s.category] || "📦"} {s.name}
                              </span>
                              <div style={{ color: '#00e676', fontWeight: '800', fontSize: '0.85rem' }}>₹{s.currentPrice.toFixed(2)}</div>
                            </div>
                            <button 
                              className="add-suggested-btn" 
                              onClick={() => handleAddToCart({ ...s, selectedQuantity: 1 })}
                              style={{
                                backgroundColor: '#FFD700', color: '#000', border: 'none',
                                padding: '5px 12px', borderRadius: '20px', fontWeight: '900', cursor: 'pointer'
                              }}
                            >+ ADD</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="cart-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#FFFFFF', marginBottom: '8px', opacity: '0.9' }}>
                      <span>Subtotal ({totalQty} items):</span>
                      <span style={{ fontWeight: 'bold' }}>₹{subtotal.toFixed(2)}</span>
                    </div>

                    {totalSavings > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00FF88', marginBottom: '8px' }}>
                         <span>✨ Bulk Savings:</span>
                         <span style={{ fontWeight: 'bold' }}>- ₹{totalSavings.toFixed(2)}</span>
                      </div>
                    )}

                    {redeemPoints && pointsToRedeemValue > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFD700', marginBottom: '8px' }}>
                         <span>🪙 Loyalty Discount:</span>
                         <span style={{ fontWeight: 'bold' }}>- ₹{pointsToRedeemValue.toFixed(2)}</span>
                      </div>
                    )}

                    {!redeemPoints && totalQty < 5 && (
                      <div style={{ 
                        fontSize: '1rem', color: '#FFFFFF', margin: '10px 0', textAlign: 'center',
                        backgroundColor: '#D32F2F', padding: '10px', borderRadius: '6px', fontWeight: 'bold'
                      }}>
                        🚀 Add <span style={{ color: '#FFEB3B' }}>{5 - totalQty} more items</span> for 5% OFF!
                      </div>
                    )}

                    <div className="total-display" style={{ 
                      display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', 
                      fontWeight: '900', color: '#00FF88', paddingTop: '15px', borderTop: '2px solid #444',
                      textShadow: '0 0 15px rgba(0, 255, 136, 0.6)' 
                    }}>
                      <span>Total:</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>

                    <button onClick={handleCheckoutClick} className="buy-all-btn" style={{
                      backgroundColor: '#00FF88', color: '#000000', fontWeight: '900', fontSize: '1.1rem',
                      width: '100%', padding: '14px', borderRadius: '8px', marginTop: '15px', border: 'none', cursor: 'pointer'
                    }}>
                      {isFestiveMode ? '✨ BUY NOW' : 'BUY NOW'}
                    </button>
                  </div>
                </div>
              )}

              {category === "All" && limitedOffers.length > 0 && (
                <div className="trending-section" style={{ position: 'relative' }}>
                  <div className={isFestiveMode ? 'festive-hero-banner' : 'festive-banner'}>
                      {isFestiveMode && <h2 className="festive-glow-text">✨ Exclusive Season Offers! ✨</h2>}
                  </div>
                  <h2 className="section-title">
                    {isFestiveMode ? '🎊 Top Festive Picks' : '🔥 Trending & Offers'}
                  </h2>
                  
                  {/* --- NEW WRAPPER WITH SLIDER CONTROLS --- */}
                  <div className="slider-container-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    
                    {/* Left Scroll Button */}
                    <button 
                      onClick={() => { if(sliderRef.current) sliderRef.current.scrollBy({left: -300, behavior: 'smooth'}) }} 
                      className="slider-btn left" 
                      style={{ 
                        position: 'absolute', left: '-15px', zIndex: 10, background: '#333', color: 'white', 
                        border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', 
                        boxShadow: '0 2px 5px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' 
                      }}>
                      ◀
                    </button>

                    <div 
                      className="trending-scroll" 
                      ref={sliderRef} 
                      style={{ 
                        display: 'flex', overflowX: 'auto', scrollBehavior: 'smooth', 
                        scrollbarWidth: 'none', gap: '15px', padding: '10px 0', width: '100%' 
                      }}>
                      {limitedOffers.map(p => (
                        <div style={{ flex: '0 0 auto' }} key={`wrapper-${p._id}-${purchaseVersion}`}>
                          <ProductCard 
                            key={`${p._id}-${purchaseVersion}-trending`} 
                            product={p} 
                            onAddToCart={handleAddToCart}
                            userRole={user.role}
                            isFestiveMode={isFestiveMode}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Right Scroll Button */}
                    <button 
                      onClick={() => { if(sliderRef.current) sliderRef.current.scrollBy({left: 300, behavior: 'smooth'}) }} 
                      className="slider-btn right" 
                      style={{ 
                        position: 'absolute', right: '-15px', zIndex: 10, background: '#333', color: 'white', 
                        border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', 
                        boxShadow: '0 2px 5px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
                      }}>
                      ▶
                    </button>
                  </div>
                  <hr className="divider" />
                </div>
              )}   

              <h2 className="section-title">
                {CATEGORY_ICONS[category] || "📦"} {category} Products
              </h2>
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

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '30px',
            borderRadius: '16px',
            border: '2px solid #333',
            boxShadow: '0 10px 40px rgba(0, 255, 136, 0.15)',
            textAlign: 'center',
            maxWidth: '350px',
            width: '90%'
          }}>
            <div style={{ fontSize: '45px', marginBottom: '15px' }}>🛒</div>
            
            <h3 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '22px' }}>
              Confirm Purchase
            </h3>
            
            <p style={{ color: '#a0a0a0', marginBottom: '25px', fontSize: '15px', lineHeight: '1.5' }}>
              Are you sure you want to proceed and buy <strong style={{ color: '#00FF88' }}>{totalQty} items</strong>?
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#333333',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  flex: 1,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#444'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#333'}
              >
                Cancel
              </button>
              
              <button
                onClick={executePurchase}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#00FF88', 
                  color: '#000000',
                  cursor: 'pointer',
                  fontWeight: '900',
                  flex: 1,
                  boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
                  transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              >
                Yes, Buy!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const SESSION_DURATION = 60 * 60 * 1000;
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