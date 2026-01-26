import React from 'react';

const Sidebar = ({ activeCategory, setCategory }) => {
  const categories = ["All", "Dairy", "Bakery", "Produce", "Meat"];

  return (
    <div style={styles.sidebar}>
      <h3 style={styles.sidebarTitle}>Departments</h3>
      <div style={styles.list}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              ...styles.btn,
              backgroundColor: activeCategory === cat ? '#27ae60' : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: activeCategory === cat ? 'bold' : 'normal'
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      <div style={styles.footer}>
        <small>AI Pricing Active 🟢</small>
      </div>
    </div>
  );
};

const styles = {
  sidebar: { width: '250px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', padding: '20px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.1)' },
  sidebarTitle: { color: '#f1c40f', letterSpacing: '2px', marginBottom: '25px', fontSize: '14px', textTransform: 'uppercase' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  btn: { padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontSize: '16px', transition: 'all 0.3s' },
  footer: { marginTop: 'auto', padding: '10px', color: '#bdc3c7', borderTop: '1px solid rgba(255,255,255,0.1)' }
};

export default Sidebar;