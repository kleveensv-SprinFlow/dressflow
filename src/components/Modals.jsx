import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPinned, Info, Trash2, AlertCircle, Loader2, Tag, Palette, Sparkles } from 'lucide-react';
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

export const EditModal = ({ show, onClose, isEditing, setIsEditing, editForm, setEditForm, handleUpdateItem, handleDeleteItem, loading }) => (
  <AnimatePresence>
    {show && (
      <div className="modal-overlay" onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="title" style={{ margin: 0 }}>Modifier le vêtement</h2>
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer la fenêtre"><X size={20} /></button>
              </div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>CATÉGORIE</label><ChoiceSelector options={MAIN_CATEGORIES} selected={editForm.main_category} onSelect={(val) => setEditForm({...editForm, main_category: val, type: CATEGORY_HIERARCHY[val][0]})} /></div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>TYPE</label><SearchSelector options={CATEGORY_HIERARCHY[editForm.main_category] || []} selected={editForm.type} onSelect={(val) => setEditForm({...editForm, type: val, icon: getIconForType(val)})} placeholder="Rechercher..." /></div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>COULEUR</label><ColorPalette selected={editForm.color} onSelect={(val) => setEditForm({...editForm, color: val})} /></div>
              <div>
                <label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>MOTIF</label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {['Uni', 'Rayures', 'Carreaux', 'Imprimé'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, pattern: p })}
                      className={`filter-pill ${(editForm.pattern || 'Uni') === p ? 'active' : ''}`}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '0.72rem', justifyContent: 'center' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>SAISONS</label><ChoiceSelector multi options={ALL_SEASONS} selected={Array.isArray(editForm.season) ? editForm.season : (typeof editForm.season === 'string' ? editForm.season.split(', ') : [])} onSelect={(val) => setEditForm({...editForm, season: val})} getIcon={getSeasonIcon} /></div>
              <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>ACTIVITÉS</label><ChoiceSelector multi options={ALL_ACTIVITIES} selected={Array.isArray(editForm.activity) ? editForm.activity : (typeof editForm.activity === 'string' ? editForm.activity.split(', ') : [])} onSelect={(val) => setEditForm({...editForm, activity: val})} getIcon={getActivityIcon} /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}><motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 1 }} onClick={handleUpdateItem}>Sauvegarder ✨</motion.button><motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Annuler</motion.button></div>
            </div>
          ) : (
            <div style={{ paddingBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <div>
                  <h2 className="title" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{editForm.type || 'Pièce'}</h2>
                  <span className="subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>{editForm.color || ''} {editForm.pattern && editForm.pattern !== 'Uni' ? `· ${editForm.pattern}` : ''}</span>
                </div>
                <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer les détails"><X size={20} /></button>
              </div>

              {/* Showcase de la pièce sur fond doux */}
              <div style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '28px',
                overflow: 'hidden',
                background: 'radial-gradient(circle at center, #ffffff 45%, #f7f3eb 100%)',
                marginBottom: '1.4rem',
                border: '1px solid rgba(220, 210, 198, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}>
                <img
                  src={editForm.image_url}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(45, 38, 35, 0.1))' }}
                  alt={editForm.type}
                />
              </div>

              {/* Attributs épurés façon étiquette de boutique */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.6rem' }}>
                {editForm.main_category && (
                  <span style={{ padding: '6px 12px', borderRadius: '12px', background: 'rgba(237, 230, 218, 0.6)', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {editForm.main_category}
                  </span>
                )}
                {editForm.season && (
                  <span style={{ padding: '6px 12px', borderRadius: '12px', background: 'rgba(237, 230, 218, 0.6)', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500 }}>
                    {Array.isArray(editForm.season) ? editForm.season.join(', ') : editForm.season}
                  </span>
                )}
                {editForm.activity && (
                  <span style={{ padding: '6px 12px', borderRadius: '12px', background: 'rgba(237, 230, 218, 0.6)', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 500 }}>
                    {Array.isArray(editForm.activity) ? editForm.activity.join(', ') : editForm.activity}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.98 }} className="btn-primary" style={{ flex: 1, padding: '1rem', fontSize: '0.95rem' }} onClick={() => setIsEditing(true)}>
                  Modifier la pièce
                </motion.button>
                <motion.button whileTap={{ scale: 0.98 }} className="btn-secondary" style={{ color: '#b91c1c', border: '1px solid rgba(185, 28, 28, 0.2)', width: '52px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleDeleteItem} disabled={loading} aria-label="Supprimer">
                  <Trash2 size={18} />
                </motion.button>
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
