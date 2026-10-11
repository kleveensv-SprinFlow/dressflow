import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, RefreshCw, Check, Lock, Unlock, Sparkles, Tag, Briefcase, Footprints, Home } from 'lucide-react';
import { SlotMachine, CategorySlider } from '../components/UIElements';

const OUTFIT_PARTS = [
  { key: 'top', label: 'Haut' },
  { key: 'bottom', label: 'Bas' },
  { key: 'layer', label: 'Couche extérieure' },
  { key: 'feet', label: 'Chaussures' },
  { key: 'head', label: 'Accessoire' }
];

const ACTIVITIES = [
  { id: 'Quotidien', label: 'Quotidien', icon: Home },
  { id: 'Travail', label: 'Travail', icon: Briefcase },
  { id: 'Soirée', label: 'Soirée', icon: Sparkles },
  { id: 'Sport', label: 'Sport', icon: Footprints }
];

const StylistView = ({
  stylistMode,
  setStylistMode,
  selectedActivity,
  setSelectedActivity,
  currentOutfit,
  outfitLoading,
  handleGenerateOutfitRequest,
  handleValidateOutfit,
  manualItems,
  manualOutfit,
  setManualOutfit,
  loading,
  lockedOutfit,
  setLockedOutfit,
  onImageError
}) => {
  const visibleParts = currentOutfit
    ? OUTFIT_PARTS.filter(({ key }) => currentOutfit[key])
    : [];

  return (
    <div className="dashboard-container" style={{ paddingBottom: '120px' }}>
      <header style={{ marginBottom: '1.2rem' }}>
        <h1 className="title" style={{ fontSize: '1.8rem', letterSpacing: '-0.5px' }}>Styliste du jour</h1>
        <p className="subtitle" style={{ fontSize: '0.88rem', marginTop: '2px' }}>
          Harmonie des couleurs, adaptation météo et rotation intelligente de ton dressing.
        </p>
      </header>

      {/* SÉLECTEUR DE MODE : ALGORITHME DU JOUR VS MANUEL */}
      <div className="filter-scroll" style={{ marginBottom: '1.2rem' }} role="group" aria-label="Mode de composition">
        <button
          className={`filter-pill ${stylistMode === 'ai' ? 'active' : ''}`}
          onClick={() => setStylistMode('ai')}
        >
          Tenue du jour
        </button>
        <button
          className={`filter-pill ${stylistMode === 'manual' ? 'active' : ''}`}
          onClick={() => setStylistMode('manual')}
        >
          Composition manuelle
        </button>
      </div>

      {stylistMode === 'ai' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* SÉLECTEUR D'OCCASION / ACTIVITÉ */}
          <div style={{ background: 'white', padding: '1rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
              Occasion souhaitée
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
              {ACTIVITIES.map(({ id, label, icon: Icon }) => {
                const active = (selectedActivity || 'Quotidien') === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedActivity?.(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '14px',
                      border: active ? '1px solid var(--primary)' : '1px solid rgba(0,0,0,0.06)',
                      background: active ? 'rgba(var(--primary-rgb), 0.1)' : '#f8fafc',
                      color: active ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {currentOutfit ? (
            <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 800 }}>
                  <Sparkles size={18} />
                  <span>Harmonie de la tenue</span>
                </div>
                <p className="subtitle" style={{ margin: 0, lineHeight: 1.55 }}>
                  {currentOutfit.explanation || 'Composition calculée selon les pièces disponibles, la météo et la palette de couleurs.'}
                </p>
                {Number.isFinite(currentOutfit.color_harmony) && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                    Score d’accord des teintes : {currentOutfit.color_harmony}/100
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.8rem' }}>
                {visibleParts.map(({ key, label }) => {
                  const item = currentOutfit[key];
                  const lockedValue = lockedOutfit?.[key];
                  const lockedId = typeof lockedValue === 'object' ? lockedValue?.id : lockedValue;
                  const isLocked = lockedId != null && String(lockedId) === String(item.id);
                  return (
                    <div key={key} className="glass-card" style={{ padding: '10px', position: 'relative', minWidth: 0 }}>
                      <div style={{ aspectRatio: '1', borderRadius: '15px', overflow: 'hidden', background: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image_url
                          ? <img src={item.image_url} alt={item.type || label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => onImageError?.(item)} />
                          : <span style={{ fontSize: '3rem' }}>{item.icon || '👕'}</span>}
                      </div>
                      <div style={{ fontSize: '0.62rem', opacity: 0.6, textAlign: 'center', marginBottom: '3px' }}>{label}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', overflowWrap: 'anywhere' }}>{item.type}</div>
                      {item.color && <div style={{ fontSize: '0.72rem', textAlign: 'center', opacity: 0.7 }}>{item.color}</div>}
                      <button
                        type="button"
                        aria-label={isLocked ? `Déverrouiller ${item.type}` : `Garder ${item.type} lors du prochain look`}
                        aria-pressed={isLocked}
                        onClick={() => setLockedOutfit({ ...lockedOutfit, [key]: isLocked ? null : item.id })}
                        style={{
                          position: 'absolute', top: '5px', right: '5px',
                          background: isLocked ? 'var(--primary)' : 'rgba(255,255,255,0.92)',
                          border: 'none', borderRadius: '50%', width: '34px', height: '34px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isLocked ? 'white' : 'var(--primary)',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.1)', cursor: 'pointer'
                        }}
                      >
                        {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.97 }} className="btn-secondary" style={{ flex: 1 }} onClick={handleGenerateOutfitRequest} disabled={outfitLoading}>
                  <RefreshCw size={18} className={outfitLoading ? 'animate-spin' : ''} /> Autre tenue
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} className="btn-primary" style={{ flex: 1 }} onClick={handleValidateOutfit} disabled={loading}>
                  <Check size={18} /> Je porte ça !
                </motion.button>
              </div>
              <p className="subtitle" style={{ fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>
                Verrouille une pièce avec le cadenas pour la conserver lors du prochain calcul.
              </p>
            </motion.div>
          ) : outfitLoading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center' }}>
              <SlotMachine />
              <h2 className="title" style={{ marginTop: '1.5rem', fontSize: '1.4rem' }}>Calcul de la tenue…</h2>
              <p className="subtitle">Harmonisation des couleurs, météo et rotation.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Wand2 size={30} />
              </div>
              <h2 className="title" style={{ fontSize: '1.35rem' }}>Composer ma tenue du jour</h2>
              <p className="subtitle" style={{ lineHeight: 1.55 }}>
                L’algorithme sélectionne une base équilibrée, calcule l’harmonie des teintes selon le cercle chromatique, applique les couches selon la météo et privilégie les pièces peu portées.
              </p>
              <motion.button whileTap={{ scale: 0.97 }} className="btn-primary" onClick={handleGenerateOutfitRequest} disabled={outfitLoading}>
                <Wand2 size={19} /> Composer ma tenue
              </motion.button>
            </div>
          )}
        </motion.div>
      ) : (
        <div style={{ marginTop: '1rem', paddingBottom: '3rem' }}>
          <CategorySlider title="Tête" items={manualItems.head} selectedId={manualOutfit.head} onSelect={(id) => setManualOutfit({ ...manualOutfit, head: id })} />
          <CategorySlider title="Haut" items={manualItems.top} selectedId={manualOutfit.top} onSelect={(id) => setManualOutfit({ ...manualOutfit, top: id })} />
          <CategorySlider title="Couche extérieure" items={manualItems.layer} selectedId={manualOutfit.layer} onSelect={(id) => setManualOutfit({ ...manualOutfit, layer: id })} />
          <CategorySlider title="Bas" items={manualItems.bottom} selectedId={manualOutfit.bottom} onSelect={(id) => setManualOutfit({ ...manualOutfit, bottom: id })} />
          <CategorySlider title="Chaussures" items={manualItems.feet} selectedId={manualOutfit.feet} onSelect={(id) => setManualOutfit({ ...manualOutfit, feet: id })} />
          <CategorySlider title="Sac" items={manualItems.bag} selectedId={manualOutfit.bag} onSelect={(id) => setManualOutfit({ ...manualOutfit, bag: id })} />
          <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 100 }}>
            <motion.button whileTap={{ scale: 0.97 }} className="btn-primary" onClick={handleValidateOutfit} disabled={loading} style={{ boxShadow: '0 8px 22px rgba(0,0,0,0.12)' }}>
              <Check size={18} /> Valider ce look
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StylistView;
