import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPinned, Info, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { ChoiceSelector, SearchSelector, ColorPalette } from './UIElements';
import { ALL_SEASONS, ALL_ACTIVITIES, getSeasonIcon, getActivityIcon, MAIN_CATEGORIES, CATEGORY_HIERARCHY, getIconForType } from '../utils/helpers.jsx';

export const CityModal = ({ show, onClose, title, citySearch, setCitySearch, cityResults, onSelectCity }) => (
  <AnimatePresence>
    {show && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header"><h2 className="title">{title}</h2><button className="icon-btn" onClick={onClose}><X size={20} /></button></div>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
            <input type="text" className="input-styled" style={{ paddingLeft: '3rem' }} placeholder="Rechercher une ville..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cityResults.map((city, idx) => (
              <button key={idx} className="list-item" onClick={() => onSelectCity(city)}><MapPinned size={18} opacity={0.5} /> {city.name}, {city.country}</button>
            ))}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export const EditModal = ({ show, isEditing, setIsEditing, editForm, setEditForm, handleUpdateItem, handleDeleteItem, loading }) => (
  <AnimatePresence>
    {show && (
      <div className="modal-overlay" onClick={() => { setIsEditing(false); }}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
              <h2 className="title">Modifier le vêtement</h2>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>CATÉGORIE</label><ChoiceSelector options={MAIN_CATEGORIES} selected={editForm.main_category} onSelect={(val) => setEditForm({...editForm, main_category: val, type: CATEGORY_HIERARCHY[val][0]})} /></div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>TYPE</label><SearchSelector options={CATEGORY_HIERARCHY[editForm.main_category] || []} selected={editForm.type} onSelect={(val) => setEditForm({...editForm, type: val, icon: getIconForType(val)})} placeholder="Rechercher..." /></div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>COULEUR</label><ColorPalette selected={editForm.color} onSelect={(val) => setEditForm({...editForm, color: val})} /></div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>SAISONS</label><ChoiceSelector multi options={ALL_SEASONS} selected={Array.isArray(editForm.season) ? editForm.season : (typeof editForm.season === 'string' ? editForm.season.split(', ') : [])} onSelect={(val) => setEditForm({...editForm, season: val})} getIcon={getSeasonIcon} /></div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>ACTIVITÉS</label><ChoiceSelector multi options={ALL_ACTIVITIES} selected={Array.isArray(editForm.activity) ? editForm.activity : (typeof editForm.activity === 'string' ? editForm.activity.split(', ') : [])} onSelect={(val) => setEditForm({...editForm, activity: val})} getIcon={getActivityIcon} /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}><motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 1 }} onClick={handleUpdateItem}>Sauvegarder ✨</motion.button><motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Annuler</motion.button></div>
            </div>
          ) : (
            <div style={{ paddingBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 className="title">Détails</h2><button className="icon-btn" onClick={() => setIsEditing(false)}><X size={20} /></button></div>
              <div style={{ width: '100%', aspectRatio: '1', borderRadius: '25px', overflow: 'hidden', background: 'white', marginBottom: '1.5rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                <img src={editForm.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem' }}>
                <div className="info-badge"><Tag size={14} /> {editForm.type}</div>
                <div className="info-badge"><Palette size={14} /> {editForm.color}</div>
                <div className="info-badge"><Info size={14} /> {editForm.season}</div>
                <div className="info-badge"><Trash2 size={14} /> {editForm.activity}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>Modifier</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ color: '#ef4444' }} onClick={handleDeleteItem} disabled={loading}><Trash2 size={20} /></motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export const DeleteModal = ({ show, onClose, onConfirm, loading }) => (
  <AnimatePresence>
    {show && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content" style={{ textAlign: 'center', padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
          <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><AlertCircle size={30} /></div>
          <h2 className="title">Supprimer ?</h2>
          <p className="subtitle">Cette action est irréversible. Toutes vos données seront effacées.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '2rem' }}>
            <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ background: '#ef4444' }} onClick={onConfirm} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Supprimer définitivement'}</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" onClick={onClose}>Annuler</motion.button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
