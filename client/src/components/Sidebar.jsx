import React, { useState } from 'react';

const Sidebar = ({ activeCategory, setCategory }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Mapping categories to icons for better visual recognition
  const categories = [
    { name: "All", icon: "🏠" },
    { name: "Dairy", icon: "🥛" },
    { name: "Bakery", icon: "🍞" },
    { name: "Produce", icon: "🌾" },
    { name: "Meat", icon: "🥩" },
    { name: "Beverages", icon: "🥤" },
    { name: "Snacks", icon: "🍿" },
    { name: "Vegetables", icon: "🥦" },
  ];

  return (
    <div style={styles.sidebar}>
      <h3 style={styles.sidebarTitle}>Menu</h3>
      
      <div style={styles.menuContainer}>
        {/* Outlined Hamburger Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={styles.hamburgerBtn}
          aria-label="Toggle Categories"
        >
          <span style={{ fontSize: '18px', transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            {isOpen ? '✕' : '☰'}
          </span>
          <span style={{ marginLeft: '12px', fontSize: '15px', fontWeight: 'bold' }}>
            Categories
          </span>
        </button>

        {/* Expandable Categories List (Inline, not absolute) */}
        <div style={{
          ...styles.categoriesList,
          maxHeight: isOpen ? '500px' : '0px', // Animates the height
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          marginTop: isOpen ? '15px' : '0px',
        }}>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => {
                setCategory(cat.name);
                // Optional: keep setIsOpen(false) here if you want it to auto-close after picking
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== cat.name) e.target.style.background = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== cat.name) e.target.style.background = 'rgba(255,255,255,0.05)';
              }}
              style={{
                ...styles.btn,
                backgroundColor: activeCategory === cat.name ? '#27ae60' : 'rgba(255,255,255,0.05)',
                color: 'white',
                fontWeight: activeCategory === cat.name ? 'bold' : 'normal',
                boxShadow: activeCategory === cat.name ? '0 4px 15px rgba(39, 174, 96, 0.3)' : 'none',
              }}
            >
              <span style={{ marginRight: '12px' }}>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
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
    background: '#353535', // Match the solid dark grey from your screenshot
    padding: '25px 20px', 
    display: 'flex', 
    flexDirection: 'column', 
    borderRight: '1px solid rgba(255,255,255,0.1)',
    height: 'calc(100vh - 80px)', 
    position: 'sticky',
    top: '80px',
    boxSizing: 'border-box'
  },
  sidebarTitle: { 
    color: '#f1c40f', 
    letterSpacing: '2px', 
    marginBottom: '15px', 
    fontSize: '12px', 
    fontWeight: '800',
    textTransform: 'uppercase',
    opacity: 0.9
  },
  menuContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  hamburgerBtn: {
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: '1px solid #ffffff', // The white outline from your image
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    transition: 'all 0.3s ease',
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto', // Allows scrolling if list gets too long
    overflowX: 'hidden',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    scrollbarWidth: 'none', // Hides scrollbar in Firefox
  },
  btn: { 
    padding: '14px 16px', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    textAlign: 'left', 
    fontSize: '15px', 
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
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

export default Sidebar;