import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const ProductCard = ({ product, onAddToCart, userRole, purchaseVersion }) => {
  const [isPurchased, setIsPurchased] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isDealActive, setIsDealActive] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [maniaActive, setManiaActive] = useState(false);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // RESET CARD WHEN PURCHASE VERSION CHANGES (GLOBAL RESET)
  useEffect(() => {
    setIsPurchased(false);
    setQuantity(1); 
  }, [purchaseVersion, product?._id]);

  // AUTO-RESET CARD AFTER 3 SECONDS (LOCAL RESET UI)
  useEffect(() => {
    if (isPurchased) {
      const resetTimer = setTimeout(() => {
        setIsPurchased(false);
      }, 3000); 
      return () => clearTimeout(resetTimer);
    }
  }, [isPurchased]);

  // PRICE DROP ALERT LOGIC
  useEffect(() => {
    if (product?.currentPrice && product?.basePrice && product.currentPrice < product.basePrice * 0.8) {
      setShowPriceAlert(true);
    } else {
      setShowPriceAlert(false);
    }
  }, [product?.currentPrice, product?.basePrice]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      
      let isMania = false;
      if (product?.isOnMania && product?.maniaActivatedAt) {
        const maniaStart = new Date(product.maniaActivatedAt).getTime();
        const maniaEnd = maniaStart + (24 * 60 * 60 * 1000);
        const maniaDistance = maniaEnd - now;
        
        if (maniaDistance > 0) {
          isMania = true;
          setManiaActive(true);
          const h = Math.floor((maniaDistance / (1000 * 60 * 60)) % 24);
          const m = Math.floor((maniaDistance / 1000 / 60) % 60);
          const s = Math.floor((maniaDistance / 1000) % 60);
          setTimeLeft(`${h}h ${m}m ${s}s`);
        } else {
          setManiaActive(false);
        }
      }

      const end = product?.expiryDate ? new Date(product.expiryDate).getTime() : 0;
      const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
      const startTime = end ? end - tenDaysInMs : 0;
      const distance = end ? end - now : 0;

      const isNearExpiry = end > 0 && now >= startTime && distance > 0;
      const isLowStock = product?.stockLevel > 0 && product?.stockLevel < 5;
      const isFestiveActive = product?.isFestive && product?.festivalEndDate && new Date(product.festivalEndDate).getTime() > now;

      if (isMania || isNearExpiry || isLowStock || isFestiveActive) {
        setIsDealActive(true);
        if (!isMania) {
          if (distance > 0) {
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
          } else if (end > 0) {
            setTimeLeft("Expired");
          } else {
            setTimeLeft("Limited Time");
          }
        }
      } else {
        setIsDealActive(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [product?.expiryDate, product?.stockLevel, product?.isFestive, product?.festivalEndDate, product?.isOnMania, product?.maniaActivatedAt]);

  const getCategoryEmoji = () => {
    if (isPurchased) return '✅';
    if (maniaActive) return '🔥';
    switch (product?.category) {
      case 'Produce': return '🌾'; 
      case 'Vegetables': return '🥦';
      case 'Snacks': return '🥨';
      case 'Beverages': return '🧃';
      case 'Dairy': return '🧀';
      case 'Bakery': return '🍞';
      default: return '🛒';
    }
  };

  const currentPriceToDisplay = maniaActive && product?.maniaDiscount
    ? Math.round((product.currentPrice || 0) * (1 - product.maniaDiscount / 100)) 
    : (product?.currentPrice || 0);

  const discount = product?.basePrice 
    ? Math.round(((product.basePrice - currentPriceToDisplay) / product.basePrice) * 100) 
    : 0;

  const pointsMultiplier = product?.pointsMultiplier || 1;
  const pointsEarned = Math.floor((currentPriceToDisplay * quantity) / 50) * pointsMultiplier;

  const incrementQty = (e) => {
    e.stopPropagation();
    if (quantity < (product?.stockLevel || 0)) setQuantity(prev => prev + 1);
  };

  const decrementQty = (e) => {
    e.stopPropagation();
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handlePurchaseAction = (e) => {
    e.stopPropagation();
    setIsPurchased(true); 
    onAddToCart({ 
      ...product, 
      currentPrice: currentPriceToDisplay, 
      selectedQuantity: quantity 
    });
  };

  if (!product) return null;

  return (
    <div 
      className="product-card" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        position: 'relative', 
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isHovered && !maniaActive ? 'translateY(-6px)' : (maniaActive ? 'scale(1.02)' : 'scale(1)'),
        border: maniaActive ? '3px solid #ff4757' : (product.stockLevel < 5 && !isPurchased ? '2px solid #ff4757' : '1px solid rgba(255,255,255,0.6)'),
        boxShadow: isHovered && !maniaActive ? '0 12px 24px rgba(0,0,0,0.15)' : (maniaActive ? '0 10px 25px rgba(255, 71, 87, 0.4)' : (product.isFestive ? '0 4px 15px rgba(255, 165, 2, 0.2)' : '0 4px 15px rgba(0, 0, 0, 0.08)')),
        animation: maniaActive ? 'mania-border-glow 2s infinite' : 'none',
        zIndex: maniaActive ? 5 : 1,
        opacity: product.stockLevel <= 0 ? 0.7 : 1,
        background: 'rgba(240, 249, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        gap: '6px', 
        width: '100%',     
        height: '100%',    
        cursor: 'pointer'
    }}>
      <style>
        {`
          @keyframes pulse-red {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
          }
          @keyframes mania-border-glow {
            0% { border-color: #ff4757; box-shadow: 0 10px 25px rgba(255, 71, 87, 0.4); }
            50% { border-color: #ffa502; box-shadow: 0 10px 30px rgba(255, 165, 2, 0.5); }
            100% { border-color: #ff4757; box-shadow: 0 10px 25px rgba(255, 71, 87, 0.4); }
          }
          @keyframes float-emoji {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>

      {/* FEATURE: WISHLIST TOGGLE */}
      <div 
        onClick={(e) => { e.stopPropagation(); setIsWishlisted(!isWishlisted); }}
        style={{
          position: 'absolute', bottom: '105px', right: '15px', zIndex: 12, cursor: 'pointer',
          fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
          transition: 'transform 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
      >
        {isWishlisted ? '❤️' : '🤍'}
      </div>

      {!isPurchased && maniaActive && (
        <div style={{ ...styles.maniaBadge, animation: 'pulse-red 1s infinite' }}>🔥 DAILY MANIA</div>
      )}

      {!isPurchased && !maniaActive && product.stockLevel > 0 && product.stockLevel < 5 && (
        <div style={{ ...styles.hurryBadge, animation: 'pulse-red 1.5s infinite' }}>🚨 HURRY UP!</div>
      )}

      {!isPurchased && !maniaActive && product.isFestive && (
        <div style={styles.festiveBadge}>🎉 FESTIVE OFFER</div>
      )}

      {/* 🚨 FIXED: Moved BIG DROP badge below discount badge so it doesn't overlap the buy button 🚨 */}
      {showPriceAlert && !maniaActive && (
        <div style={styles.priceDropBadge}>📉 BIG DROP</div>
      )}

      {!isPurchased && isDealActive && discount > 0 && (
        <div className="offer-badge" style={{ 
            background: maniaActive ? 'linear-gradient(45deg, #ff4757, #ffa502)' : '#ff4757',
            fontWeight: '900', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', position: 'absolute', top: '10px', left: '10px', zIndex: 10
        }}>
            {discount}% OFF
        </div>
      )}
      
      {/* 🚨 TOP CONTAINER: Takes all empty space (flexGrow: 1) to push the bottom elements down evenly 🚨 */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        
        {/* Fixed height image container so images don't shift layout */}
        <div style={{ 
          height: '100px', 
          width: '100%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '5px 0',
          flexShrink: 0,
          animation: maniaActive ? 'float-emoji 2s infinite ease-in-out' : 'none'
        }}>
          {product.image && product.image !== 'default-grocery.png' ? (
            <img 
              src={`${API_BASE_URL}/uploads/${product.image}`} 
              alt={product.name}
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.onerror = null; e.target.src = ""; }}
            />
          ) : (
            <div style={{ fontSize: '50px' }}>{getCategoryEmoji()}</div>
          )}
        </div>

        {/* 🚨 TITLE WRAPPER: Has flexGrow: 1 to absorb uneven heights across cards 🚨 */}
        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <h3 style={{ color: '#2d3436', margin: '2px 0', fontSize: '1.1rem', fontWeight: '900', lineHeight: '1.2', textAlign: 'center' }}>
            {product.name}
          </h3>
        </div>

        {/* --- STOCK & TIMER AREA: Fixed minHeight so layout doesn't collapse if missing --- */}
        <div style={{ minHeight: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: '4px' }}>
          {product.stockLevel > 0 && product.stockLevel < 5 && (
            <div style={{ color: '#ff4757', fontWeight: '900', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>⏳</span> ONLY {product.stockLevel} LEFT
            </div>
          )}

          {isPurchased ? (
            <p style={{color: '#2ed573', fontSize: '0.9rem', margin: '0', fontWeight: 'bold'}}>Successfully Added!</p>
          ) : (
            <>
              {userRole === 'admin' && (
                <p style={{color: '#57606f', fontSize: '0.75rem', margin: '0'}}>
                  Exp: {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : 'N/A'} | Stock: {product.stockLevel}
                </p>
              )}
              
              {isDealActive && (
                <div style={{ 
                  background: maniaActive ? '#fff5f5' : (product.stockLevel < 5 ? '#fff2f2' : (product.isFestive ? '#fff9e6' : '#f1f2f6')), 
                  padding: '4px 8px', borderRadius: '6px', marginTop: '2px', width: '100%',
                  border: maniaActive ? '1px dashed #ff4757' : (product.stockLevel < 5 ? '1px solid #ff4757' : 'none')
                }}>
                  <p style={{ color: maniaActive || product.stockLevel < 5 ? '#ff4757' : '#e67e22', fontSize: '0.8rem', margin: 0, fontWeight: '900', textAlign: 'center' }}>
                    {maniaActive ? '⚡ MANIA ENDS: ' : (product.isFestive ? '✨ Sale ends: ' : '⏱ Ends in: ')}{timeLeft}
                  </p>
                </div>
              )}
              {product.stockLevel <= 0 && <p style={{color: '#ff4757', fontWeight: 'bold', margin: '4px 0 0 0'}}>Out of Stock</p>}
            </>
          )}
        </div>
      </div>

      {/* 🚨 BOTTOM CONTAINER: Sits uniformly at the absolute bottom of every card 🚨 */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        
        <div style={{margin: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
          <span style={{fontSize: '22px', fontWeight: '900', color: isPurchased ? '#888' : '#ff4757'}}>
            ₹{currentPriceToDisplay}
          </span>
          {!isPurchased && (discount > 0 || currentPriceToDisplay < product.basePrice) && (
            <span style={{textDecoration: 'line-through', color: '#ffa502', fontSize: '1rem', opacity: 0.8}}>
              ₹{product.basePrice}
            </span>
          )}
        </div>

        {!isPurchased && product.stockLevel > 0 && (
          <div style={styles.qtyContainer}>
            <button onClick={decrementQty} style={styles.qtyBtn}>-</button>
            <span style={styles.qtyText}>{quantity}</span>
            <button onClick={incrementQty} style={styles.qtyBtn}>+</button>
          </div>
        )}
        
        {!isPurchased ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            
            {/* 🚨 POINTS AREA: Fixed minHeight so buttons don't bounce up and down! 🚨 */}
            <div style={{ minHeight: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {pointsEarned > 0 ? (
                <div style={{ textAlign: 'center', color: '#f39c12', fontSize: '0.75rem', fontWeight: '900', margin: '0' }}>
                  ✨ Earn {pointsEarned} Points
                </div>
              ) : product.eligibleForPointsRedemption === false ? (
                <div style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '0.7rem', fontWeight: 'bold', margin: '0' }}>
                  🚫 Not eligible for point redemption
                </div>
              ) : null}
            </div>

            <button 
              onClick={handlePurchaseAction} 
              style={maniaActive ? {...styles.cartBtn, background: 'linear-gradient(45deg, #ff4757, #ff6b81)', boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)'} : styles.cartBtn} 
              disabled={product.stockLevel <= 0}
            >
              {product.stockLevel > 0 ? (maniaActive ? `🔥 GRAB ${quantity} NOW` : `ADD ${quantity} TO CART`) : 'OUT OF STOCK'}
            </button>
            <button 
              onClick={handlePurchaseAction} 
              style={maniaActive ? {...styles.buyBtn, borderColor: '#ff4757', color: '#ff4757'} : styles.buyBtn} 
              disabled={product.stockLevel <= 0}
            >
              BUY NOW
            </button>
          </div>
        ) : (
          <button disabled style={styles.purchasedBtn}>Item Added ✅</button>
        )}
      </div>
    </div>
  );
};

/* 🚨 SLIMMED DOWN STYLES TO SAVE SPACE 🚨 */
const styles = {
  cartBtn: { width: '100%', padding: '8px', background: '#2f3542', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontSize: '0.9rem' },
  buyBtn: { width: '100%', padding: '6px', background: 'transparent', color: '#2f3542', borderRadius: '8px', border: '2px solid #2f3542', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' },
  purchasedBtn: { width: '100%', padding: '10px', background: '#e0e0e0', color: '#2ed573', borderRadius: '8px', border: 'none', cursor: 'not-allowed', fontWeight: 'bold' },
  maniaBadge: { position: 'absolute', top: '5px', right: '5px', background: '#ff4757', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', zIndex: 10, boxShadow: '0 4px 10px rgba(255, 71, 87, 0.5)', border: '2px solid white' },
  hurryBadge: { position: 'absolute', top: '10px', right: '10px', background: '#ff4757', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '900', zIndex: 10, boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)', letterSpacing: '0.5px' },
  festiveBadge: { position: 'absolute', top: '10px', left: '40px', background: '#ffa502', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', zIndex: 9 },
  // 🚨 FIXED: Changed BIG DROP from bottom:10px to top:38px 🚨
  priceDropBadge: { position: 'absolute', top: '38px', left: '10px', background: '#2ed573', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', zIndex: 10 },
  qtyContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px', padding: '2px', background: '#f8f9fa', borderRadius: '8px' },
  qtyBtn: { width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ced4da', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' },
  qtyText: { fontSize: '1.1rem', fontWeight: '900', minWidth: '20px', color: '#000000', textAlign: 'center' }
};

export default ProductCard;