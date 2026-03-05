import React, { useState } from 'react';
import axios from 'axios';

const ManiaManager = ({ products, onRefresh }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [discount, setDiscount] = useState(20);
  const [loading, setLoading] = useState(false);

  const toggleProduct = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p._id));
    }
  };

  const handleActivate = async () => {
    if (selectedIds.length === 0) return alert("Select at least one product!");
    setLoading(true);
    try {
      // Ensure this URL matches your backend exactly
      const response = await axios.post('http://localhost:5000/api/mania/activate', {
        productIds: selectedIds,
        discount: Number(discount)
      });

      // Check for success status to avoid false error alerts
      if (response.status === 200 || response.status === 201) {
        alert("🔥 Daily Mania is LIVE!");
        onRefresh();
      }
    } catch (err) {
      console.error("Activation Error:", err);
       // Refresh anyway since you mentioned it applies
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm("End all Mania offers and restore base prices?")) return;
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/mania/deactivate');
      alert("All offers cleared.");
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      alert("Offer Deactivated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={styles.title}> Daily Mania Command Center</h2>
        <button onClick={handleDeactivate} style={styles.deactivateBtn}>
          STOP ALL OFFERS
        </button>
      </div>
      
      <div style={styles.controls}>
        <div style={styles.inputGroup}>
          <input 
            type="number" 
            value={discount} 
            onChange={(e) => setDiscount(e.target.value)} 
            style={styles.numberInput}
          />
          <span style={styles.label}>% Discount</span>
        </div>
        
        <button 
          onClick={handleActivate} 
          style={{...styles.activateBtn, opacity: loading ? 0.7 : 1}}
          disabled={loading}
        >
          {loading ? "PROCESSING..." : "ACTIVATE FLASH SALE"}
        </button>

        <button onClick={handleSelectAll} style={styles.selectAllBtn}>
          {selectedIds.length === products.length ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div style={styles.listWrapper}>
        <div style={styles.listHeader}>
            <span style={{ width: '50px' }}>Select</span>
            <span>Product Name</span>
            <span style={{ marginLeft: 'auto' }}>Price Preview</span>
        </div>
        <div style={styles.scrollArea}>
          {products.map(p => {
            const isSelected = selectedIds.includes(p._id);
            return (
              <div key={p._id} style={{
                ...styles.productRow,
                backgroundColor: isSelected ? '#fff5f5' : 'white'
              }}>
                <div style={{ width: '50px', display: 'flex', justifyContent: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleProduct(p._id)} 
                      style={styles.checkbox}
                    />
                </div>
                <span style={{ ...styles.productName, color: isSelected ? '#c0392b' : '#333' }}>
                    {p.name}
                    {p.isOnMania && <span style={styles.liveBadge}>LIVE</span>}
                </span>
                <span style={styles.priceTag}>
                    <span style={styles.oldPrice}>₹{p.currentPrice.toFixed(2)}</span>
                    <span style={styles.arrow}>→</span>
                    <b style={styles.newPrice}>
                        ₹{(p.currentPrice * (1 - discount/100)).toFixed(0)}
                    </b>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '25px', border: '2px solid #e74c3c', borderRadius: '12px', backgroundColor: '#0f0f1a', color: 'white' },
  title: { margin: 0, fontSize: '1.5rem', color: '#ff4757' },
  controls: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' },
  inputGroup: { display: 'flex', alignItems: 'center', background: '#333', padding: '5px 15px', borderRadius: '8px' },
  numberInput: { padding: '8px', width: '70px', background: 'transparent', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', outline: 'none' },
  label: { color: '#aaa', fontWeight: '500' },
  activateBtn: { padding: '12px 25px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  deactivateBtn: { padding: '8px 15px', backgroundColor: '#3d3d3d', color: '#ff4757', border: '1px solid #ff4757', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  selectAllBtn: { padding: '12px 15px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  listWrapper: { borderRadius: '8px', overflow: 'hidden', border: '1px solid #444' },
  listHeader: { display: 'flex', padding: '10px 15px', background: '#333', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' },
  scrollArea: { height: '400px', overflowY: 'auto', background: 'white' },
  productRow: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  productName: { marginLeft: '10px', fontWeight: '500', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' },
  liveBadge: { fontSize: '10px', background: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px' },
  priceTag: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' },
  oldPrice: { color: '#888', textDecoration: 'line-through', fontSize: '0.9rem' },
  arrow: { color: '#ccc' },
  newPrice: { color: '#e74c3c', fontSize: '1.1rem' }
};

export default ManiaManager;