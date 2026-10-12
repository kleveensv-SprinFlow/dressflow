import React from 'react';

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dressing' },
    { id: 'trip', label: 'Voyage' },
    { id: 'add-choice', label: 'Ajouter' },
    { id: 'stylist', label: 'Styliste' },
    { id: 'settings', label: 'Profil' }
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {tabs.map(({ id, label }) => {
        const active = activeTab === id || (id === 'add-choice' && ['add-choice', 'add-detail', 'bulk-add'].includes(activeTab));
        return (
          <button
            type="button"
            key={id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => onTabChange(id)}
            aria-current={active ? 'page' : undefined}
          >
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;