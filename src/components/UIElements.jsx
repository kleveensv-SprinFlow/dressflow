import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag, Palette, Sun, Briefcase, X, Check, Search, Plus, 
  Snowflake, CloudSun, Wind, Home, Footprints, Sparkles
} from 'lucide-react';

export const SlotMachine = () => {
  const icons = ['👕', '👖', '👗', '🧥', '👟', '👜', '👚', '🩳', '🧢'];
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', height: '80px', overflow: 'hidden' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: '60px', background: 'white', borderRadius: '15px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <motion.div animate={{ y: [0, -400] }} transition={{ repeat: Infinity, duration: 0.5 + i * 0.2, ease: "linear" }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0', alignItems: 'center' }}>
            {icons.concat(icons).map((icon, idx) => <span key={idx} style={{ fontSize: '2rem' }}>{icon}</span>)}
          </motion.div>
        </div>
      ))}
    </div>
  );
};

export const ChoiceSelector = ({ options, selected, onSelect, getIcon, multi = false }) => {
  const isSelected = (opt) => multi ? selected?.includes(opt) : selected === opt;
  const toggle = (opt) => {
    if (!multi) return onSelect(opt);
    const current = selected || [];
    if (current.includes(opt)) onSelect(current.filter(i => i !== opt));
    else onSelect([...current, opt]);
  };

  return (
    <div className="choice-scroller">
      {options.map(opt => (
        <motion.div key={opt} whileTap={{ scale: 0.95 }} className={`choice-item ${isSelected(opt) ? 'active' : ''}`} onClick={() => toggle(opt)}>
          <span>{getIcon ? getIcon(opt) : <Tag size={18} />}</span>
          <label>{opt}</label>
        </motion.div>
      ))}
    </div>
  );
};

export const SearchSelector = ({ options, selected, onSelect, placeholder }) => {
  const [search, setSearch] = useState('');
  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = options.find(opt => opt.toLowerCase() === search.toLowerCase());

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
        <input type="text" className="input-styled" style={{ paddingLeft: '3rem', height: '50px', fontSize: '0.9rem' }} placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="choice-scroller">
        {search && !exactMatch && (
          <motion.div whileTap={{ scale: 0.95 }} className="choice-item" style={{ borderColor: 'var(--primary)', borderStyle: 'dashed' }} onClick={() => { onSelect(search); setSearch(''); }}>
            <span><Plus size={20} color="var(--primary)" /></span>
            <label>Ajouter "{search}"</label>
          </motion.div>
        )}
        {(search ? filtered : options).map(opt => (
          <motion.div key={opt} whileTap={{ scale: 0.95 }} className={`choice-item ${selected === opt ? 'active' : ''}`} onClick={() => { onSelect(opt); setSearch(''); }}>
            <span><Tag size={18} /></span>
            <label>{opt}</label>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const ColorPalette = ({ selected, onSelect }) => {
  const colors = [
    { name: 'Blanc', hex: '#FFFFFF' }, { name: 'Noir', hex: '#000000' }, { name: 'Gris', hex: '#94a3b8' }, 
    { name: 'Beige', hex: '#f5f5dc' }, { name: 'Marine', hex: '#1e3a8a' }, { name: 'Bleu Ciel', hex: '#bae6fd' },
    { name: 'Kaki', hex: '#4b5320' }, { name: 'Vert Sapin', hex: '#064e3b' }, { name: 'Bordeaux', hex: '#7f1d1d' },
    { name: 'Rouge', hex: '#ef4444' }, { name: 'Rose Poudré', hex: '#fce7f3' }, { name: 'Moutarde', hex: '#eab308' },
    { name: 'Marron', hex: '#78350f' }, { name: 'Camel', hex: '#b45309' }, { name: 'Violet', hex: '#7c3aed' }
  ];
  return (
    <div className="color-palette">
      {colors.map(c => (
        <motion.div key={c.name} whileTap={{ scale: 1.1 }} className={`color-circle ${selected === c.name ? 'active' : ''}`} style={{ background: c.hex }} onClick={() => onSelect(c.name)} title={c.name} />
      ))}
    </div>
  );
};

export const CategorySlider = ({ title, items, selectedId, onSelect }) => {
  if (items.length === 0) return null;
  return (
    <div className="slider-category">
      <div className="slider-header"><span className="slider-title">{title}</span><span className="slider-count">{items.length} options</span></div>
      <div className="slider-scroll">
        {items.map(item => (
          <div key={item.id} className={`slider-card ${selectedId === item.id ? 'active' : ''}`} onClick={() => onSelect(item.id)}>
            <div className="slider-image">{item.image_url ? <img src={item.image_url} /> : <div className="slider-icon">{item.icon}</div>}</div>
            {selectedId === item.id && <div className="slider-check"><Check size={12} /></div>}
          </div>
        ))}
        {['Tête', 'Couche', 'Sac'].includes(title) && (
          <div className={`slider-card ${!selectedId ? 'active' : ''}`} onClick={() => onSelect(null)}>
            <div className="slider-image"><X size={20} opacity={0.3} /></div>
            <div className="slider-label">Aucun</div>
          </div>
        )}
      </div>
    </div>
  );
};

export const RotatingClothes = () => {
  const [index, setIndex] = useState(0);
  const clothes = ['👕', '👖', '👗', '🧥', '👟', '👜', '👚', '🩳', '🧢'];
  useEffect(() => {
    const timer = setInterval(() => setIndex(prev => (prev + 1) % clothes.length), 1500);
    return () => clearInterval(timer);
  }, [clothes.length]);

  return (
    <div style={{ fontSize: '3.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AnimatePresence mode="wait">
        <motion.span key={index} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.5 }}>
          {clothes[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};
