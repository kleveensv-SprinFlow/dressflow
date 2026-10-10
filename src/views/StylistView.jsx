import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, RefreshCw, Check, Lock, Unlock, Sparkles } from 'lucide-react';
import { SlotMachine, CategorySlider } from '../components/UIElements';

const OUTFIT_PARTS = [
  { key: 'top', label: 'Haut' },
  { key: 'bottom', label: 'Bas' },
  { key: 'layer', label: 'Couche extérieure' },
  { key: 'feet', label: 'Chaussures' },
  { key: 'head', label: 'Accessoire' }
];

const StylistView = ({
  stylistMode,
  setStylistMode,
  currentOutfit,
  outfitLoading,
  handleGenerateOutfitRequest,
  handleValidateOutfit,
  manualItems,
  manualOutfit,
  setManualOutfit,
  loading,
  lockedOutfit,
  setLockedOutfit
}) => {
  const visibleParts = currentOutfit
    ? OUTFIT_PARTS.filter(({ key }) => currentOutfit[key])
    : [];

  return (
    <div className="dashboard-container" style={{ paddingBottom: '120px' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 className="title">Styliste Dressflow</h1>
        <p className="subtitle">Des règles de couleur, de météo et de rotation appliquées à ton dressing.</p>
      </header>

      <section className="glass-card" aria-label="Repères de mode et associations de couleurs" style={{ padding: '1.1rem', marginBottom: '1.5rem' }}>
        <h2 className="title" style={{ fontSize: '1.15rem', letterSpacing: '-0.3px', marginBottom: '0.5rem' }}>Les bases des couleurs</h2>
        <p className="subtitle" style={{ fontSize: '0.78rem', lineHeight: 1.5, marginTop: 0, marginBottom: '0.9rem' }}>
          Dressflow privilégie les associations cohérentes, sans interdire un contraste que tu aimes.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.7rem' }}>
          <div style={{ background: 'rgba(148,163,184,0.12)', borderRadius: '14px', padding: '0.75rem' }}>
            <strong style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Neutres + accent</strong>
            <span style={{ fontSize: '0.72rem', lineHeight: 1.45 }}>Noir, beige, gris ou marine équilibrent une couleur plus vive.</span>
          </div>
          <div style={{ background: 'rgba(148,163,184,0.12)', borderRadius: '14px', padding: '0.75rem' }}>
            <strong style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Ton sur ton</strong>
            <span style={{ fontSize: '0.72rem', lineHeight: 1.45 }}>Plusieurs nuances d’une même famille donnent un rendu continu.</span>
          </div>
          <div style={{ background: 'rgba(148,163,184,0.12)', borderRadius: '14px', padding: '0.75rem' }}>
            <strong style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Couleurs proches</strong>
            <span style={{ fontSize: '0.72rem', lineHeight: 1.45 }}>Des teintes voisines créent une harmonie douce.</span>
          </div>
          <div style={{ background: 'rgba(148,163,184,0.12)', borderRadius: '14px', padding: '0.75rem' }}>
            <strong style={{ display: 'block', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Contraste complémentaire</strong>
            <span style={{ fontSize: '0.72rem', lineHeight: 1.45 }}>Des couleurs opposées attirent l’œil ; garde une teinte dominante.</span>
          </div>
        </div>
        <p className="subtitle" style={{ fontSize: '0.7rem', lineHeight: 1.4, marginBottom: 0 }}>
          Ce sont des repères visuels : coupe, motifs, matière, occasion et préférence personnelle comptent aussi. La photo seule ne permet pas toujours de détecter fidèlement une couleur.
        </p>
      </section>

      <div className="filter-scroll" style={{ marginBottom: '1.5rem' }} role="group" aria-label="Mode de composition">
        <button className={`filter-pill ${stylistMode === 'ai' ? 'active' : ''}`} onClick={() => setStylistMode('ai')}>
          Composition guidée
        </button>
        <button className={`filter-pill ${stylistMode === 'manual' ? 'active' : ''}`} onClick={() => setStylistMode('manual')}>
          Mode manuel
        </button>
      </div>

      {stylistMode === 'ai' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {currentOutfit ? (
            <motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 800 }}>
                  <Sparkles size={18} />
                  <span>Pourquoi ce look fonctionne</span>
                </div>
                <p className="subtitle" style={{ margin: 0, lineHeight: 1.55 }}>
                  {currentOutfit.explanation || 'La composition tient compte des pièces disponibles et de leurs couleurs. Vérifie qu’elle correspond à ton style.'}
                </p>
                {Number.isFinite(currentOutfit.color_harmony) && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.7 }}>
                    Indice de cohérence des couleurs : {currentOutfit.color_harmony}/100
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
                          ? <img src={item.image_url} alt={item.type || label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                  <RefreshCw size={18} className={outfitLoading ? 'animate-spin' : ''} /> Changer le look
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} className="btn-primary" style={{ flex: 1 }} onClick={handleValidateOutfit} disabled={loading}>
                  <Check size={18} /> Porter ce look
                </motion.button>
              </div>
              <p className="subtitle" style={{ fontSize: '0.75rem', margin: 0 }}>
                Verrouille une pièce avant de changer le look pour la conserver. Les règles de couleur sont des repères, pas des interdictions.
              </p>
            </motion.div>
          ) : outfitLoading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center' }}>
              <SlotMachine />
              <h2 className="title" style={{ marginTop: '1.5rem' }}>Composition du look…</h2>
              <p className="subtitle">Vérification des couleurs et de la météo.</p>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Wand2 size={30} />
              </div>
              <h2 className="title" style={{ fontSize: '1.35rem' }}>Composer une tenue</h2>
              <p className="subtitle" style={{ lineHeight: 1.55 }}>
                Dressflow cherche une base cohérente, vérifie les associations de couleurs, tient compte de la température et évite de proposer toujours les mêmes pièces.
              </p>
              <motion.button whileTap={{ scale: 0.97 }} className="btn-primary" onClick={handleGenerateOutfitRequest} disabled={outfitLoading}>
                <Wand2 size={19} /> Composer mon look
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
