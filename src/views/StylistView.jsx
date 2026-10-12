import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Check, Sparkles, X, Pin
} from 'lucide-react';
import { SlotMachine } from '../components/UIElements';

const SILHOUETTE_SLOTS = [
  { key: 'head', label: 'Tête', category: 'Chapeau', defaultIcon: '🧢' },
  { key: 'layer', label: 'Veste / Couche', category: 'Haut', defaultIcon: '🧥', optional: true },
  { key: 'top', label: 'Haut / Robe', category: 'Haut', defaultIcon: '👕' },
  { key: 'bottom', label: 'Bas', category: 'Bas', defaultIcon: '👖' },
  { key: 'feet', label: 'Chaussures', category: 'Chaussures', defaultIcon: '👟' },
  { key: 'bag', label: 'Sac & Accessoires', category: 'Accessoires', defaultIcon: '👜', optional: true }
];

// Hauteur fixe sur la silhouette, en pixels. La photo ne décide plus de la taille :
// deux t-shirts font la même hauteur, un pantalon est plus long, des baskets restent petites.
const GARMENT_HEIGHT = {
  'Casquette': 78,
  'Bonnet': 82,
  'Chapeau': 92,
  'Bob': 78,
  'T-shirt': 188,
  'Top / Blouse': 180,
  'Chemise': 204,
  'Pull': 196,
  'Sweat': 198,
  'Veste': 206,
  'Manteau': 228,
  'Robe': 280,
  'Pantalon': 214,
  'Jean': 214,
  'Jogging': 206,
  'Legging': 206,
  'Short': 146,
  'Jupe': 168,
  'Baskets': 88,
  'Ville': 88,
  'Sandales': 78,
  'Talons': 94,
  'Bottes': 128,
  'Sac': 140
};

const SLOT_HEIGHT = { head: 86, layer: 206, top: 188, bottom: 214, feet: 88, bag: 140 };
const TALLEST = 280;

function garmentHeight(item, slot) {
  if (item?.type && GARMENT_HEIGHT[item.type]) return GARMENT_HEIGHT[item.type];
  return SLOT_HEIGHT[slot?.key] || 188;
}

export default function StylistView({
  stylistMode,
  setStylistMode,
  selectedActivity,
  setSelectedActivity,
  currentOutfit,
  setCurrentOutfit,
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
}) {
  // Modal / Tiroir de sélection rapide pour une pièce
  const [activePickerSlot, setActivePickerSlot] = useState(null);

  // Pool de pièces disponibles pour un slot donné
  const getSlotPool = (slotKey) => {
    if (!manualItems) return [];
    if (slotKey === 'head') return manualItems.head || [];
    if (slotKey === 'layer') return manualItems.layer || [];
    if (slotKey === 'top') return manualItems.top || [];
    if (slotKey === 'bottom') return manualItems.bottom || [];
    if (slotKey === 'feet') return manualItems.feet || [];
    if (slotKey === 'bag') return manualItems.bag || [];
    return [];
  };

  // Pièce actuellement active pour un slot
  const getActiveItem = (slotKey) => {
    if (stylistMode === 'ai' && currentOutfit) {
      return currentOutfit[slotKey] || null;
    }
    const id = manualOutfit?.[slotKey];
    if (!id) return null;
    const pool = getSlotPool(slotKey);
    return pool.find(item => item.id === id) || null;
  };

  // Remplacer la pièce dans la tenue active (IA ou manuelle)
  const setSlotItem = (slotKey, item) => {
    const itemId = item ? item.id : null;
    if (stylistMode === 'ai') {
      if (setCurrentOutfit && currentOutfit) {
        setCurrentOutfit({
          ...currentOutfit,
          [slotKey]: item || null
        });
      }
    }
    if (setManualOutfit) {
      setManualOutfit(prev => ({
        ...prev,
        [slotKey]: itemId
      }));
    }
  };

  // Navigation carrousel (flèches ou swipe gauche/droite)
  const stepSlotItem = (slotKey, direction, e) => {
    e?.stopPropagation();
    const pool = getSlotPool(slotKey);
    if (!pool.length) return;
    const current = getActiveItem(slotKey);
    const currentIndex = current ? pool.findIndex(i => i.id === current.id) : -1;
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % pool.length;
    } else {
      nextIndex = (currentIndex - 1 + pool.length) % pool.length;
    }
    setSlotItem(slotKey, pool[nextIndex]);
  };

  // Vérifier si un slot est verrouillé pour la prochaine génération IA
  const isSlotLocked = (slotKey) => {
    const item = getActiveItem(slotKey);
    if (!item) return false;
    return lockedOutfit?.[slotKey] != null && String(lockedOutfit[slotKey]) === String(item.id);
  };

  const toggleLock = (slotKey, e) => {
    e?.stopPropagation();
    const item = getActiveItem(slotKey);
    if (!item || !setLockedOutfit) return;
    const isLocked = isSlotLocked(slotKey);
    setLockedOutfit({
      ...lockedOutfit,
      [slotKey]: isLocked ? null : item.id
    });
  };

  const activePickerPool = activePickerSlot ? getSlotPool(activePickerSlot.key) : [];

  return (
    <div className="dashboard-container" style={{ paddingBottom: '130px' }}>
      {/* Header boutique feutré */}
      <header style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
        <h1 className="title" style={{ fontSize: '2.6rem' }}>Habille-moi</h1>
        <p className="subtitle" style={{ fontSize: '0.86rem', marginTop: '6px' }}>
          Glisse une rangée. Épingle pour garder.
        </p>
      </header>

      {outfitLoading ? (
        <div style={{ padding: '3.5rem 0', textAlign: 'center' }}>
          <SlotMachine />
          <h2 className="title" style={{ marginTop: '1.5rem', fontSize: '1.3rem' }}>Harmonisation de la silhouette…</h2>
          <p className="subtitle" style={{ fontSize: '0.85rem' }}>Sélection des pièces et accords des couleurs.</p>
        </div>
      ) : (
        <>
          {/* Rangées façon Whering : la pièce d’avant et la suivante dépassent, sans se chevaucher. */}
          <div style={{ marginBottom: '1rem', overflow: 'hidden' }}>
            {SILHOUETTE_SLOTS.map(slot => {
              const item = getActiveItem(slot.key);
              const pool = getSlotPool(slot.key);
              const locked = isSlotLocked(slot.key);
              if (!item && !pool.length) return null;

              if (!item) {
                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => setActivePickerSlot(slot)}
                    style={{
                      display: 'block',
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    + {slot.label}
                  </button>
                );
              }

              const index = Math.max(0, pool.findIndex(piece => piece.id === item.id));
              const prev = pool.length > 1 ? pool[(index - 1 + pool.length) % pool.length] : null;
              const next = pool.length > 1 ? pool[(index + 1) % pool.length] : null;
              const height = garmentHeight(item, slot);

              const figure = (piece, faded) => {
                if (!piece) return <span />;
                const h = faded ? Math.round(height * 0.72) : height;
                if (!piece.image_url) {
                  return <span style={{ fontSize: faded ? '1.5rem' : '2.2rem', opacity: faded ? 0.35 : 1 }}>{piece.icon || slot.defaultIcon}</span>;
                }
                return (
                  <img
                    src={piece.image_url}
                    alt={piece.type || slot.label}
                    draggable={false}
                    style={{
                      height: h,
                      width: 'auto',
                      maxWidth: faded ? 120 : 240,
                      objectFit: 'contain',
                      opacity: faded ? 0.4 : 1,
                      filter: faded ? 'none' : 'drop-shadow(0 8px 12px rgba(45, 38, 35, 0.12))',
                      pointerEvents: 'none'
                    }}
                    onError={() => onImageError?.(piece)}
                  />
                );
              };

              return (
                <motion.div
                  key={slot.key}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.16}
                  onDragEnd={(e, info) => {
                    if (info.offset.x > 36) stepSlotItem(slot.key, 'prev');
                    else if (info.offset.x < -36) stepSlotItem(slot.key, 'next');
                  }}
                  style={{
                    height,
                    marginBottom: 4,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    cursor: 'grab',
                    touchAction: 'pan-y'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 10, minWidth: 0 }}>
                    {figure(prev, true)}
                  </div>
                  <div
                    style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
                    onClick={() => { if (pool.length) setActivePickerSlot(slot); }}
                  >
                    {figure(item, false)}
                    <button
                      type="button"
                      aria-label={locked ? 'Désépingler' : 'Épingler'}
                      onClick={(e) => toggleLock(slot.key, e)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: -4,
                        width: 26,
                        height: 26,
                        border: 'none',
                        borderRadius: '50%',
                        background: locked ? 'var(--accent)' : 'transparent',
                        color: locked ? '#f3f0ea' : '#8a847c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                    >
                      <Pin size={14} fill={locked ? '#f3f0ea' : 'none'} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 10, minWidth: 0 }}>
                    {figure(next, true)}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bouton de validation du look */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleGenerateOutfitRequest}
              disabled={outfitLoading}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--text-muted)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontSize: '0.68rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {currentOutfit ? 'Autre tenue' : 'Composer une tenue'}
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="btn-primary"
              style={{ width: '100%', borderRadius: 0 }}
              onClick={handleValidateOutfit}
              disabled={loading}
            >
              <span>Je porte cette tenue</span>
            </motion.button>
          </div>
        </>
      )}

      {/* TIROIR MODAL (BOTTOM SHEET) : SÉLECTION RAPIDE DE TOUTES LES PIÈCES DE LA CATÉGORIE */}
      <AnimatePresence>
        {activePickerSlot && (
          <div
            className="modal-overlay"
            onClick={() => setActivePickerSlot(null)}
            style={{ zIndex: 1200, alignItems: 'flex-end', padding: 0 }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxHeight: '75vh',
                background: '#ffffff',
                borderTopLeftRadius: '30px',
                borderTopRightRadius: '30px',
                padding: '1.5rem 1.25rem 2.5rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -10px 40px rgba(45, 38, 35, 0.12)'
              }}
            >
              {/* Header du tiroir */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <div>
                  <h3 className="title" style={{ fontSize: '1.3rem', margin: 0 }}>
                    Choisir : {activePickerSlot.label}
                  </h3>
                  <span className="subtitle" style={{ fontSize: '0.78rem', margin: 0 }}>
                    {activePickerPool.length} pièce{activePickerPool.length > 1 ? 's' : ''} disponible{activePickerPool.length > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setActivePickerSlot(null)}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Bouton pour retirer la pièce si optionnel */}
              {activePickerSlot.optional && (
                <button
                  type="button"
                  onClick={() => {
                    setSlotItem(activePickerSlot.key, null);
                    setActivePickerSlot(null);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '14px',
                    border: '1px solid rgba(220, 212, 200, 0.6)',
                    background: '#faf7f2',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  Ne pas porter de {activePickerSlot.label.toLowerCase()}
                </button>
              )}

              {/* Grille des pièces de la catégorie */}
              <div style={{
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                paddingBottom: '1rem'
              }}>
                {activePickerPool.map(piece => {
                  const isCurrent = getActiveItem(activePickerSlot.key)?.id === piece.id;
                  return (
                    <motion.button
                      key={piece.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSlotItem(activePickerSlot.key, piece);
                        setActivePickerSlot(null);
                      }}
                      style={{
                        borderRadius: '20px',
                        border: isCurrent ? '2px solid var(--primary)' : '1px solid rgba(220, 212, 200, 0.5)',
                        background: isCurrent ? 'rgba(45, 38, 35, 0.04)' : '#faf7f2',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      {piece.image_url ? (
                        <span style={{ height: 96, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <img
                            src={piece.image_url}
                            alt={piece.type}
                            style={{
                              height: Math.max(34, Math.round((garmentHeight(piece, activePickerSlot) / TALLEST) * 96)),
                              width: 'auto',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 4px 8px rgba(45, 38, 35, 0.08))'
                            }}
                            onError={() => onImageError?.(piece)}
                          />
                        </span>
                      ) : (
                        <span style={{ fontSize: '2rem' }}>{piece.icon || '👕'}</span>
                      )}
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        marginTop: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        {piece.type}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
