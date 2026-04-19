import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plane, Luggage, Loader2, Check } from 'lucide-react';

const TravelView = ({
  travelData,
  setTravelData,
  suitcase,
  suitcaseLoading,
  handleGenerateSuitcase,
  suitcaseChecked,
  setSuitcaseChecked,
  setShowCityModal,
  setCityModalMode
}) => {
  return (
    <div className="dashboard-container">
      <header style={{ marginBottom: '2rem' }}>
        <h2 className="title" style={{ fontSize: '2.4rem' }}>Prêt à partir ? ✈️</h2>
      </header>
      
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '32px', boxShadow: '0 15px 40px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
        <div onClick={() => { setCityModalMode('travel'); setShowCityModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#f8f9fa', borderRadius: '20px', marginBottom: '1rem', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)' }}>
          <MapPin size={20} color="var(--primary)" />
          <div style={{ flex: 1 }}><div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5 }}>DESTINATION</div><div style={{ fontWeight: 800 }}>{travelData.destination || "Où pars-tu ?"}</div></div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 140px', padding: '0.8rem', background: '#f8f9fa', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', minWidth: 0 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5 }}>DÉPART</div>
            <input type="date" value={travelData.startDate} onChange={(e) => setTravelData({...travelData, startDate: e.target.value})} style={{ background: 'none', border: 'none', fontWeight: 800, width: '100%', fontSize: '0.85rem', outline: 'none', color: 'inherit' }} />
          </div>
          <div style={{ flex: '1 1 140px', padding: '0.8rem', background: '#f8f9fa', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', minWidth: 0 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5 }}>RETOUR</div>
            <input type="date" value={travelData.endDate} onChange={(e) => setTravelData({...travelData, endDate: e.target.value})} style={{ background: 'none', border: 'none', fontWeight: 800, width: '100%', fontSize: '0.85rem', outline: 'none', color: 'inherit' }} />
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleGenerateSuitcase} disabled={suitcaseLoading} style={{ marginTop: '1.5rem', height: '60px', borderRadius: '20px' }}>
          {suitcaseLoading ? <Loader2 className="animate-spin" /> : <Plane size={20} />} Générer ma valise ✨
        </motion.button>
      </div>

      {suitcase.length > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Luggage size={22} color="var(--primary)" /><h3 className="title" style={{ margin: 0, fontSize: '1.4rem' }}>Ma Valise</h3></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)' }}>{Math.round((suitcaseChecked.length / suitcase.length) * 100)}% prêt</span>
          </div>
          <div className="progress-container"><div className="progress-bar-fill" style={{ width: `${(suitcaseChecked.length / suitcase.length) * 100}%` }}></div></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '4rem', marginTop: '1.5rem' }}>
            {suitcase.map((pack, idx) => {
              const isChecked = suitcaseChecked.includes(idx);
              return (
                <motion.div key={idx} whileTap={{ scale: 0.98 }} className={`glass-card suitcase-item ${isChecked ? 'checked' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem', cursor: 'pointer' }} onClick={() => setSuitcaseChecked(prev => isChecked ? prev.filter(i => i !== idx) : [...prev, idx])}>
                  <div style={{ fontSize: '2rem' }}>{pack.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5 }}>{pack.category.toUpperCase()}</div><div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{pack.type}</div></div>
                  <div style={{ background: isChecked ? '#10b981' : 'var(--primary)', color: 'white', padding: '6px 14px', borderRadius: '12px', fontWeight: 900 }}>{isChecked ? <Check size={16} /> : `x${pack.qty}`}</div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TravelView;
