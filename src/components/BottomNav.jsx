import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'dashboard', label: 'Dressing' },
  { id: 'trip', label: 'Voyage' },
  { id: 'stylist', label: 'Styliste' },
  { id: 'settings', label: 'Profil' }
];

const BottomNav = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map(({ id, label }) => {
        const active = activeTab === id || (id === 'dashboard' && ['add-choice', 'add-detail', 'bulk-add'].includes(activeTab));
        return (
          <button
            type="button"
            key={id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => onTabChange(id)}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="nav-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;