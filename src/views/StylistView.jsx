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

              {/* PLANCHE VERTICALE LOOKBOOK FAÇON WHERING */}
              <div style={{
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '28px',
                padding: '1.2rem 1rem',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.8rem',
                  position: 'relative'
                }}>
                  {/* COUCHE EXTÉRIEURE / VESTE (si présente) */}
                  {currentOutfit.layer && (
                    <div style={{ position: 'relative', width: '65%', maxWidth: '220px', zIndex: 3 }}>
                      <div style={{
                        aspectRatio: '1.1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {currentOutfit.layer.image_url ? (
                          <img
                            src={currentOutfit.layer.image_url}
                            alt={currentOutfit.layer.type}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.12))'
                            }}
                            onError={() => onImageError?.(currentOutfit.layer)}
                          />
                        ) : (
                          <span style={{ fontSize: '3.5rem' }}>{currentOutfit.layer.icon || '🧥'}</span>
                        )}
                      </div>
                      {/* Cadenas */}
                      <button
                        type="button"
                        aria-label="Verrouiller veste"
                        onClick={() => {
                          const isLocked = lockedOutfit?.layer != null && String(lockedOutfit.layer) === String(currentOutfit.layer.id);
                          setLockedOutfit({ ...lockedOutfit, layer: isLocked ? null : currentOutfit.layer.id });
                        }}
                        style={{
                          position: 'absolute', top: '0', right: '0',
                          background: (lockedOutfit?.layer && String(lockedOutfit.layer) === String(currentOutfit.layer.id)) ? 'var(--primary)' : 'rgba(255,255,255,0.95)',
                          border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: (lockedOutfit?.layer && String(lockedOutfit.layer) === String(currentOutfit.layer.id)) ? 'white' : 'var(--primary)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer'
                        }}
                      >
                        {(lockedOutfit?.layer && String(lockedOutfit.layer) === String(currentOutfit.layer.id)) ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  )}

                  {/* HAUT / ROBE (Pièce maîtresse) */}
                  {currentOutfit.top && (
                    <div style={{ position: 'relative', width: '65%', maxWidth: '220px', zIndex: 2 }}>
                      <div style={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {currentOutfit.top.image_url ? (
                          <img
                            src={currentOutfit.top.image_url}
                            alt={currentOutfit.top.type}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.12))'
                            }}
                            onError={() => onImageError?.(currentOutfit.top)}
                          />
                        ) : (
                          <span style={{ fontSize: '4rem' }}>{currentOutfit.top.icon || '👕'}</span>
                        )}
                      </div>
                      {/* Cadenas */}
                      <button
                        type="button"
                        aria-label="Verrouiller haut"
                        onClick={() => {
                          const isLocked = lockedOutfit?.top != null && String(lockedOutfit.top) === String(currentOutfit.top.id);
                          setLockedOutfit({ ...lockedOutfit, top: isLocked ? null : currentOutfit.top.id });
                        }}
                        style={{
                          position: 'absolute', top: '0', right: '0',
                          background: (lockedOutfit?.top && String(lockedOutfit.top) === String(currentOutfit.top.id)) ? 'var(--primary)' : 'rgba(255,255,255,0.95)',
                          border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: (lockedOutfit?.top && String(lockedOutfit.top) === String(currentOutfit.top.id)) ? 'white' : 'var(--primary)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer'
                        }}
                      >
                        {(lockedOutfit?.top && String(lockedOutfit.top) === String(currentOutfit.top.id)) ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  )}

                  {/* BAS (Pantalon, jean, jupe) */}
                  {currentOutfit.bottom && (
                    <div style={{ position: 'relative', width: '58%', maxWidth: '190px', zIndex: 1, marginTop: '-15px' }}>
                      <div style={{
                        aspectRatio: '1.05',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {currentOutfit.bottom.image_url ? (
                          <img
                            src={currentOutfit.bottom.image_url}
                            alt={currentOutfit.bottom.type}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.12))'
                            }}
                            onError={() => onImageError?.(currentOutfit.bottom)}
                          />
                        ) : (
                          <span style={{ fontSize: '3.8rem' }}>{currentOutfit.bottom.icon || '👖'}</span>
                        )}
                      </div>
                      {/* Cadenas */}
                      <button
                        type="button"
                        aria-label="Verrouiller bas"
                        onClick={() => {
                          const isLocked = lockedOutfit?.bottom != null && String(lockedOutfit.bottom) === String(currentOutfit.bottom.id);
                          setLockedOutfit({ ...lockedOutfit, bottom: isLocked ? null : currentOutfit.bottom.id });
                        }}
                        style={{
                          position: 'absolute', top: '0', right: '0',
                          background: (lockedOutfit?.bottom && String(lockedOutfit.bottom) === String(currentOutfit.bottom.id)) ? 'var(--primary)' : 'rgba(255,255,255,0.95)',
                          border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: (lockedOutfit?.bottom && String(lockedOutfit.bottom) === String(currentOutfit.bottom.id)) ? 'white' : 'var(--primary)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer'
                        }}
                      >
                        {(lockedOutfit?.bottom && String(lockedOutfit.bottom) === String(currentOutfit.bottom.id)) ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  )}

                  {/* CHAUSSURES (En bas) */}
                  {currentOutfit.feet && (
                    <div style={{ position: 'relative', width: '48%', maxWidth: '160px', marginTop: '-10px' }}>
                      <div style={{
                        aspectRatio: '1.2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {currentOutfit.feet.image_url ? (
                          <img
                            src={currentOutfit.feet.image_url}
                            alt={currentOutfit.feet.type}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.12))'
                            }}
                            onError={() => onImageError?.(currentOutfit.feet)}
                          />
                        ) : (
                          <span style={{ fontSize: '3rem' }}>{currentOutfit.feet.icon || '👟'}</span>
                        )}
                      </div>
                      {/* Cadenas */}
                      <button
                        type="button"
                        aria-label="Verrouiller chaussures"
                        onClick={() => {
                          const isLocked = lockedOutfit?.feet != null && String(lockedOutfit.feet) === String(currentOutfit.feet.id);
                          setLockedOutfit({ ...lockedOutfit, feet: isLocked ? null : currentOutfit.feet.id });
                        }}
                        style={{
                          position: 'absolute', top: '0', right: '0',
                          background: (lockedOutfit?.feet && String(lockedOutfit.feet) === String(currentOutfit.feet.id)) ? 'var(--primary)' : 'rgba(255,255,255,0.95)',
                          border: 'none', borderRadius: '50%', width: '30px', height: '30px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: (lockedOutfit?.feet && String(lockedOutfit.feet) === String(currentOutfit.feet.id)) ? 'white' : 'var(--primary)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer'
                        }}
                      >
                        {(lockedOutfit?.feet && String(lockedOutfit.feet) === String(currentOutfit.feet.id)) ? <Lock size={13} /> : <Unlock size={13} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* PUCE DÉTAILS DE LA PLANCHE */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  justifyContent: 'center',
                  marginTop: '1.2rem',
                  paddingTop: '0.8rem',
                  borderTop: '1px solid rgba(0,0,0,0.06)'
                }}>
                  {visibleParts.map(({ key, label }) => {
                    const item = currentOutfit[key];
                    return (
                      <span
                        key={key}
                        style={{
                          background: 'white',
                          padding: '5px 10px',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ opacity: 0.5 }}>{label}:</span>
                        <span>{item.type}</span>
                        {item.color && <span style={{ opacity: 0.6 }}>• {item.color}</span>}
                      </span>
                    );
                  })}
                </div>
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
