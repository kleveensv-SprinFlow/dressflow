import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, RefreshCw, Check, Lock, Unlock, Sparkles, ChevronLeft, ChevronRight, X, Layers
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
        <h1 className="title" style={{ fontSize: '1.85rem', letterSpacing: '-0.5px' }}>Silhouette & Look</h1>
        <p className="subtitle" style={{ fontSize: '0.86rem', marginTop: '4px' }}>
          Touche une pièce pour la changer ou glisse pour faire défiler ta penderie.
        </p>
      </header>

      {/* Bouton composer / régénérer au-dessus */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.2rem' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn-primary"
          style={{ flex: 1, padding: '0.9rem', fontSize: '0.9rem', borderRadius: '18px' }}
          onClick={handleGenerateOutfitRequest}
          disabled={outfitLoading}
        >
          {outfitLoading ? (
            <RefreshCw size={17} className="animate-spin" />
          ) : (
            <Sparkles size={17} />
          )}
          <span>{currentOutfit ? 'Autre suggestion IA' : 'Composer une tenue'}</span>
        </motion.button>
      </div>

      {outfitLoading ? (
        <div style={{ padding: '3.5rem 0', textAlign: 'center' }}>
          <SlotMachine />
          <h2 className="title" style={{ marginTop: '1.5rem', fontSize: '1.3rem' }}>Harmonisation de la silhouette…</h2>
          <p className="subtitle" style={{ fontSize: '0.85rem' }}>Sélection des pièces et accords des couleurs.</p>
        </div>
      ) : (
        <>
          {/* SILHOUETTE LOOKBOOK : DE LA TÊTE AUX PIEDS */}
          <div style={{
            background: 'radial-gradient(circle at center, #ffffff 50%, #f6f2ea 100%)',
            borderRadius: '32px',
            padding: '1.5rem 1rem',
            border: '1px solid rgba(220, 212, 200, 0.5)',
            boxShadow: '0 8px 30px rgba(45, 38, 35, 0.05)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '1.5rem'
          }}>
            {SILHOUETTE_SLOTS.map(slot => {
              const item = getActiveItem(slot.key);
              const pool = getSlotPool(slot.key);
              const hasOptions = pool.length > 1;
              const locked = isSlotLocked(slot.key);

              // Si le slot est optionnel (veste, sac) et qu'il n'y a pas de pièce, on affiche une carte d'ajout discrète
              if (!item && slot.optional && !pool.length) return null;

              return (
                <div
                  key={slot.key}
                  style={{
                    position: 'relative',
                    width: slot.key === 'head' ? '46%' : slot.key === 'feet' ? '50%' : slot.key === 'bottom' ? '58%' : '66%',
                    maxWidth: slot.key === 'head' ? '160px' : slot.key === 'feet' ? '180px' : '230px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Carte vêtement interactive */}
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (pool.length > 0) setActivePickerSlot(slot);
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 40) stepSlotItem(slot.key, 'prev');
                      else if (info.offset.x < -40) stepSlotItem(slot.key, 'next');
                    }}
                    style={{
                      aspectRatio: slot.key === 'head' ? '1.1' : slot.key === 'bottom' ? '1.05' : '1',
                      borderRadius: '24px',
                      background: item ? 'rgba(255, 255, 255, 0.7)' : 'rgba(240, 235, 225, 0.5)',
                      border: item ? '1px solid rgba(220, 212, 200, 0.4)' : '1.5px dashed rgba(200, 190, 175, 0.6)',
                      boxShadow: item ? '0 4px 16px rgba(45, 38, 35, 0.04)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                      cursor: 'pointer',
                      position: 'relative',
                      touchAction: 'pan-y'
                    }}
                  >
                    {item ? (
                      item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.type || slot.label}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 8px 16px rgba(45, 38, 35, 0.12))',
                            pointerEvents: 'none'
                          }}
                          onError={() => onImageError?.(item)}
                        />
                      ) : (
                        <span style={{ fontSize: '3rem', pointerEvents: 'none' }}>{item.icon || slot.defaultIcon}</span>
                      )
                    ) : (
                      <div style={{ textAlign: 'center', padding: '8px', opacity: 0.6 }}>
                        <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '4px' }}>{slot.defaultIcon}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>+ {slot.label}</span>
                      </div>
                    )}

                    {/* Flèches subtiles carrousel gauche / droite */}
                    {hasOptions && (
                      <>
                        <button
                          type="button"
                          aria-label="Pièce précédente"
                          onClick={(e) => stepSlotItem(slot.key, 'prev', e)}
                          style={{
                            position: 'absolute',
                            left: '-14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '1px solid rgba(220, 212, 200, 0.7)',
                            background: '#ffffff',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(45, 38, 35, 0.08)',
                            cursor: 'pointer',
                            zIndex: 4
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label="Pièce suivante"
                          onClick={(e) => stepSlotItem(slot.key, 'next', e)}
                          style={{
                            position: 'absolute',
                            right: '-14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '1px solid rgba(220, 212, 200, 0.7)',
                            background: '#ffffff',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(45, 38, 35, 0.08)',
                            cursor: 'pointer',
                            zIndex: 4
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    {/* Cadenas pour verrouiller en mode IA */}
                    {item && (
                      <button
                        type="button"
                        aria-label={locked ? 'Déverrouiller' : 'Verrouiller'}
                        onClick={(e) => toggleLock(slot.key, e)}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          border: 'none',
                          background: locked ? 'var(--primary)' : 'rgba(255, 255, 255, 0.85)',
                          color: locked ? '#ffffff' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                          cursor: 'pointer',
                          zIndex: 3
                        }}
                      >
                        {locked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    )}
                  </motion.div>

                  {/* Étiquette type sous la pièce */}
                  {item && (
                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.type}
                      </span>
                      {item.color && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          · {item.color}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bouton de validation du look */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="btn-primary"
              style={{ flex: 1, padding: '1.1rem', fontSize: '1rem', borderRadius: '20px' }}
              onClick={handleValidateOutfit}
              disabled={loading}
            >
              <Check size={19} />
              <span>Je porte cette tenue aujourd’hui</span>
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
                        aspectRatio: '1',
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
                        <img
                          src={piece.image_url}
                          alt={piece.type}
                          style={{
                            width: '100%',
                            height: '75%',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 4px 8px rgba(45, 38, 35, 0.08))'
                          }}
                          onError={() => onImageError?.(piece)}
                        />
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
