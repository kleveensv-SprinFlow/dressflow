import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Sparkles, MapPin, ChevronRight, Plus, Search, Sun, Loader2 } from 'lucide-react';

const DashboardView = ({ 
  items, 
  loading, 
  activeFilter, 
  setActiveFilter, 
  onSelectItem, 
  filteredItems, 
  onAddClick,
  weather,
  weatherLoading,
  onWeatherClick
}) => {
  const filters = ['Tous', 'Mes Hauts', 'Mes Bas', 'Extérieur', 'Robe', 'Sport', 'Soirée'];

  return (
    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1>
        <div onClick={onWeatherClick} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '12px' }}>
          <MapPin size={14} /> {weather?.city || 'Localiser'}
        </div>
      </header>

      <div className="glass-card" onClick={onWeatherClick} style={{ padding: '1.2rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
        {weatherLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={24} color="var(--primary)" /> 
            <div className="subtitle">Localisation...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '18px' }}>
                <Sun size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div>
                <div className="subtitle" style={{ fontSize: '0.85rem' }}>{weather ? weather.description : 'Clique pour localiser'}</div>
              </div>
            </div>
            <ChevronRight size={20} style={{ opacity: 0.3 }} />
          </div>
        )}
      </div>

      <div className="filter-bar">
        {filters.map(f => (
          <motion.button whileTap={{ scale: 0.9 }} key={f} className={`filter-pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>
            {f}
          </motion.button>
        ))}
      </div>

      <LayoutGroup>
        <motion.div layout className="item-grid">
          <AnimatePresence mode="popLayout">
            {filteredItems.map(item => (
              <motion.div key={item.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} whileTap={{ scale: 0.95 }} className="item-card" onClick={() => onSelectItem(item)}>
                <div className="item-image">
                  {item.image_url ? <img src={item.image_url} alt={item.type} /> : <div style={{ fontSize: '3rem' }}>{item.icon}</div>}
                </div>
                <div className="item-info">
                  <div className="item-type">{item.type}</div>
                  <div className="item-meta">{item.color}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </motion.div>
  );
};

export default DashboardView;
