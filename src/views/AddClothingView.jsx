import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon, Loader2, Sparkles, Layers, Tag, Palette, Sun, Briefcase } from 'lucide-react';
import { ChoiceSelector, SearchSelector, ColorPalette } from '../components/UIElements';
import { MAIN_CATEGORIES, CATEGORY_HIERARCHY, ALL_SEASONS, ALL_ACTIVITIES, getSeasonIcon, getActivityIcon } from '../utils/helpers.jsx';

const AddClothingView = ({
  view,
  setView,
  fileInputRef,
  galleryInputRef,
  handleFileChange,
  onAnalyzeClothing,
  analysisLoading,
  analysisApplied,
  bulkItems,
  setBulkItems,
  handleBulkAdd,
  loading,
  selectedImage,
  newItem,
  setNewItem,
  handleAddItem,
  getIconForType
}) => {
  if (view === 'add-choice') {
    return (
      <motion.div key="add-choice" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '2rem' }}>
        <header style={{ textAlign: 'center' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Ajouter une pièce</h2><p className="subtitle">Choisissez votre méthode d'importation</p></header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <motion.button type="button" whileTap={{ scale: 0.98 }} className="upload-card" onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed var(--primary)', cursor: 'pointer' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '20px', borderRadius: '25px' }}><Camera size={35} /></div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>PHOTO</div>
          </motion.button>
          <motion.button type="button" whileTap={{ scale: 0.98 }} className="upload-card" onClick={() => galleryInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '20px', borderRadius: '25px' }}><ImageIcon size={35} /></div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', opacity: 0.6 }}>GALERIE</div>
          </motion.button>
          <input type="file" ref={fileInputRef} hidden accept="image/*" capture="environment" onChange={handleFileChange} />
          <input type="file" ref={galleryInputRef} hidden accept="image/*" multiple onChange={handleFileChange} />
        </div>
        <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ border: 'none', background: 'none' }} onClick={() => setView('dashboard')}>Annuler</motion.button>
      </motion.div>
    );
  }

  if (view === 'bulk-add') {
    return (
      <motion.div key="bulk-add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
        <header style={{ marginBottom: '1.5rem' }}><h2 className="title">Ajout groupé</h2><p className="subtitle">{bulkItems.length} vêtements sélectionnés</p></header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '140px' }}>
          {bulkItems.map((item, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '15px', overflow: 'hidden', background: 'white', border: '1px solid rgba(0,0,0,0.05)' }}><img src={item.preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label className="subtitle" style={{ fontSize: '0.55rem', fontWeight: 900, marginBottom: '4px', display: 'block' }}>CATÉGORIE</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {MAIN_CATEGORIES.map(c => (
                        <button key={c} onClick={() => {
                          const newBulk = [...bulkItems];
                          newBulk[idx] = { ...newBulk[idx], main_category: c, type: CATEGORY_HIERARCHY[c][0], icon: getIconForType(CATEGORY_HIERARCHY[c][0]) };
                          setBulkItems(newBulk);
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
            </div>
          ))}
        </div>
        <div className="form-action-bar">
          <motion.button type="button" whileTap={{ scale: 0.98 }} className="btn-primary" style={{ flex: 2 }} onClick={handleAddItem} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Ajouter la pièce'}</motion.button>
          <motion.button type="button" whileTap={{ scale: 0.98 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => setView('dashboard')}>Annuler</motion.button>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default AddClothingView;
