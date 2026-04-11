import React from 'react';
import { Map, DollarSign, Package, TrendingUp, Search, FileSpreadsheet, Car } from 'lucide-react';

const Navigation = ({ currentTab, setCurrentTab }) => {
  const navItems = [
    { id: 'find', label: 'Find', icon: Search },
    { id: 'route', label: 'Route', icon: Map },
    { id: 'auto', label: 'Drives', icon: Car },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'price', label: 'Comp It', icon: TrendingUp },
    { id: 'budget', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <nav style={styles.nav}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            style={{
              ...styles.navButton,
              color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
            }}
            onClick={() => setCurrentTab(item.id)}
          >
            <div style={{
              ...styles.iconWrapper,
              transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
              filter: isActive ? 'drop-shadow(0 0 8px var(--accent-glow))' : 'none',
            }}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span style={{
              ...styles.label,
              opacity: isActive ? 1 : 0.7,
              fontWeight: isActive ? 600 : 400,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '600px',
    height: 'var(--nav-height)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border-color)',
    paddingBottom: 'env(safe-area-inset-bottom)', // for iOS
    zIndex: 1000,
  },
  navButton: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    width: '100%',
    height: '100%',
    transition: 'color 0.3s ease',
  },
  iconWrapper: {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    marginBottom: '4px',
  },
  label: {
    fontSize: '0.75rem',
    transition: 'all 0.3s ease',
  }
};

export default Navigation;
