import React from 'react';
import { motion } from 'framer-motion';
import { Home, Plane, Plus, Wand2, User } from 'lucide-react';

const BottomNav = ({ activeTab, onTabChange }) => (
  <div className="bottom-nav">
    <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => onTabChange('dashboard')}><Home size={22} /><span>Dressing</span></motion.div>
    <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${activeTab === 'trip' ? 'active' : ''}`} onClick={() => onTabChange('trip')}><Plane size={22} /><span>Voyage</span></motion.div>
    <motion.div whileTap={{ scale: 0.9 }} className="nav-item" onClick={() => onTabChange('add-choice')}><div className="add-nav-btn"><Plus size={30} /></div><span>Ajouter</span></motion.div>
    <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${activeTab === 'stylist' ? 'active' : ''}`} onClick={() => onTabChange('stylist')}><Wand2 size={22} /><span>Styliste</span></motion.div>
    <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => onTabChange('settings')}><User size={22} /><span>Profil</span></motion.div>
  </div>
);

export default BottomNav;
