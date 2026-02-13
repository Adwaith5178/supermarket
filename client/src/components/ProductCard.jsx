import React, { useState, useEffect } from 'react';

const ProductCard = ({ product, onAddToCart, userRole }) => {
  const [isPurchased, setIsPurchased] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isDealActive, setIsDealActive] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(product.expiryDate).getTime();
      const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
      const startTime = end - tenDaysInMs;
      const distance = end - now;

      // Logic for standard expiry/low stock deals
      const isNearExpiry = now >= startTime && distance > 0;
      const isLowStock = product.stockLevel > 0 && product.stockLevel < 5;

      // Check if a festival is currently active
      const isFestiveActive = product.isFestive && new Date(product.festivalEndDate) > new Date();

      if (isNearExpiry || isLowStock || isFestiveActive) {
        setIsDealActive(true);
        if (distance > 0) {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft("Expired");
        }
      } else {
        setIsDealActive(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [product.expiryDate, product.stockLevel, product.isFestive, product.festivalEndDate]);

  const discount = Math.round(((product.basePrice - product.currentPrice) / product.basePrice) * 100);

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
    onAddToCart({ ...product, selectedQuantity: quantity }); 
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    onAddToCart({ ...product, selectedQuantity: quantity });
  };

  return (
    <div className="product-card" style={{ 
      position: 'relative', 
      border: product.stockLevel < 5 && !isPurchased ? '2px solid #ff4757' : '1px solid #eee',
      boxShadow: product.isFestive ? '0 4px 15px rgba(255, 165, 2, 0.2)' : 'none' 
    }}>
      <style>
        {`
          @keyframes pulse-red {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
          }
          @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            50% { transform: translateX(2px); }
            75% { transform: translateX(-2px); }
            100% { transform: translateX(0); }
          }
          @keyframes festive-glow {
            0% { color: #ffa502; }
            50% { color: #ff4757; }
            100% { color: #ffa502; }
          }
        `}
      </style>

      {/* Hurry Badge (Priority 1) */}
      {!isPurchased && product.stockLevel > 0 && product.stockLevel < 5 && (
        <div style={{ ...styles.hurryBadge, animation: 'pulse-red 1.5s infinite' }}>
          🚨 HURRY UP!
        </div>
      )}

      {/* Festival Badge (Priority 2) */}
      {!isPurchased && product.isFestive && (
        <div style={styles.festiveBadge}>
          🎉 FESTIVE OFFER
        </div>
      )}

      {!isPurchased && isDealActive && discount > 0 && (
        <div className="offer-badge">{discount}% OFF</div>
      )}
      
      <div style={{fontSize: '50px', marginBottom: '10px'}}>
        {isPurchased ? '✅' : product.isFestive ? '🎁' : '🛒'}
      </div>

      <h3 style={{ color: '#2d3436', margin: '10px 0 5px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
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
                background: product.stockLevel < 5 ? '#fff2f2' : (product.isFestive ? '#fff9e6' : '#f1f2f6'), 
                padding: '6px 8px', 
                borderRadius: '4px', 
                marginTop: '4px',
                border: product.stockLevel < 5 ? '1px solid #ff4757' : (product.isFestive ? '1px solid #ffa502' : 'none')
              }}>
                {product.stockLevel < 5 && product.stockLevel > 0 ? (
                  <p style={{ 
                    color: '#ff4757', 
                    fontSize: '0.9rem', 
                    margin: 0, 
                    fontWeight: '900',
                    animation: 'shake 0.5s infinite' 
                  }}>
                    🔥 ONLY {product.stockLevel} STOCKS LEFT!
                  </p>
                ) : (
                  <p style={{ color: product.isFestive ? '#e67e22' : '#ff4757', fontSize: '0.8rem', margin: 0, fontWeight: 'bold' }}>
                    {product.isFestive ? '✨ Sale ends in: ' : '⏱ Ends in: '}{timeLeft}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      <div style={{margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
        <span style={{fontSize: '24px', fontWeight: 'bold', color: isPurchased ? '#888' : '#2ed573'}}>
          ₹{product.currentPrice}
        </span>
        
        {!isPurchased && (discount > 0 || product.currentPrice < product.basePrice) && (
          <span style={{textDecoration: 'line-through', color: '#ffa502', fontSize: '1.1rem'}}>
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
          <button onClick={handleAddToCart} style={styles.cartBtn} disabled={product.stockLevel <= 0}>
            {product.stockLevel > 0 ? `ADD ${quantity} TO CART` : 'OUT OF STOCK'}
          </button>
          <button onClick={handleBuyNow} style={styles.buyBtn} disabled={product.stockLevel <= 0}>
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
  cartBtn: { width: '100%', padding: '12px', background: '#2f3542', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  buyBtn: { width: '100%', padding: '10px', background: 'transparent', color: '#2f3542', borderRadius: '10px', border: '2px solid #2f3542', cursor: 'pointer', fontWeight: 'bold' },
  purchasedBtn: { width: '100%', padding: '12px', background: '#e0e0e0', color: '#888', borderRadius: '10px', border: 'none', cursor: 'not-allowed', fontWeight: 'bold' },
  hurryBadge: {
    position: 'absolute', top: '10px', right: '10px', background: '#ff4757', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '900', zIndex: 10, boxShadow: '0 4px 15px rgba(255, 71, 87, 0.4)', letterSpacing: '0.5px'
  },
  festiveBadge: {
    position: 'absolute', top: '10px', left: '10px', background: '#ffa502', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', zIndex: 9
  },
  qtyContainer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '15px', padding: '5px', background: '#f8f9fa', borderRadius: '8px'
  },
  qtyBtn: {
    width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #ced4da', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333'
  },
  qtyText: {
    fontSize: '1.2rem', 
    fontWeight: '900', 
    minWidth: '20px',
    color: '#000000', 
    textAlign: 'center'
  }
};

export default ProductCard;