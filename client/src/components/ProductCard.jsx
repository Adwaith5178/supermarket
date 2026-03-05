import React, { useState, useEffect } from 'react';

const ProductCard = ({ product, onAddToCart, userRole }) => {
  const [isPurchased, setIsPurchased] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isDealActive, setIsDealActive] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [maniaActive, setManiaActive] = useState(false); 

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      
      let isMania = false;
      if (product.isOnMania && product.maniaActivatedAt) {
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

      const end = new Date(product.expiryDate).getTime();
      const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
      const startTime = end - tenDaysInMs;
      const distance = end - now;

      const isNearExpiry = now >= startTime && distance > 0;
      const isLowStock = product.stockLevel > 0 && product.stockLevel < 5;
      const isFestiveActive = product.isFestive && new Date(product.festivalEndDate) > new Date();

      if (isMania || isNearExpiry || isLowStock || isFestiveActive) {
        setIsDealActive(true);
        if (!isMania) {
          if (distance > 0) {
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
          } else {
            setTimeLeft("Expired");
          }
        }
      } else {
        setIsDealActive(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [product.expiryDate, product.stockLevel, product.isFestive, product.festivalEndDate, product.isOnMania, product.maniaActivatedAt]);

  const currentPriceToDisplay = maniaActive 
    ? Math.round(product.currentPrice * (1 - product.maniaDiscount / 100)) 
    : product.currentPrice;

  const discount = Math.round(((product.basePrice - currentPriceToDisplay) / product.basePrice) * 100);

  const incrementQty = (e) => {
    e.stopPropagation();
    if (quantity < product.stockLevel) setQuantity(prev => prev + 1);
  };

  const decrementQty = (e) => {
    e.stopPropagation();
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleBuyNow = (e) => {
    e.stopPropagation();
    setIsPurchased(true);
    onAddToCart({ ...product, currentPrice: currentPriceToDisplay, selectedQuantity: quantity }); 
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    onAddToCart({ ...product, currentPrice: currentPriceToDisplay, selectedQuantity: quantity });
  };

  return (
    <div className="product-card" style={{ 
      position: 'relative', 
      transition: 'all 0.3s ease',
      transform: maniaActive ? 'scale(1.02)' : 'scale(1)',
      border: maniaActive ? '3px solid #ff4757' : (product.stockLevel < 5 && !isPurchased ? '2px solid #ff4757' : '1px solid #eee'),
      boxShadow: maniaActive ? '0 10px 25px rgba(255, 71, 87, 0.4)' : (product.isFestive ? '0 4px 15px rgba(255, 165, 2, 0.2)' : 'none'),
      animation: maniaActive ? 'mania-border-glow 2s infinite' : 'none',
      zIndex: maniaActive ? 5 : 1
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

      {/* Mania Badge (Highest Priority) */}
      {!isPurchased && maniaActive && (
        <div style={{ ...styles.maniaBadge, animation: 'pulse-red 1s infinite' }}>
          🔥 DAILY MANIA
        </div>
      )}

      {/* Hurry Badge (Priority 2) */}
      {!isPurchased && !maniaActive && product.stockLevel > 0 && product.stockLevel < 5 && (
        <div style={{ ...styles.hurryBadge, animation: 'pulse-red 1.5s infinite' }}>
          🚨 HURRY UP!
        </div>
      )}

      {/* Festival Badge (Priority 3) */}
      {!isPurchased && !maniaActive && product.isFestive && (
        <div style={styles.festiveBadge}>
          🎉 FESTIVE OFFER
        </div>
      )}

      {!isPurchased && isDealActive && discount > 0 && (
        <div className="offer-badge" style={{ 
            background: maniaActive ? 'linear-gradient(45deg, #ff4757, #ffa502)' : '#ff4757',
            fontWeight: '900'
        }}>
            {discount}% OFF
        </div>
      )}
      
      <div style={{fontSize: '60px', marginBottom: '10px', animation: maniaActive ? 'float-emoji 2s infinite ease-in-out' : 'none'}}>
        {isPurchased ? '✅' : maniaActive ? '🎁' : (product.isFestive ? '🎁' : '🛒')}
      </div>

      <h3 style={{ color: '#2d3436', margin: '10px 0 5px 0', fontSize: '1.25rem', fontWeight: '900' }}>
        {product.name}
      </h3>

      <div style={{ minHeight: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {isPurchased ? (
          <p style={{color: '#2ed573', fontSize: '0.9rem', margin: '0', fontWeight: 'bold'}}>
            Successfully Purchased
          </p>
        ) : (
          <>
            {userRole === 'admin' && (
              <p style={{color: '#57606f', fontSize: '0.75rem', margin: '0'}}>
                Exp: {new Date(product.expiryDate).toLocaleDateString()} | Stock: {product.stockLevel}
              </p>
            )}
            
            {isDealActive && (
              <div style={{ 
                background: maniaActive ? '#fff5f5' : (product.stockLevel < 5 ? '#fff2f2' : (product.isFestive ? '#fff9e6' : '#f1f2f6')), 
                padding: '8px 10px', 
                borderRadius: '8px', 
                marginTop: '6px',
                border: maniaActive ? '2px dashed #ff4757' : (product.stockLevel < 5 ? '1px solid #ff4757' : 'none')
              }}>
                <p style={{ color: maniaActive || product.stockLevel < 5 ? '#ff4757' : '#e67e22', fontSize: '0.85rem', margin: 0, fontWeight: '900' }}>
                  {maniaActive ? '⚡ MANIA ENDS IN: ' : (product.isFestive ? '✨ Sale ends in: ' : '⏱ Ends in: ')}{timeLeft}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      
      <div style={{margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
        <span style={{fontSize: '28px', fontWeight: '900', color: isPurchased ? '#888' : '#ff4757'}}>
          ₹{currentPriceToDisplay}
        </span>
        
        {!isPurchased && (discount > 0 || currentPriceToDisplay < product.basePrice) && (
          <span style={{textDecoration: 'line-through', color: '#ffa502', fontSize: '1.2rem', opacity: 0.8}}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={handleAddToCart} 
            style={maniaActive ? {...styles.cartBtn, background: 'linear-gradient(45deg, #ff4757, #ff6b81)', boxShadow: '0 4px 15px rgba(255, 71, 87, 0.4)'} : styles.cartBtn} 
            disabled={product.stockLevel <= 0}
          >
            {product.stockLevel > 0 ? (maniaActive ? `🔥 GRAB ${quantity} NOW` : `ADD ${quantity} TO CART`) : 'OUT OF STOCK'}
          </button>
          <button 
            onClick={handleBuyNow} 
            style={maniaActive ? {...styles.buyBtn, borderColor: '#ff4757', color: '#ff4757'} : styles.buyBtn} 
            disabled={product.stockLevel <= 0}
          >
            BUY NOW
          </button>
        </div>
      ) : (
        <button disabled style={styles.purchasedBtn}>Item Purchased</button>
      )}
    </div>
  );
};

const styles = {
  cartBtn: { width: '100%', padding: '12px', background: '#2f3542', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' },
  buyBtn: { width: '100%', padding: '10px', background: 'transparent', color: '#2f3542', borderRadius: '12px', border: '2px solid #2f3542', cursor: 'pointer', fontWeight: 'bold' },
  purchasedBtn: { width: '100%', padding: '12px', background: '#e0e0e0', color: '#888', borderRadius: '12px', border: 'none', cursor: 'not-allowed', fontWeight: 'bold' },
  maniaBadge: {
    position: 'absolute', top: '5px', right: '5px', background: '#ff4757', color: 'white', padding: '8px 15px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '900', zIndex: 10, boxShadow: '0 4px 15px rgba(255, 71, 87, 0.5)', border: '2px solid white'
  },
  hurryBadge: {
    position: 'absolute', top: '10px', right: '10px', background: '#ff4757', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '900', zIndex: 10, boxShadow: '0 4px 15px rgba(255, 71, 87, 0.4)', letterSpacing: '0.5px'
  },
  festiveBadge: {
    position: 'absolute', top: '10px', left: '10px', background: '#ffa502', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', zIndex: 9
  },
  qtyContainer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '15px', padding: '5px', background: '#f8f9fa', borderRadius: '10px'
  },
  qtyBtn: {
    width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #ced4da', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333'
  },
  qtyText: {
    fontSize: '1.2rem', fontWeight: '900', minWidth: '25px', color: '#000000', textAlign: 'center'
  }
};

export default ProductCard;