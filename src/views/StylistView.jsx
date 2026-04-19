import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, RefreshCw, Check, Lock, Unlock } from 'lucide-react';
import { SlotMachine, CategorySlider } from '../components/UIElements';

const StylistView = ({
  stylistMode,
  setStylistMode,
  currentOutfit,
  outfitLoading,
  handleGenerateOutfitRequest,
  handleValidateOutfit,
  manualItems,
  manualOutfit,
  setManualOutfit,
  loading,
  lockedOutfit,
  setLockedOutfit
}) => {
  return (
    <div className="dashboard-container">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="title">Styliste IA</h1>
        <p className="subtitle">Laissez l'IA composer votre tenue idéale</p>
      </header>

      <div className="filter-scroll" style={{ marginBottom: '2rem' }}>
        <button className={`filter-pill ${stylistMode === 'ai' ? 'active' : ''}`} onClick={() => setStylistMode('ai')}>Générateur IA</button>
        <button className={`filter-pill ${stylistMode === 'manual' ? 'active' : ''}`} onClick={() => setStylistMode('manual')}>Mode Manuel</button>
      </div>

      {stylistMode === 'ai' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {currentOutfit ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {Object.entries(currentOutfit).map(([key, item]) => item && (
                  <div key={key} className="glass-card" style={{ padding: '10px', position: 'relative' }}>
                    <div style={{ aspectRatio: '1', borderRadius: '15px', overflow: 'hidden', background: 'white', marginBottom: '8px' }}>
                      <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textAlign: 'center' }}>{item.type}</div>
                    <button onClick={() => setLockedOutfit({...lockedOutfit, [key]: lockedOutfit[key] ? null : item})} style={{ position: 'absolute', top: '5px', right: '5px', background: lockedOutfit[key] ? 'var(--primary)' : 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: lockedOutfit[key] ? 'white' : 'var(--primary)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                      {lockedOutfit[key] ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={handleGenerateOutfitRequest} disabled={outfitLoading}><RefreshCw size={20} className={outfitLoading ? 'animate-spin' : ''} /> Relancer</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 1 }} onClick={handleValidateOutfit} disabled={loading}><Check size={20} /> Valider</motion.button>
              </div>
            </motion.div>
          ) : outfitLoading ? (
            <div style={{ padding: '4rem 0', textAlign: 'center' }}>
              <SlotMachine />
              <h2 className="title" style={{ marginTop: '2rem' }}>Création du look...</h2>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎰</div>
              <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleGenerateOutfitRequest}>Faire tourner la machine ✨</motion.button>
            </div>
          )}
        </motion.div>
      ) : (
        <div style={{ marginTop: '1rem', paddingBottom: '4rem' }}>
          <CategorySlider title="Tête" items={manualItems.head} selectedId={manualOutfit.head} onSelect={(id) => setManualOutfit({...manualOutfit, head: id})} />
          <CategorySlider title="Haut" items={manualItems.top} selectedId={manualOutfit.top} onSelect={(id) => setManualOutfit({...manualOutfit, top: id})} />
          <CategorySlider title="Couche" items={manualItems.layer} selectedId={manualOutfit.layer} onSelect={(id) => setManualOutfit({...manualOutfit, layer: id})} />
          <CategorySlider title="Bas" items={manualItems.bottom} selectedId={manualOutfit.bottom} onSelect={(id) => setManualOutfit({...manualOutfit, bottom: id})} />
          <CategorySlider title="Pieds" items={manualItems.feet} selectedId={manualOutfit.feet} onSelect={(id) => setManualOutfit({...manualOutfit, feet: id})} />
          <CategorySlider title="Sac" items={manualItems.bag} selectedId={manualOutfit.bag} onSelect={(id) => setManualOutfit({...manualOutfit, bag: id})} />
          <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 100 }}>
            <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleValidateOutfit} disabled={loading}><Check size={20} /> Valider ce look ! ✨</motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StylistView;
