import React from 'react';

const Sidebar = ({ activeCategory, setCategory }) => {
  // Mapping categories to icons for better visual recognition
  const categories = [
    { name: "All", icon: "🏠" },
    { name: "Dairy", icon: "🥛" },
    { name: "Bakery", icon: "🍞" },
    { name: "Produce", icon: "🥦" },
    { name: "Meat", icon: "🥩" }
  ];

  return (
    <div style={styles.sidebar}>
      <h3 style={styles.sidebarTitle}>Departments</h3>
      <div style={styles.list}>
        {categories.map(cat => (
          <button
            key={cat.name}
            onClick={() => setCategory(cat.name)}
            onMouseEnter={(e) => {
              if (activeCategory !== cat.name) e.target.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              if (activeCategory !== cat.name) e.target.style.background = 'rgba(255,255,255,0.1)';
            }}
            style={{
              ...styles.btn,
              backgroundColor: activeCategory === cat.name ? '#27ae60' : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: activeCategory === cat.name ? 'bold' : 'normal',
              boxShadow: activeCategory === cat.name ? '0 4px 15px rgba(39, 174, 96, 0.3)' : 'none',
              transform: activeCategory === cat.name ? 'translateX(5px)' : 'none'
            }}
          >
            <span style={{ marginRight: '12px' }}>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>
      
      <div style={styles.footer}>
        <div style={styles.statusWrapper}>
          <span style={styles.pulseDot}></span>
          <small>AI Pricing Active</small>
        </div>
      </div>
    </div>
  );
};

const styles = {
  sidebar: { 
    width: '250px', 
    background: 'rgba(20, 20, 20, 0.8)', 
    backdropFilter: 'blur(15px)', 
    padding: '25px 20px', 
    display: 'flex', 
    flexDirection: 'column', 
    borderRight: '1px solid rgba(255,255,255,0.1)',
    height: 'calc(100vh - 80px)', // Adjust based on your navbar height
    position: 'sticky',
    top: '80px'
  },
  sidebarTitle: { 
    color: '#f1c40f', 
    letterSpacing: '2px', 
    marginBottom: '25px', 
    fontSize: '12px', 
    fontWeight: '800',
    textTransform: 'uppercase',
    opacity: 0.8
  },
  list: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '10px' 
  },
  btn: { 
    padding: '14px 18px', 
    border: 'none', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    textAlign: 'left', 
    fontSize: '15px', 
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center'
  },
  footer: { 
    marginTop: 'auto', 
    paddingTop: '20px', 
    borderTop: '1px solid rgba(255,255,255,0.1)' 
  },
  statusWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#2ecc71'
  },
  pulseDot: {
    height: '8px',
    width: '8px',
    backgroundColor: '#2ecc71',
    borderRadius: '50%',
    display: 'inline-block',
    boxShadow: '0 0 0 rgba(46, 204, 113, 0.4)',
    animation: 'pulse 2s infinite'
  }
};

// Note: To make the pulse animation work, ensure this is in your App.css:
/*
@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(46, 204, 113, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
}
*/

export default Sidebar;