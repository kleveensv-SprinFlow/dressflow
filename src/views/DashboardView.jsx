import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { MapPin, ChevronRight, Sun, Loader2, Plus } from 'lucide-react';

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
        <h1 className="title" style={{ fontSize: '2.2rem' }}>Dressflow</h1>
        <button type="button" onClick={onWeatherClick} aria-label="Changer la localisation météo" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', background: 'white', padding: '8px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <MapPin size={14} /> {weather?.city || 'Localiser'}
        </button>
      </header>

      <button type="button" className="glass-card" onClick={onWeatherClick} style={{ width: '100%', padding: '1.1rem', marginBottom: '1.5rem', cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(0,0,0,0.04)' }}>
        {weatherLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={24} color="var(--primary)" />
            <div className="subtitle">Mise à jour de la météo…</div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '16px' }}><Sun size={22} /></div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.35rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div>
                <div className="subtitle" style={{ fontSize: '0.85rem' }}>{weather ? weather.description : 'Toucher pour localiser'}</div>
              </div>
            </div>
            <ChevronRight size={20} style={{ opacity: 0.45 }} />
          </div>
        )}
      </button>

      <div className="filter-bar" role="group" aria-label="Filtrer le dressing">
        {filters.map(filter => (
          <motion.button whileTap={{ scale: 0.97 }} type="button" key={filter} className={`filter-pill ${activeFilter === filter ? 'active' : ''}`} aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)}>
            {filter}
          </motion.button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="glass-card" style={{ padding: '2.5rem 1.25rem', textAlign: 'center', marginTop: '1.5rem' }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '18px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Plus size={28} />
          </div>
          <h2 className="title" style={{ fontSize: '1.25rem' }}>{items.length === 0 ? 'Ton dressing commence ici' : 'Aucune pièce dans ce filtre'}</h2>
          <p className="subtitle" style={{ lineHeight: 1.5 }}>
            {items.length === 0 ? 'Ajoute quelques vêtements pour recevoir des associations de couleurs et des idées de tenues adaptées à la météo.' : 'Change de filtre pour retrouver les autres pièces de ton dressing.'}
          </p>
          <button type="button" className="btn-primary" onClick={items.length === 0 ? onAddClick : () => setActiveFilter('Tous')}>
            {items.length === 0 ? 'Ajouter une pièce' : 'Voir tout le dressing'}
          </button>
        </div>
      ) : (
        <LayoutGroup>
          <motion.div layout className="item-grid">
            <AnimatePresence mode="popLayout">
              {filteredItems.map(item => (
                <motion.button
                  type="button"
                  key={item.id}
                  layout
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  whileTap={{ scale: 0.98 }}
                  className="item-card"
                  onClick={() => onSelectItem(item)}
                  aria-label={`Détails de ${item.type}, ${item.color}`}
                  style={{ border: 'none', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
                >
                  <div className="item-image">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.type || 'Vêtement'} loading="lazy" />
                      : <div style={{ fontSize: '3rem' }}>{item.icon}</div>}
                  </div>
                  <div className="item-info">
                    <div className="item-type">{item.type}</div>
                    <div className="item-meta">{item.color}</div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}
      {loading && <p className="subtitle" role="status" style={{ textAlign: 'center', marginTop: '1rem' }}>Mise à jour du dressing…</p>}
    </motion.div>
  );
};

export default DashboardView;
