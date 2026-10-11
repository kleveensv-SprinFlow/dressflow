import React from 'react';
import { motion } from 'framer-motion';
import { Home, Plane, Plus, Wand2, User } from 'lucide-react';

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dressing', icon: Home },
    { id: 'trip', label: 'Voyage', icon: Plane },
    { id: 'add-choice', label: 'Ajouter', icon: Plus, primary: true },
    { id: 'stylist', label: 'Styliste', icon: Wand2 },
    { id: 'settings', label: 'Profil', icon: User }
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {tabs.map(({ id, label, icon: Icon, primary }) => {
        const active = activeTab === id || (id === 'add-choice' && ['add-choice', 'add-detail', 'bulk-add'].includes(activeTab));
        return (
          <motion.button
            type="button"
            key={id}
            whileTap={{ scale: 0.96 }}
            className={`nav-item ${active ? 'active' : ''} ${primary ? 'nav-item-add' : ''}`}
            onClick={() => onTabChange(id)}
            aria-current={active && !primary ? 'page' : undefined}
            aria-label={label}
          >
            {primary ? <span className="add-nav-btn"><Icon size={28} /></span> : <Icon size={22} />}
            <span>{label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
