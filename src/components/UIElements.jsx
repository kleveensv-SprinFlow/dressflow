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
  const isSelected = (option) => multi ? (selected || []).includes(option) : selected === option;
  const toggle = (option) => {
    if (!multi) return onSelect(option);
    const current = Array.isArray(selected) ? selected : [];
    onSelect(current.includes(option) ? current.filter(item => item !== option) : [...current, option]);
  };

  return (
    <div className="choice-scroller" role="group" aria-label="Options disponibles">
      {options.map(option => (
        <motion.button
          type="button"
          key={option}
          whileTap={{ scale: 0.97 }}
          className={`choice-item ${isSelected(option) ? 'active' : ''}`}
          onClick={() => toggle(option)}
          aria-pressed={isSelected(option)}
        >
          <span>{getIcon ? getIcon(option) : <Tag size={18} />}</span>
          <span className="choice-label">{option}</span>
        </motion.button>
      ))}
    </div>
  );
};

export const SearchSelector = ({ options, selected, onSelect, placeholder }) => {
  const [search, setSearch] = useState('');
  const filtered = options.filter(option => option.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = options.some(option => option.toLowerCase() === search.toLowerCase());

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
        <input type="text" className="input-styled" style={{ paddingLeft: '3rem', height: '50px', fontSize: '0.9rem' }} placeholder={placeholder} value={search} onChange={(event) => setSearch(event.target.value)} aria-label={placeholder || 'Rechercher un type'} />
      </div>
      <div className="choice-scroller" role="group" aria-label="Types de vêtements">
        {search.trim() && !exactMatch && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className="choice-item"
            style={{ borderColor: 'var(--primary)', borderStyle: 'dashed' }}
            onClick={() => { onSelect(search.trim()); setSearch(''); }}
          >
            <span><Plus size={20} color="var(--primary)" /></span>
            <span className="choice-label">Ajouter « {search.trim()} »</span>
          </motion.button>
        )}
        {(search ? filtered : options).map(option => (
          <motion.button
            type="button"
            key={option}
            whileTap={{ scale: 0.97 }}
            className={`choice-item ${selected === option ? 'active' : ''}`}
            onClick={() => { onSelect(option); setSearch(''); }}
            aria-pressed={selected === option}
          >
            <span><Tag size={18} /></span>
            <span className="choice-label">{option}</span>
          </motion.button>
        ))}
        {search && filtered.length === 0 && exactMatch === false && (
          <p className="subtitle" style={{ fontSize: '0.75rem' }}>Aucun type existant ne correspond.</p>
        )}
      </div>
    </div>
  );
};

export const ColorPalette = ({ selected, onSelect }) => {
  const colors = [
    { name: 'Blanc', hex: '#FFFFFF' }, { name: 'Noir', hex: '#000000' }, { name: 'Gris', hex: '#94a3b8' },
    { name: 'Beige', hex: '#f5f5dc' }, { name: 'Marine', hex: '#1e3a8a' }, { name: 'Bleu Ciel', hex: '#bae6fd' },
    { name: 'Kaki', hex: '#4b5320' }, { name: 'Vert Sapin', hex: '#064e3b' }, { name: 'Bordeaux', hex: '#7f1d1d' },
    { name: 'Rouge', hex: '#ef4444' }, { name: 'Rose Poudré', hex: '#fce7f3' }, { name: 'Rose', hex: '#ec4899' },
    { name: 'Moutarde', hex: '#eab308' }, { name: 'Jaune', hex: '#fde047' }, { name: 'Lilas', hex: '#c4b5fd' },
    { name: 'Violet', hex: '#7c3aed' }, { name: 'Terracotta', hex: '#c56a4a' }, { name: 'Orange', hex: '#f97316' },
    { name: 'Or', hex: '#d4af37' }, { name: 'Argent', hex: '#c0c0c0' }, { name: 'Marron', hex: '#78350f' },
    { name: 'Camel', hex: '#b45309' }
  ];
  return (
    <div className="color-palette" role="group" aria-label="Choisir une couleur">
      {colors.map(color => (
        <motion.button
          type="button"
          key={color.name}
          whileTap={{ scale: 1.06 }}
          className={`color-circle ${selected === color.name ? 'active' : ''}`}
          style={{ background: color.hex }}
          onClick={() => onSelect(color.name)}
          aria-label={color.name}
          aria-pressed={selected === color.name}
          title={color.name}
        />
      ))}
    </div>
  );
};

export const CategorySlider = ({ title, items, selectedId, onSelect }) => {
  if (!items?.length) return null;
  const allowsEmpty = ['tête', 'coupe extérieure', 'couche extérieure', 'couche', 'sac', 'chaussures'].includes(title.toLowerCase());
  return (
    <div className="slider-category">
      <div className="slider-header">
        <span className="slider-title">{title}</span>
        <span className="slider-count">{items.length} option(s)</span>
      </div>
      <div className="slider-scroll" role="group" aria-label={title}>
        {items.map(item => (
          <motion.button
            type="button"
            key={item.id}
            className={`slider-card ${selectedId === item.id ? 'active' : ''}`}
            onClick={() => onSelect(selectedId === item.id ? null : item.id)}
            aria-pressed={selectedId === item.id}
            aria-label={`${item.type || title}, ${item.color || 'couleur non définie'}`}
            title={item.type || title}
          >
            <div className="slider-image">
              {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <div className="slider-icon">{item.icon || '👕'}</div>}
            </div>
            {selectedId === item.id && <div className="slider-check"><Check size={12} /></div>}
          </motion.button>
        ))}
        {allowsEmpty && (
          <motion.button type="button" className={`slider-card ${!selectedId ? 'active' : ''}`} onClick={() => onSelect(null)} aria-pressed={!selectedId} aria-label={`Aucun : ${title}`}>
            <div className="slider-image"><X size={20} opacity={0.3} /></div>
            <span className="slider-label">Aucun</span>
          </motion.button>
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
