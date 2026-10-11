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

      {/* 2. CARTE MÉTÉO ÉLÉGANTE ET CONTEXTUELLE */}
      <div className="weather-hero-card">
        {weatherLoading ? (
          <div className="weather-loading-state">
            <Loader2 className="animate-spin" size={22} color="var(--primary)" />
            <span>Actualisation de la météo…</span>
          </div>
        ) : weather ? (
          <div
            className="weather-active-state"
            onClick={onWeatherClick}
            role="button"
            tabIndex={0}
            aria-label={`Météo actuelle : ${weather.temp} degrés, ${weather.description}. Toucher pour changer.`}
          >
            <div className="weather-main-info">
              <div className="weather-icon-bubble">
                {weather.code && [51, 58, 61, 63, 80, 95].includes(weather.code) ? (
                  <CloudRain size={24} />
                ) : weather.code && [1, 2, 3].includes(weather.code) ? (
                  <CloudSun size={24} />
                ) : (
                  <Sun size={24} />
                )}
              </div>
              <div className="weather-text-block">
                <div className="weather-temp-row">
                  <span className="weather-temp">{weather.temp}°C</span>
                  <span className="weather-bullet">•</span>
                  <span className="weather-city">{weather.city || 'Position actuelle'}</span>
                </div>
                <div className="weather-condition">{weather.description}</div>
              </div>
              <ChevronRight size={18} style={{ opacity: 0.35, marginLeft: 'auto' }} />
            </div>
            {weatherTip && (
              <div className="weather-tip-pill">
                <Sparkles size={14} style={{ flexShrink: 0 }} />
                <span>{weatherTip}</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className="weather-empty-state"
            onClick={onWeatherClick}
            role="button"
            tabIndex={0}
            aria-label="Définir ma ville pour la météo"
          >
            <div className="weather-icon-bubble empty">
              <CloudSun size={22} />
            </div>
            <div className="weather-empty-text">
              <div className="weather-empty-title">Météo du jour</div>
              <div className="weather-empty-desc">Choisis ta ville pour adapter tes tenues du jour.</div>
            </div>
            <button
              type="button"
              className="btn-weather-set"
              onClick={(e) => {
                e.stopPropagation();
                onWeatherClick();
              }}
            >
              <MapPin size={13} /> Choisir
            </button>
          </div>
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

      {/* 4. ÉTAT DRESSING VIDE : ONBOARDING GUIDE ACCUEILLANT */}
      {items.length === 0 ? (
        <section className="onboarding-hero-card">
          <div className="onboarding-badge-stack">
            <span className="badge-emoji">👕</span>
            <span className="badge-emoji main">✨</span>
            <span className="badge-emoji">👖</span>
          </div>

          <h2 className="onboarding-title">Ton dressing prend vie ici</h2>
          <p className="onboarding-subtitle">
            Ajoute 2 ou 3 vêtements pour recevoir des suggestions de tenues personnalisées et adaptées à ta météo.
          </p>

          <div className="onboarding-steps">
            <div className="onboarding-step-item">
              <div className="step-num">1</div>
              <div className="step-text">
                <strong>Ajoute tes pièces clés</strong>
                <span>Un haut, un bas, une veste ou des baskets</span>
              </div>
            </div>
            <div className="onboarding-step-item">
              <div className="step-num">2</div>
              <div className="step-text">
                <strong>L'IA styliste harmonise</strong>
                <span>Reconnaissance des couleurs, coupes et styles</span>
              </div>
            </div>
            <div className="onboarding-step-item">
              <div className="step-num">3</div>
              <div className="step-text">
                <strong>Tenues prêtes chaque jour</strong>
                <span>Des associations parfaites générées en 1 clic</span>
              </div>
            </div>
          </div>

          <div className="onboarding-actions">
            <button type="button" className="btn-primary" onClick={onAddClick}>
              <Plus size={20} />
              Ajouter mon premier vêtement
            </button>
            {onAddDemoItems && (
              <button
                type="button"
                className="btn-secondary-onboarding"
                onClick={onAddDemoItems}
                disabled={loading}
              >
                <Sparkles size={16} />
                Essayer avec des pièces démo
              </button>
            )}
          </div>
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
