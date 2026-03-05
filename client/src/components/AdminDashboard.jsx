import React, { useState, useRef } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Bar } from 'react-chartjs-2';
import ManiaManager from './ManiaManager'; // Import the new component
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = ({ products, refreshData, onRunAi, isAiLoading }) => {
  const reportRef = useRef();
  const fileInputRef = useRef(); // Ref for CSV upload
  
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [showManiaManager, setShowManiaManager] = useState(false); // NEW: Toggle state

  const [formData, setFormData] = useState({
    name: '', 
    category: 'Dairy', 
    wholesalePrice: '', 
    basePrice: '', 
    stockLevel: '', 
    expiryDate: '', 
    minPrice: 0, 
    maxPrice: 0, 
    salesVelocity: 50,
    isFestive: false,
    festivalEndDate: ''
  });

  // --- CSV IMPORT & BULK STOCK UPDATE LOGIC ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    setIsCsvUploading(true);

    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      const updates = rows.slice(1).map(row => {
        const columns = row.split(',');
        return {
          name: columns[0]?.trim(),
          newStock: parseInt(columns[2]?.trim())
        };
      }).filter(item => item.name && !isNaN(item.newStock));

      try {
        await axios.post('http://localhost:5000/api/products/bulk-stock-update', { updates });
        alert(`Successfully synced stock levels for ${updates.length} items!`);
        refreshData();
      } catch (err) {
        console.error("CSV Upload Error:", err);
        alert("Failed to update stock. Ensure your backend route /api/products/bulk-stock-update is active.");
      } finally {
        setIsCsvUploading(false);
        e.target.value = null; // Reset file input
      }
    };
    reader.readAsText(file);
  };

  // --- PDF GENERATION LOGIC ---
  const generatePDF = async () => {
    try {
      setIsPdfGenerating(true);
      const element = reportRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#0f0f1a',
        logging: false,
        useCORS: true 
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // --- FINAL FIXED EXPORT LOGIC FOR DD-MM-YYYY ---
  const exportCSV = () => {
    // We add a BOM (Byte Order Mark) so Excel recognizes UTF-8 characters correctly
    const BOM = "\uFEFF";
    const headers = "Product Name,Category,Total Stocks Taken,Stocks Left,Units Sold,Expiry Date,Price,Profit\n";
    
    const rows = products.map(p => {
      const profit = (p.currentPrice - p.wholesalePrice) * p.unitsSold;
      const stocksTaken = (p.stockLevel || 0) + (p.unitsSold || 0);
      
      let expiryStr = 'N/A';
      if (p.expiryDate) {
        const d = new Date(p.expiryDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        // Adding \t (tab) forces Excel to treat this as text and prevents hashing
        expiryStr = `\t${day}-${month}-${year}`; 
      }
      
      return `"${p.name}",${p.category},${stocksTaken},${p.stockLevel},${p.unitsSold},${expiryStr},${p.currentPrice.toFixed(2)},${profit.toFixed(2)}`;
    }).join("\n");

    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Inventory_Export_DD-MM-YYYY.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Helper Functions ---
  const getExpiryStatus = (date) => {
    if (!date) return { label: 'N/A', color: '#666', isUrgent: false };
    const now = new Date();
    const expiry = new Date(date);
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (diff <= 0) return { label: 'EXPIRED', color: '#ff4757', isExpired: true };
    if (days <= 1) return { label: `TODAY`, color: '#38bdf8', isUrgent: true };
    if (days <= 3) return { label: `Critical: ${days}d`, color: '#ffa502', isUrgent: true };
    return { label: `${days} days left`, color: '#2ed573', isUrgent: false };
  };

  // --- Metrics Calculation ---
  const totalRevenue = products.reduce((acc, p) => acc + (p.currentPrice * p.unitsSold), 0);
  const totalProfit = products.reduce((acc, p) => {
    const profitPerUnit = p.currentPrice - p.wholesalePrice;
    return acc + (profitPerUnit * p.unitsSold);
  }, 0);
  const totalInvestment = products.reduce((acc, p) => acc + (p.wholesalePrice * p.stockLevel), 0);

  const chartData = {
    labels: products.map(p => p.name).slice(0, 10),
    datasets: [{
      label: 'Units Sold',
      data: products.map(p => p.unitsSold).slice(0, 10),
      backgroundColor: '#38bdf8',
      borderRadius: 5,
    }]
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/products', {
        ...formData,
        currentPrice: formData.basePrice,
        unitsSold: 0 
      });
      alert("New product added to inventory!");
      setFormData({
        name: '', category: 'Dairy', wholesalePrice: '', basePrice: '', stockLevel: '', 
        expiryDate: '', minPrice: 0, maxPrice: 0, salesVelocity: 50,
        isFestive: false, festivalEndDate: ''
      });
      refreshData();
    } catch (err) { alert("Error adding product"); }
  };

  const deleteOutOfStock = async () => {
    if(window.confirm("Remove all items with 0 stock?")) {
      await axios.delete('http://localhost:5000/api/products/out-of-stock');
      refreshData();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
            <h1>📊 Admin Dashboard</h1>
            <p style={{ color: '#aaa', fontSize: '14px' }}>System Date: {new Date().toLocaleDateString()}</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          
          <button 
            onClick={() => setShowManiaManager(!showManiaManager)} 
            style={{ ...styles.maniaBtn, background: showManiaManager ? '#57606f' : '#e74c3c' }}
          >
            {showManiaManager ? "⬅ Back to Stats" : "🔥 Daily Mania"}
          </button>

          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleCsvUpload} 
          />

          <button 
            onClick={() => fileInputRef.current.click()} 
            style={{...styles.csvBtn, background: '#8e44ad'}}
            disabled={isCsvUploading}
          >
            {isCsvUploading ? "⏳ Syncing..." : "📥 Upload Stock CSV"}
          </button>

          <button onClick={generatePDF} disabled={isPdfGenerating} style={styles.pdfBtn}>
            {isPdfGenerating ? "⏳ Rendering..." : "📄 PDF Report"}
          </button>
          
          <button onClick={exportCSV} style={styles.csvBtn}>📈 Export Excel/CSV</button>
          
          <button 
            onClick={onRunAi} 
            disabled={isAiLoading} 
            style={{...styles.aiBtn, opacity: isAiLoading ? 0.7 : 1}}
          >
            {isAiLoading ? "🤖 AI Processing..." : "✨ Run AI Pricing Engine"}
          </button>
          <button onClick={deleteOutOfStock} style={styles.deleteBtn}>🗑️ Clean Out-of-Stock</button>
        </div>
      </div>

      {showManiaManager ? (
        <ManiaManager products={products} onUpdate={refreshData} />
      ) : (
        <div ref={reportRef}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <h3>Total Revenue</h3>
              <p>₹{totalRevenue.toFixed(2)}</p>
            </div>
            <div style={{...styles.statCard, borderBottom: '4px solid #2ed573'}}>
              <h3 style={{ color: '#2ed573' }}>💰 Total Realized Profit</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>₹{totalProfit.toFixed(2)}</p>
            </div>
            <div style={styles.statCard}>
              <h3>Stock Investment</h3>
              <p>₹{totalInvestment.toFixed(2)}</p>
            </div>
          </div>

          <div style={styles.mainGrid}>
            <div style={styles.sectionCard}>
              <h3>Sales Volume by Product</h3>
              <Bar data={chartData} options={{ responsive: true }} />
            </div>

            <div style={styles.sectionCard} className="no-pdf">
              <h3>Add New Inventory</h3>
              <form onSubmit={handleAddProduct} style={styles.form}>
                <input 
                    type="text" 
                    placeholder="Product Name" 
                    style={styles.input} 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                />
                <select 
                    style={styles.input} 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Dairy">Dairy</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Produce">Produce</option>
                  <option value="Meat">Meat</option>
                </select>
                <input 
                    type="number" 
                    placeholder="Wholesale Price (Cost)" 
                    style={styles.input} 
                    value={formData.wholesalePrice} 
                    onChange={e => setFormData({...formData, wholesalePrice: e.target.value})} 
                    required 
                />
                <input 
                    type="number" 
                    placeholder="Retail Price (Base)" 
                    style={styles.input} 
                    value={formData.basePrice} 
                    onChange={e => setFormData({...formData, basePrice: e.target.value})} 
                    required 
                />
                <input 
                    type="number" 
                    placeholder="Initial Stock" 
                    style={styles.input} 
                    value={formData.stockLevel} 
                    onChange={e => setFormData({...formData, stockLevel: e.target.value})} 
                    required 
                />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f0f1a', padding: '10px', borderRadius: '5px', border: '1px solid #444' }}>
                    <input 
                        type="checkbox" 
                        id="isFestive"
                        checked={formData.isFestive}
                        onChange={e => setFormData({...formData, isFestive: e.target.checked})}
                    />
                    <label htmlFor="isFestive" style={{ fontSize: '14px', cursor: 'pointer' }}>🎉 Mark as Festive High-Demand</label>
                </div>

                {formData.isFestive && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px'}}>
                        <label style={{ fontSize: '12px', color: '#ffa502'}}>Festival End Date</label>
                        <input 
                            type="date" 
                            style={{...styles.input, borderColor: '#ffa502'}} 
                            value={formData.festivalEndDate} 
                            onChange={e => setFormData({...formData, festivalEndDate: e.target.value})} 
                            required 
                        />
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px'}}>
                    <label style={{ fontSize: '12px', color: '#aaa'}}>Expiry Date</label>
                    <input 
                     type="date" 
                     style={styles.input} 
                     value={formData.expiryDate} 
                     onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
                     required 
                    />
                </div>
                <button type="submit" style={styles.submitBtn}>Add to Stock</button>
              </form>
            </div>
          </div>

          <div style={styles.sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Inventory Health & Itemized Profit</h3>
                <span style={{ fontSize: '12px', background: '#333', padding: '5px 10px', borderRadius: '15px'}}>
                  Items tracked: {products.length}
                </span>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #444' }}>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Stocks Taken</th>
                  <th>Stocks Left</th>
                  <th>Units Sold</th>
                  <th>Expiry Date</th>
                  <th>Expiry Watch</th>
                  <th>Selling Price</th>
                  <th style={{ textAlign: 'right' }}>Profit Obtained</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const itemProfit = (p.currentPrice - p.wholesalePrice) * p.unitsSold;
                  const expiry = getExpiryStatus(p.expiryDate);
                  const stocksTaken = (p.stockLevel || 0) + (p.unitsSold || 0);

                  // Table UI format: DD-MM-YYYY
                  const d = p.expiryDate ? new Date(p.expiryDate) : null;
                  const displayDate = d ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` : 'N/A';

                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '12px 0' }}>{p.name}</td>
                      <td>
                        {p.isOnMania ? (
                          <span style={{ fontSize: '10px', background: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🔥 MANIA</span>
                        ) : p.isFestive ? (
                          <span style={{ fontSize: '10px', background: '#ffa502', color: 'black', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>FESTIVE</span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#666' }}>Standard</span>
                        )}
                      </td>
                      <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{stocksTaken}</td>
                      <td style={{ color: p.stockLevel < 10 ? '#ff4757' : 'white' }}>{p.stockLevel}</td>
                      <td>{p.unitsSold}</td>
                      <td style={{ fontSize: '12px' }}>{displayDate}</td>
                      <td>
                        <span style={{ 
                            fontSize: '11px', 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            background: `${expiry.color}22`, 
                            color: expiry.color,
                            border: `1px solid ${expiry.color}44`,
                            fontWeight: expiry.isUrgent ? 'bold' : 'normal'
                        }}>
                            {expiry.label}
                        </span>
                      </td>
                      <td style={{ color: p.currentPrice > p.basePrice ? '#ffa502' : p.currentPrice < p.basePrice ? '#38bdf8' : 'white' }}>
                        ₹{p.currentPrice.toFixed(2)}
                         {p.currentPrice > p.basePrice && <span style={{ fontSize: '12px', marginLeft: '5px' }}>📈 HIKE</span>}
                          {p.currentPrice < p.basePrice && <span style={{ fontSize: '12px', marginLeft: '5px' }}>📉 AI</span>}
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        color: itemProfit >= 0 ? '#2ed573' : '#ff4757', 
                        fontWeight: 'bold' 
                      }}>
                        ₹{itemProfit.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '30px', color: 'white', background: '#0f0f1a', minHeight: '100vh', width: '100%', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  maniaBtn: { padding: '10px 20px', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' },
  statCard: { background: '#1e1e2f', padding: '20px', borderRadius: '12px', textAlign: 'center' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '30px' },
  sectionCard: { background: '#1e1e2f', padding: '20px', borderRadius: '12px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#0f0f1a', color: 'white' },
  submitBtn: { padding: '10px', background: '#2ed573', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  deleteBtn: { padding: '10px 20px', background: '#ff4757', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  aiBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  pdfBtn: { padding: '10px 20px', background: '#00a8ff', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  csvBtn: { padding: '10px 20px', background: '#4cd137', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
};

export default AdminDashboard;