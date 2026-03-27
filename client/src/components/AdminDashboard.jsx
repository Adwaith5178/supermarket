import React, { useState, useRef, useMemo } from 'react';
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
  const fullSyncInputRef = useRef(); // Ref for Full Bulk Sync CSV upload
  const imageInputRef = useRef(); // Ref for Product Image upload
  const editImageInputRef = useRef(); // Ref for Edit Product Image upload
  
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [showManiaManager, setShowManiaManager] = useState(false); // Toggle state

  // --- EDIT MODAL STATE ---
  const [editingProduct, setEditingProduct] = useState(null);

  // --- SEARCH & FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // --- BULK SELECTION STATE ---
  const [selectedIds, setSelectedIds] = useState([]); 

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
    festivalEndDate: '',
    image: null // For product image file
  });

  // --- FILTERED DATA LOGIC (Ensures search works with your table) ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  // --- SELECTION & DELETE LOGIC ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSingle = async (id, name) => {
    if (window.confirm(`Permanently delete "${name}"?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        refreshData(); 
      } catch (err) {
        alert("Error deleting product");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) {
      try {
        await axios.post('http://localhost:5000/api/products/bulk-delete', { ids: selectedIds });
        setSelectedIds([]); // Clear selection after delete
        refreshData();
      } catch (err) {
        alert("Bulk delete failed");
      }
    }
  };

  // --- ALL-IN-ONE FULL DB BULK SYNC LOGIC ---
  const handleFullCsvSync = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    setIsCsvUploading(true);

    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      // Expected CSV Headers: Name, Category, WholesalePrice, BasePrice, StockLevel, ExpiryDate, SalesVelocity, IsFestive, ImageUrl, MinPrice, MaxPrice
      const parsedProducts = rows.slice(1).map(row => {
        const cols = row.split(',').map(col => col.replace(/^"|"$/g, '').trim()); // Strip quotes and trim
        return {
          name: cols[0],
          category: cols[1] || 'General',
          wholesalePrice: parseFloat(cols[2]) || 0,
          basePrice: parseFloat(cols[3]) || 0,
          stockLevel: parseInt(cols[4]) || 0,
          expiryDate: cols[5],
          salesVelocity: parseInt(cols[6]) || 50,
          isFestive: cols[7]?.toLowerCase() === 'true',
          imageUrl: cols[8] || '', // Parse ImageUrl
          minPrice: parseFloat(cols[9]) || 0, // Parse MinPrice
          maxPrice: parseFloat(cols[10]) || 0 // Parse MaxPrice
        };
      }).filter(item => item.name); // Ignore empty rows

      try {
        const response = await axios.post('http://localhost:5000/api/products/bulk-sync', { products: parsedProducts });
        alert(response.data.message || "Bulk sync completed successfully!");
        refreshData();
      } catch (err) {
        console.error("Full Sync Error:", err);
        alert("Failed to sync products. Check console for details.");
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
    const BOM = "\uFEFF";
    const headers = "Product Name,Category,Total Stocks Taken,Stocks Left,Units Sold,Expiry Date,Price,Profit,Suggested Restock\n";
    
    const rows = products.map(p => {
      const profit = (p.currentPrice - p.wholesalePrice) * p.unitsSold;
      const stocksTaken = (p.stockLevel || 0) + (p.unitsSold || 0);
      const restockAmount = Math.max(0, (p.salesVelocity * 7) - p.stockLevel);
      
      let expiryStr = 'N/A';
      if (p.expiryDate) {
        const d = new Date(p.expiryDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        expiryStr = `\t${day}-${month}-${year}`; 
      }
      
      return `"${p.name}",${p.category},${stocksTaken},${p.stockLevel},${p.unitsSold},${expiryStr},${p.currentPrice.toFixed(2)},${profit.toFixed(2)},${restockAmount}`;
    }).join("\n");

    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Inventory_Export_Full.csv`);
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
  const totalInvestment = products.reduce((acc, p) => {
    const totalUnitsPurchased = (p.stockLevel || 0) + (p.unitsSold || 0);
    return acc + (p.wholesalePrice * totalUnitsPurchased);
  }, 0);

  const chartData = {
    labels: products.map(p => p.name).slice(0, 10),
    datasets: [{
      label: 'Units Sold',
      data: products.map(p => p.unitsSold).slice(0, 10),
      backgroundColor: '#38bdf8',
      borderRadius: 5,
    }]
  };

  // --- HANDLE ADD PRODUCT WITH IMAGE ---
  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    // Create FormData object for multipart/form-data
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
        if (key === 'image' && formData[key]) {
            submitData.append('image', formData[key]);
        } else {
            submitData.append(key, formData[key]);
        }
    });
    // Add default fields
    submitData.append('currentPrice', formData.basePrice);
    submitData.append('unitsSold', 0);

    try {
      await axios.post('http://localhost:5000/api/products', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert("New product added to inventory!");
      setFormData({
        name: '', category: 'Dairy', wholesalePrice: '', basePrice: '', stockLevel: '', 
        expiryDate: '', minPrice: 0, maxPrice: 0, salesVelocity: 50,
        isFestive: false, festivalEndDate: '', image: null
      });
      if (imageInputRef.current) imageInputRef.current.value = null; // Reset image input
      refreshData();
    } catch (err) { 
        console.error(err);
        alert("Error adding product"); 
    }
  };

  const deleteOutOfStock = async () => {
    if(window.confirm("Remove all items with 0 stock?")) {
      await axios.delete('http://localhost:5000/api/products/out-of-stock');
      refreshData();
    }
  };

  // --- HANDLE EDIT PRODUCT LOGIC ---
  const openEditModal = (product) => {
    // Pre-fill form, correctly formatting dates for HTML date inputs
    setEditingProduct({
      ...product,
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
      festivalEndDate: product.festivalEndDate ? new Date(product.festivalEndDate).toISOString().split('T')[0] : '',
      newImage: null 
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    const updateData = new FormData();
    
    Object.keys(editingProduct).forEach(key => {
      if (key === 'newImage' && editingProduct[key]) {
        updateData.append('image', editingProduct[key]);
      } else if (key !== '_id' && key !== '__v' && key !== 'image' && key !== 'newImage' && key !== 'createdAt' && key !== 'updatedAt') {
        updateData.append(key, editingProduct[key]);
      }
    });

    try {
      await axios.put(`http://localhost:5000/api/products/${editingProduct._id}`, updateData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Product updated successfully!");
      setEditingProduct(null); // Close Modal
      refreshData(); // Refresh table
    } catch (err) {
      console.error(err);
      alert("Error updating product");
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
          
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} style={styles.bulkDelBtn}>
              🗑️ Delete Selected ({selectedIds.length})
            </button>
          )}

          <button 
            onClick={() => setShowManiaManager(!showManiaManager)} 
            style={{ ...styles.maniaBtn, background: showManiaManager ? '#57606f' : '#e74c3c' }}
          >
            {showManiaManager ? "⬅ Back to Stats" : "🔥 Daily Mania"}
          </button>

          {/* FULL DB SYNC INPUT & BUTTON */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fullSyncInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFullCsvSync} 
          />
          <button 
            onClick={() => fullSyncInputRef.current.click()} 
            style={{...styles.csvBtn, background: '#3b5998'}}
            disabled={isCsvUploading}
          >
            {isCsvUploading ? "⏳ Syncing..." : "🔄 Bulk Upload (CSV)"}
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

          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#1e1e2f', padding: '15px', borderRadius: '12px' }}>
            <input 
              type="text" 
              placeholder="🔍 Search products by name..." 
              style={{ ...styles.input, flex: 2, margin: 0 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              style={{ ...styles.input, flex: 1, margin: 0 }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Dairy">Dairy</option>
              <option value="Bakery">Bakery</option>
              <option value="Produce">Produce</option>
              <option value="Meat">Meat</option>
              <option value="Beverages">Beverages</option>
              <option value="Snacks">Snacks</option>
              <option value="Vegetables">Vegetables</option>
            </select>
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
                
                {/* Product Image Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#38bdf8' }}>📸 Product Image</label>
                    <input 
                        type="file" 
                        accept="image/*"
                        ref={imageInputRef}
                        style={styles.input}
                        onChange={e => setFormData({...formData, image: e.target.files[0]})}
                    />
                </div>

                <select 
                    style={styles.input} 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Dairy">Dairy</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Produce">Produce</option>
                  <option value="Meat">Meat</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Vegetables">Vegetables</option>
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
                <h3>Inventory Health & Smart Restock Recommendations</h3>
                <span style={{ fontSize: '12px', background: '#333', padding: '5px 10px', borderRadius: '15px'}}>
                  {searchTerm || filterCategory !== 'All' ? `Filtered: ${filteredProducts.length}` : `Items tracked: ${products.length}`}
                </span>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #444' }}>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length} 
                    />
                  </th>
                  <th>Name</th>
                  <th>Status</th>
                  <th style={{ color: '#aaa' }}>Total Stock</th> 
                  <th>Stocks Left</th>
                  <th>Units Sold</th>
                  <th style={{ color: '#ffa502' }}>Expiry Date</th>
                  <th>Expiry Watch</th>
                  <th>Selling Price</th>
                  <th style={{ color: '#2ed573' }}>Restock (7D)</th>
                  <th style={{ textAlign: 'right' }}>Profit Obtained</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const itemProfit = (p.currentPrice - p.wholesalePrice) * p.unitsSold;
                  const expiry = getExpiryStatus(p.expiryDate);
                  const totalStock = (p.stockLevel || 0) + (p.unitsSold || 0);
                  const suggestedRestock = Math.max(0, (p.salesVelocity * 7) - p.stockLevel);

                  const d = p.expiryDate ? new Date(p.expiryDate) : null;
                  const displayDate = d ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` : 'N/A';

                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid #333' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(p._id)} 
                          onChange={() => handleSelectItem(p._id)} 
                        />
                      </td>
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
                      <td style={{ color: '#aaa' }}>{totalStock}</td> 
                      <td style={{ color: p.stockLevel < 10 ? '#ff4757' : 'white', fontWeight: 'bold' }}>{p.stockLevel}</td>
                      <td>{p.unitsSold}</td>
                      <td style={{ color: '#ffa502', fontSize: '13px' }}>{displayDate}</td>
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
                      <td style={{ fontWeight: 'bold' }}>
                        {suggestedRestock > 0 ? (
                          <span style={{ color: '#2ed573' }}>📦 +{suggestedRestock}</span>
                        ) : (
                          <span style={{ color: '#666', fontSize: '11px' }}>OK</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: itemProfit >= 0 ? '#2ed573' : '#ff4757', fontWeight: 'bold' }}>
                        ₹{itemProfit.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {/* UPDATE/EDIT BUTTON ADDED HERE */}
                        <button onClick={() => openEditModal(p)} style={{...styles.deleteIconBtn, color: '#38bdf8', marginRight: '8px'}} title="Edit Product">✏️</button>
                        <button onClick={() => handleDeleteSingle(p._id, p.name)} style={{...styles.deleteIconBtn, color: '#ff4757'}} title="Delete Product">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- EDIT PRODUCT MODAL --- */}
      {editingProduct && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>✏️ Edit Product</h2>
              <button onClick={() => setEditingProduct(null)} style={styles.closeBtn}>✖</button>
            </div>
            
            <form onSubmit={handleUpdateProduct} style={styles.form}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Product Name</label>
                <input type="text" style={styles.input} value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: '#38bdf8' }}>📸 Update Image (Optional)</label>
                  <input type="file" accept="image/*" ref={editImageInputRef} style={styles.input} onChange={e => setEditingProduct({...editingProduct, newImage: e.target.files[0]})} />
                  {editingProduct.image && !editingProduct.newImage && (
                    <span style={{ fontSize: '11px', color: '#2ed573' }}>✓ Image currently exists on server</span>
                  )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Category</label>
                  <select style={styles.input} value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Produce">Produce</option>
                    <option value="Meat">Meat</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Vegetables">Vegetables</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Stock Level</label>
                  <input type="number" style={styles.input} value={editingProduct.stockLevel} onChange={e => setEditingProduct({...editingProduct, stockLevel: e.target.value})} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Wholesale Price</label>
                  <input type="number" style={styles.input} value={editingProduct.wholesalePrice} onChange={e => setEditingProduct({...editingProduct, wholesalePrice: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>Base Price</label>
                  <input type="number" style={styles.input} value={editingProduct.basePrice} onChange={e => setEditingProduct({...editingProduct, basePrice: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#ffa502' }}>Current Selling Price</label>
                  <input type="number" style={{...styles.input, borderColor: '#ffa502'}} value={editingProduct.currentPrice} onChange={e => setEditingProduct({...editingProduct, currentPrice: e.target.value})} required />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f0f1a', padding: '10px', borderRadius: '5px', border: '1px solid #444', marginTop: '10px' }}>
                  <input type="checkbox" id="editIsFestive" checked={editingProduct.isFestive} onChange={e => setEditingProduct({...editingProduct, isFestive: e.target.checked})} />
                  <label htmlFor="editIsFestive" style={{ fontSize: '14px', cursor: 'pointer' }}>🎉 Mark as Festive High-Demand</label>
              </div>

              {editingProduct.isFestive && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px'}}>
                      <label style={{ fontSize: '12px', color: '#ffa502'}}>Festival End Date</label>
                      <input type="date" style={{...styles.input, borderColor: '#ffa502'}} value={editingProduct.festivalEndDate} onChange={e => setEditingProduct({...editingProduct, festivalEndDate: e.target.value})} required />
                  </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px'}}>
                  <label style={{ fontSize: '12px', color: '#aaa'}}>Expiry Date</label>
                  <input type="date" style={styles.input} value={editingProduct.expiryDate} onChange={e => setEditingProduct({...editingProduct, expiryDate: e.target.value})} required />
              </div>

              <button type="submit" style={{...styles.submitBtn, marginTop: '20px', padding: '15px', fontSize: '16px'}}>💾 Save Changes</button>
            </form>
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
  bulkDelBtn: { padding: '10px 20px', background: '#ff4757', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  deleteIconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' },
  aiBtn: { padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  pdfBtn: { padding: '10px 20px', background: '#00a8ff', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  csvBtn: { padding: '10px 20px', background: '#4cd137', border: 'none', color: 'white', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },

  // --- NEW MODAL STYLES ADDED HERE ---
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#1e1e2f', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #333', boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' },
  closeBtn: { background: 'none', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' },
};

export default AdminDashboard;