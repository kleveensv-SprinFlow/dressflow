import React from 'react';
import { Sun, Snowflake, CloudSun, Wind, Home, Footprints, Sparkles, Briefcase, Tag } from 'lucide-react';

export const CATEGORY_HIERARCHY = {
  "Haut": ["T-shirt", "Chemise", "Pull", "Sweat", "Veste", "Manteau", "Top / Blouse"],
  "Bas": ["Pantalon", "Short", "Jogging", "Jean", "Jupe", "Legging"],
  "Chaussures": ["Baskets", "Bottes", "Sandales", "Talons", "Ville"],
  "Chapeau": ["Casquette", "Bonnet", "Chapeau", "Bob"]
};

export const MAIN_CATEGORIES = Object.keys(CATEGORY_HIERARCHY);

export const getIconForType = (type) => { 
  const icons = { 
    'T-shirt': '👕', 'Chemise': '👔', 'Pull': '🧶', 'Sweat': '🧥', 'Veste': '🧥', 'Manteau': '🧥', 
    'Pantalon': '👖', 'Short': '🩳', 'Jean': '👖', 'Jupe': '👗', 'Baskets': '👟', 'Bottes': '👢',
    'Sandales': '👡', 'Ville': '👞', 'Casquette': '🧢', 'Bonnet': '👒'
  }; 
  return icons[type] || '✨';
};

export const getSeasonIcon = (season) => {
  const icons = {
    'Été': <Sun size={22} color="#f59e0b" />,
    'Hiver': <Snowflake size={22} color="#3b82f6" />,
    'Printemps': <CloudSun size={22} color="#10b981" />,
    'Automne': <Wind size={22} color="#92400e" />
  };
  return icons[season] || <Sun size={22} />;
};

export const getActivityIcon = (activity) => {
  const icons = {
    'Quotidien': <Home size={22} color="var(--primary)" />,
    'Sport': <Footprints size={22} color="#ef4444" />,
    'Soirée': <Sparkles size={22} color="#7c3aed" />,
    'Travail': <Briefcase size={22} color="#475569" />
  };
  return icons[activity] || <Tag size={22} />;
};

export const ALL_COLORS = ['Blanc', 'Noir', 'Gris', 'Beige', 'Marine', 'Bleu Ciel', 'Kaki', 'Vert Sapin', 'Bordeaux', 'Rouge', 'Rose Poudré', 'Rose', 'Moutarde', 'Jaune', 'Lilas', 'Violet', 'Terracotta', 'Orange', 'Or', 'Argent', 'Marron', 'Camel'];
export const ALL_ACTIVITIES = ['Quotidien', 'Sport', 'Soirée', 'Travail'];
export const ALL_SEASONS = ['Été', 'Hiver', 'Printemps', 'Automne'];

export const formatUID = (val) => { 
  const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8); 
  if (cleaned.length > 4) return `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}`; 
  return cleaned; 
};

export const findItemById = (items, id) => items.find(item => item.id === id);
