import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon, Loader2, Layers, Tag, Palette, Sun, Briefcase, Check, Sparkles, Eraser, Paintbrush } from 'lucide-react';
import { ChoiceSelector, SearchSelector, ColorPalette } from '../components/UIElements';
import CutoutBrush from '../components/CutoutBrush';
import { MAIN_CATEGORIES, CATEGORY_HIERARCHY, ALL_SEASONS, ALL_ACTIVITIES, ALL_PATTERNS, getSeasonIcon, getActivityIcon } from '../utils/helpers.jsx';

function toolStyle(active) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '14px',
    border: 'none',
    background: active ? 'var(--primary)' : 'white',
    color: active ? 'white' : 'var(--text-main)',
    fontWeight: 800,
    fontSize: '0.78rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    cursor: 'pointer'
  }
}

const AddClothingView = ({
  view,
  setView,
  fileInputRef,
  galleryInputRef,
  handleFileChange,
  bulkItems,
  setBulkItems,
  handleBulkAdd,
  loading,
  selectedImage,
  isProcessingCutout,
  bulkProgress,
  newItem,
  setNewItem,
  handleAddItem,
  getIconForType,
  onCategoryCutout,
  onBulkCategory,
  originalFile,
  onBrushCommit
}) => {
  const [fixing, setFixing] = useState(false)
  const [tool, setTool] = useState('restore')
  const [brush, setBrush] = useState(28)

  useEffect(() => {
    if (isProcessingCutout) setFixing(false)
  }, [isProcessingCutout])
  if (view === 'add-choice') {
    return (
      <motion.div key="add-choice" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
        <header style={{ textAlign: 'center' }}>
          <h2 className="title" style={{ fontSize: '2.6rem' }}>Ajouter</h2>
          <p className="subtitle" style={{ fontSize: '0.9rem', marginTop: '6px' }}>Seul le vêtement reste.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
          <motion.button type="button" whileTap={{ scale: 0.98 }} className="upload-card" onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed var(--primary)', cursor: 'pointer', background: 'white' }}>
            <div style={{ border: '1px solid var(--primary)', color: 'var(--primary)', padding: '18px' }}><Camera size={28} /></div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)', marginTop: '8px' }}>PHOTO</div>
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.98 }} className="upload-card" onClick={() => galleryInputRef.current?.click()} style={{ cursor: 'pointer', background: 'white' }}>
            <div style={{ border: '1px solid var(--border)', color: 'var(--primary)', padding: '18px' }}><ImageIcon size={28} /></div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>GALERIE</div>
          </motion.button>
          <input type="file" ref={fileInputRef} hidden accept="image/*" capture="environment" onChange={handleFileChange} />
          <input type="file" ref={galleryInputRef} hidden accept="image/*" multiple onChange={handleFileChange} />
        </div>
        <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ border: 'none', background: 'none', fontSize: '0.9rem' }} onClick={() => setView('dashboard')}>Annuler</motion.button>
      </motion.div>
    );
  }

  if (view === 'bulk-add') {
    return (
      <motion.div key="bulk-add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h2 className="title">Ajout groupé</h2>
          <p className="subtitle">{bulkItems.length} vêtements sélectionnés</p>

          {/* BARRE DE PROGRESSION DU DÉTOURAGE PAR LOT */}
          {bulkProgress && bulkProgress.total > 0 && bulkProgress.done < bulkProgress.total && (
            <div style={{ marginTop: '1rem', background: 'white', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 className="animate-spin" size={14} color="var(--primary)" />
                  Détourage automatique en cours…
                </span>
                <span style={{ color: 'var(--primary)' }}>{bulkProgress.done} / {bulkProgress.total}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%`,
                  height: '100%',
                  background: 'var(--primary)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '140px' }}>
          {bulkItems.map((item, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  background: 'repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 12px 12px',
                  border: '1px solid rgba(0,0,0,0.05)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={item.cutoutPreview || item.preview}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: item.cutoutPreview ? '4px' : '0' }}
                    alt="Aperçu vêtement"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label className="subtitle" style={{ fontSize: '0.55rem', fontWeight: 900, marginBottom: '4px', display: 'block' }}>CATÉGORIE</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {MAIN_CATEGORIES.map(c => (
                        <button key={c} onClick={() => {
                          if (onBulkCategory) onBulkCategory(idx, c)
                          else {
                            const newBulk = [...bulkItems];
                            newBulk[idx] = { ...newBulk[idx], main_category: c, type: CATEGORY_HIERARCHY[c][0], icon: getIconForType(CATEGORY_HIERARCHY[c][0]) };
                            setBulkItems(newBulk);
                          }
                        }} className={`filter-pill ${item.main_category === c ? 'active' : ''}`} style={{ fontSize: '0.6rem', padding: '3px 8px' }}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label className="subtitle" style={{ fontSize: '0.55rem', fontWeight: 900, marginBottom: '4px', display: 'block' }}>TYPE</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {CATEGORY_HIERARCHY[item.main_category || 'Haut'].map(t => (
                        <button key={t} onClick={() => {
                          const newBulk = [...bulkItems];
                          newBulk[idx] = { ...newBulk[idx], type: t, icon: getIconForType(t) };
                          setBulkItems(newBulk);
                        }} className={`filter-pill ${item.type === t ? 'active' : ''}`} style={{ fontSize: '0.6rem', padding: '3px 8px' }}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="subtitle" style={{ fontSize: '0.55rem', fontWeight: 900, marginBottom: '4px', display: 'block' }}>SAISONS</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {ALL_SEASONS.map(s => {
                        const isSel = item.season?.includes(s);
                        return (
                          <button key={s} onClick={() => {
                            const newBulk = [...bulkItems];
                            const current = item.season || [];
                            newBulk[idx] = { ...newBulk[idx], season: isSel ? current.filter(x => x !== s) : [...current, s] };
                            setBulkItems(newBulk);
                          }} className={`filter-pill ${isSel ? 'active' : ''}`} style={{ fontSize: '0.6rem', padding: '3px 8px' }}>{s}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.8rem' }}>
                <label className="subtitle" style={{ fontSize: '0.55rem', fontWeight: 900, marginBottom: '4px', display: 'block' }}>COULEUR · {item.color}</label>
                <ColorPalette selected={item.color} onSelect={(color) => {
                  const nextBulk = [...bulkItems];
                  nextBulk[idx] = { ...nextBulk[idx], color };
                  setBulkItems(nextBulk);
                }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 100, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '15px', borderRadius: '25px', display: 'flex', gap: '1rem', boxShadow: '0 -10px 25px rgba(0,0,0,0.05)' }}>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 2 }} onClick={handleBulkAdd} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : `Enregistrer (${bulkItems.length})`}</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => setView('dashboard')}>Annuler</motion.button>
        </div>
      </motion.div>
    );
  }

  if (view === 'add-detail') {
    return (
      <motion.div key="add-detail" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="dashboard-container" style={{ width: '100%', paddingBottom: '120px' }}>
        <header style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
          <h2 className="title" style={{ fontSize: '1.8rem' }}>Détails du vêtement</h2>
        </header>

        {/* APERÇU PHOTO AVEC EFFET DAMIER POUR TRANSPARENCE */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          borderRadius: '35px',
          overflow: 'hidden',
          background: 'repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isProcessingCutout ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader2 className="animate-spin" size={36} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Détourage en cours…</span>
            </div>
          ) : fixing && originalFile ? (
            <CutoutBrush sourceFile={originalFile} tool={tool} radius={brush} onCommit={onBrushCommit} />
          ) : (
            <img
              src={selectedImage}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: '12px',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.12))'
              }}
              alt="Vêtement"
            />
          )}
        </div>

        {!isProcessingCutout && originalFile && (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setFixing((open) => !open)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: fixing ? 'var(--primary)' : 'white',
                  color: fixing ? 'white' : 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  cursor: 'pointer'
                }}
              >
                {fixing ? 'Terminer' : 'Corriger'}
              </button>
              {fixing && (
                <>
                  <button type="button" onClick={() => setTool('restore')} style={toolStyle(tool === 'restore')}>
                    <Paintbrush size={14} /> Rajouter
                  </button>
                  <button type="button" onClick={() => setTool('erase')} style={toolStyle(tool === 'erase')}>
                    <Eraser size={14} /> Effacer
                  </button>
                </>
              )}
            </div>
            {fixing && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={brush}
                  onChange={(event) => setBrush(Number(event.target.value))}
                  style={{ width: '100%' }}
                  aria-label="Taille du pinceau"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0 0', textAlign: 'center' }}>
                  Pince à deux doigts pour zoomer. Un doigt corrige, la loupe montre le bord.
                </p>
              </div>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
          {/* 1. CATÉGORIE */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Layers size={16} color="var(--primary)" />
              <label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                1. Catégorie
              </label>
            </div>
            <ChoiceSelector
              options={MAIN_CATEGORIES}
              selected={newItem.main_category}
              onSelect={(val) => onCategoryCutout ? onCategoryCutout(val) : setNewItem({ ...newItem, main_category: val, type: '' })}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              Haut garde le t-shirt ou la veste. Bas garde le pantalon. Chaussures, seulement les chaussures.
            </p>
          </section>

          {/* 2. TYPE */}
          {newItem.main_category && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Tag size={16} color="var(--primary)" />
                <label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                  2. Type de {newItem.main_category.toLowerCase()}
                </label>
              </div>
              <SearchSelector
                options={CATEGORY_HIERARCHY[newItem.main_category] || []}
                selected={newItem.type}
                onSelect={(val) => setNewItem({ ...newItem, type: val, icon: getIconForType(val) })}
                placeholder={`Ex: ${CATEGORY_HIERARCHY[newItem.main_category][0]}...`}
              />
            </motion.section>
          )}

          {/* 3. COULEUR */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Palette size={16} color="var(--primary)" />
                <label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                  3. Couleur · {newItem.color}
                </label>
              </div>
              {newItem.color && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Check size={12} /> Détectée
                </span>
              )}
            </div>
            <ColorPalette selected={newItem.color} onSelect={(val) => setNewItem({ ...newItem, color: val })} />
          </section>

          {/* 3 BIS. MOTIF / RAYURES */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={16} color="var(--primary)" />
                <label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                  Motif · {newItem.pattern || 'Uni'}
                </label>
              </div>
              {newItem.pattern && newItem.pattern !== 'Uni' && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Check size={12} /> Détecté
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              {ALL_PATTERNS.map((p) => {
                const active = (newItem.pattern || 'Uni') === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewItem({ ...newItem, pattern: p })}
                    className={`filter-pill ${active ? 'active' : ''}`}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', justifyContent: 'center' }}
                  >
                    {p === 'Rayures' ? '🦓 ' : p === 'Carreaux' ? '🏁 ' : p === 'Imprimé' ? '🎨 ' : '⚪ '}{p}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. SAISONS */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Sun size={16} color="var(--primary)" />
              <label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                4. Saisons
              </label>
            </div>
            <ChoiceSelector
              options={ALL_SEASONS}
              selected={newItem.season}
              onSelect={(val) => setNewItem({ ...newItem, season: val })}
              getIcon={getSeasonIcon}
              multi={true}
            />
          </section>

          {/* 5. ACTIVITÉ / OCCASION */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Briefcase size={16} color="var(--primary)" />
              <label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>
                5. Activité
              </label>
            </div>
            <ChoiceSelector
              options={ALL_ACTIVITIES}
              selected={newItem.activity}
              onSelect={(val) => setNewItem({ ...newItem, activity: val })}
              getIcon={getActivityIcon}
              multi={true}
            />
          </section>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn-primary"
              style={{ flex: 2 }}
              onClick={handleAddItem}
              disabled={loading || !newItem.main_category || !newItem.type}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Enregistrer"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setView('dashboard')}
            >
              Annuler
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default AddClothingView;
