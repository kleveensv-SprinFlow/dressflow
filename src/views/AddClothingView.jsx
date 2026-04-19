import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Image as ImageIcon, Loader2, Sparkles, Layers, Tag, Palette, Sun, Briefcase } from 'lucide-react';
import { ChoiceSelector, SearchSelector, ColorPalette } from '../components/UIElements';
import { MAIN_CATEGORIES, CATEGORY_HIERARCHY, ALL_SEASONS, ALL_ACTIVITIES, getSeasonIcon, getActivityIcon } from '../utils/helpers.jsx';

const AddClothingView = ({
  view,
  setView,
  fileInputRef,
  handleFileChange,
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
          <motion.div whileTap={{ scale: 0.98 }} className="upload-card" onClick={() => fileInputRef.current.click()} style={{ border: '2px dashed var(--primary)' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '20px', borderRadius: '25px' }}><Camera size={35} /></div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>PHOTO</div>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }} className="upload-card" onClick={() => fileInputRef.current.click()}>
            <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '20px', borderRadius: '25px' }}><ImageIcon size={35} /></div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', opacity: 0.6 }}>GALERIE</div>
          </motion.div>
          <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileChange} />
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
        <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 100, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '15px', borderRadius: '25px', display: 'flex', gap: '1rem', boxShadow: '0 -10px 25px rgba(0,0,0,0.05)' }}>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 2 }} onClick={handleBulkAdd} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : `Enregistrer (${bulkItems.length})`}</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => setView('dashboard')}>Annuler</motion.button>
        </div>
      </motion.div>
    );
  }

  if (view === 'loading-ai') {
    return (
      <motion.div key="loading-ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: '100%', height: '100%', background: 'var(--primary)', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 15px 35px rgba(var(--primary-rgb), 0.3)' }}>
            <Sparkles size={50} />
          </motion.div>
        </div>
        <h2 className="title" style={{ marginTop: '2.5rem', fontSize: '1.8rem' }}>Analyse en cours...</h2>
        <p className="subtitle" style={{ maxWidth: '250px' }}>Notre IA identifie les détails de votre vêtement pour vous.</p>
      </motion.div>
    );
  }

  if (view === 'add-detail') {
    return (
      <motion.div key="add-detail" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="dashboard-container" style={{ width: '100%', paddingBottom: '120px' }}>
        <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}><h2 className="title" style={{ fontSize: '1.8rem' }}>Vérification</h2></header>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '35px', overflow: 'hidden', background: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <img src={selectedImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
          <div className="ai-badge"><Sparkles size={14} /> ANALYSÉ PAR IA</div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Layers size={16} color="var(--primary)" /><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>1. Catégorie</label></div>
            <ChoiceSelector options={MAIN_CATEGORIES} selected={newItem.main_category} onSelect={(val) => setNewItem({...newItem, main_category: val, type: ''})} />
          </section>

          {newItem.main_category && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Tag size={16} color="var(--primary)" /><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>2. Type de {newItem.main_category.toLowerCase()}</label></div>
              <SearchSelector options={CATEGORY_HIERARCHY[newItem.main_category] || []} selected={newItem.type} onSelect={(val) => setNewItem({...newItem, type: val, icon: getIconForType(val)})} placeholder={`Ex: ${CATEGORY_HIERARCHY[newItem.main_category][0]}...`} />
            </motion.section>
          )}

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Palette size={16} color="var(--primary)" /><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Couleur</label></div>
            <ColorPalette selected={newItem.color} onSelect={(val) => setNewItem({...newItem, color: val})} />
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Sun size={16} color="var(--primary)" /><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Saisons</label></div>
            <ChoiceSelector multi options={ALL_SEASONS} selected={newItem.season} onSelect={(val) => setNewItem({...newItem, season: val})} getIcon={getSeasonIcon} />
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><Briefcase size={16} color="var(--primary)" /><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>Activités</label></div>
            <ChoiceSelector multi options={ALL_ACTIVITIES} selected={newItem.activity} onSelect={(val) => setNewItem({...newItem, activity: val})} getIcon={getActivityIcon} />
          </section>
        </div>

        <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 100, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '15px', borderRadius: '25px', display: 'flex', gap: '1rem', boxShadow: '0 -10px 25px rgba(0,0,0,0.05)' }}>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 2 }} onClick={handleAddItem} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Ajouter ✨'}</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => setView('dashboard')}>Annuler</motion.button>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default AddClothingView;
