import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  MapPin, ChevronRight, Sun, CloudRain, CloudSun, Loader2, Plus, Sparkles, Tag, Shirt
} from 'lucide-react';
import { groupWornOutfits, formatWornAt } from '../utils/wornHistory';
import { getWeatherTip } from '../services/weather';

const DashboardView = ({
  items,
  loading,
  name,
  activeFilter,
  setActiveFilter,
  onSelectItem,
  filteredItems,
  onAddClick,
  onAddCategory,
  onAddDemoItems,
  weather,
  weatherLoading,
  onWeatherClick,
  onImageError
}) => {
  const filters = ['Tous', 'Mes Hauts', 'Mes Bas', 'Extérieur', 'Robe', 'Sport', 'Soirée'];
  const outfits = groupWornOutfits(items, { limit: 4 });
  const latestOutfit = outfits[0];
  const olderOutfits = outfits.slice(1);
  const weatherTip = weather ? getWeatherTip(weather.temp, weather.code) : null;

  return (
    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
      {/* 1. HEADER ACCUEIL HUMAIN */}
      <header className="dashboard-header">
        <div>
          <h1 className="title" style={{ fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
            {name ? `Bonjour, ${name} 👋` : 'Mon Dressing ✨'}
          </h1>
          <p className="subtitle" style={{ fontSize: '0.88rem', marginTop: '2px' }}>
            {items.length === 0
              ? 'Prêt(e) à composer ta garde-robe ?'
              : `${items.length} pièce${items.length > 1 ? 's' : ''} dans ton dressing`}
          </p>
        </div>
        {weather?.city && (
          <button
            type="button"
            onClick={onWeatherClick}
            className="weather-city-badge"
            aria-label="Changer la ville météo"
          >
            <MapPin size={13} />
            <span>{weather.city}</span>
          </button>
        )}
      </header>

      {/* 2. HEADER MÉTÉO DISCRET & ÉLÉGANT SOUS LE TITRE */}
      <div style={{ marginBottom: '1.25rem' }}>
        {weatherLoading ? (
          <div className="weather-pill-compact" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" size={14} color="var(--primary)" />
            <span>Météo en cours…</span>
          </div>
        ) : weather ? (
          <button
            type="button"
            onClick={onWeatherClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 15px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              transition: 'all 0.2s ease'
            }}
          >
            <MapPin size={13} color="var(--primary)" />
            <span>{weather.city || 'Position'}</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span>{weather.temp}°C</span>
            <span>
              {weather.code && [51, 58, 61, 63, 80, 95].includes(weather.code) ? '🌧️' : weather.code && [1, 2, 3].includes(weather.code) ? '🌤️' : '☀️'}
            </span>
            <span style={{ opacity: 0.6, fontWeight: 500 }}>{weather.description}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onWeatherClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 15px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px dashed rgba(var(--primary-rgb), 0.4)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--primary)'
            }}
          >
            <MapPin size={13} />
            <span>Définir ma ville pour adapter mes tenues 🌤️</span>
          </button>
        )}
      </div>

      {/* 3. HISTORIQUE DES TENUES PORTÉES (si présent) */}
      {latestOutfit && (
        <section aria-label="Tenues portées" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.65rem' }}>
            <h2 className="title" style={{ fontSize: '1.05rem', margin: 0 }}>Dernière tenue</h2>
            <span className="subtitle" style={{ margin: 0, fontSize: '0.78rem' }}>{formatWornAt(latestOutfit.at)}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.55rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
            {latestOutfit.items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                aria-label={`${item.type}, porté le ${formatWornAt(latestOutfit.at)}`}
                style={{ flex: '0 0 84px', width: '84px', border: 'none', background: 'white', borderRadius: '16px', padding: '6px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
              >
                <div style={{ height: '72px', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => onImageError?.(item)} />
                    : <span style={{ fontSize: '1.6rem' }}>{item.icon || '👕'}</span>}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.type}</div>
              </button>
            ))}
          </div>
          {olderOutfits.map(outfit => (
            <div key={outfit.key} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginTop: '0.7rem' }}>
              <span className="subtitle" style={{ margin: 0, width: '4.2rem', flex: '0 0 auto', fontSize: '0.75rem' }}>{formatWornAt(outfit.at)}</span>
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
                {outfit.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    aria-label={`${item.type}, porté le ${formatWornAt(outfit.at)}`}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', background: 'white', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                  >
                    {item.image_url
                      ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => onImageError?.(item)} />
                      : <span style={{ fontSize: '1rem' }}>{item.icon || '👕'}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 4. ÉTAT DRESSING VIDE : PENDERIE INTERACTIVE (CASIERS 2X2 MODERNES) */}
      {items.length === 0 ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '140px' }}>
          {/* TITRE & SOUS-TITRE ÉPURÉ */}
          <div>
            <h2 className="title" style={{ fontSize: '1.35rem', letterSpacing: '-0.3px', margin: 0 }}>
              Compose ta première tenue
            </h2>
            <p className="subtitle" style={{ fontSize: '0.82rem', marginTop: '4px', marginBottom: 0 }}>
              Touche un cintre pour ajouter une pièce et débloquer les tenues du jour.
            </p>
          </div>

          {/* GRILLE 2X2 DE CASIERS / CINTRES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { category: 'Haut', defaultType: 'T-shirt', label: 'Haut', desc: 'T-shirt, chemise, pull', icon: '👕', badge: '1' },
              { category: 'Bas', defaultType: 'Jean', label: 'Bas', desc: 'Jean, pantalon, short', icon: '👖', badge: '2' },
              { category: 'Haut', defaultType: 'Veste', label: 'Veste / Manteau', desc: 'Couche météo', icon: '🧥', badge: '3' },
              { category: 'Chaussures', defaultType: 'Baskets', label: 'Chaussures', desc: 'Baskets, bottes', icon: '👟', badge: '4' }
            ].map((slot, idx) => (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onAddCategory ? onAddCategory(slot.category, slot.defaultType) : onAddClick()}
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1.5px dashed rgba(var(--primary-rgb), 0.25)',
                  borderRadius: '22px',
                  padding: '1.25rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '10px',
                  background: 'rgba(var(--primary-rgb), 0.08)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.72rem'
                }}>
                  <Plus size={15} />
                </div>

                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.06), rgba(var(--primary-rgb), 0.14))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  marginBottom: '10px'
                }}>
                  {slot.icon}
                </div>

                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2px' }}>
                  {slot.label}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  {slot.desc}
                </span>
              </motion.button>
            ))}
          </div>

          {/* BOUTON DÉMO DISCRET ET NON INTRUSIF */}
          {onAddDemoItems && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={onAddDemoItems}
              disabled={loading}
              style={{
                marginTop: '0.4rem',
                padding: '14px',
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.84rem'
              }}
            >
              <Sparkles size={16} />
              <span>Remplir avec 4 vêtements démo pour tester</span>
            </motion.button>
          )}
        </section>
      ) : (
        <>
          {/* 5. BARRE DE FILTRES (visible uniquement s'il y a des vêtements) */}
          <div className="filter-bar" role="group" aria-label="Filtrer le dressing">
            {filters.map(filter => (
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                key={filter}
                className={`filter-pill ${activeFilter === filter ? 'active' : ''}`}
                aria-pressed={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </motion.button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="glass-card" style={{ padding: '2.5rem 1.25rem', textAlign: 'center', marginTop: '1.5rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Shirt size={26} />
              </div>
              <h2 className="title" style={{ fontSize: '1.2rem' }}>Aucune pièce dans ce filtre</h2>
              <p className="subtitle" style={{ lineHeight: 1.5, fontSize: '0.88rem' }}>
                Change de filtre ou ajoute un vêtement dans cette catégorie.
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={() => setActiveFilter('Tous')}
              >
                Voir tout le dressing
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
                          ? <img src={item.image_url} alt={item.type || 'Vêtement'} loading="lazy" onError={() => onImageError?.(item)} />
                          : <div style={{ fontSize: '3rem' }}>{item.icon || '👕'}</div>}
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
        </>
      )}

      {loading && (
        <p className="subtitle" role="status" style={{ textAlign: 'center', marginTop: '1rem' }}>
          Mise à jour du dressing…
        </p>
      )}
    </motion.div>
  );
};

export default DashboardView;
