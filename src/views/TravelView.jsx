import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader2, Check } from 'lucide-react';

const QUESTIONS = [
  { key: 'laundry', label: 'Machine à laver' },
  { key: 'sport', label: 'Sport' },
  { key: 'evening', label: 'Soirée' }
];

const TravelView = ({
  travelData,
  setTravelData,
  suitcase,
  suitcaseNote,
  suitcaseLoading,
  handleGenerateSuitcase,
  suitcaseChecked,
  onTogglePacked,
  setShowCityModal,
  setCityModalMode
}) => {
  const setField = (key, value) => {
    setTravelData(previous => ({ ...previous, [key]: value }));
  };

  return (
    <div className="dashboard-container" style={{ paddingBottom: '140px' }}>
      <header style={{ marginBottom: '1.4rem' }}>
        <h2 className="title" style={{ fontSize: '2.6rem' }}>Voyage</h2>
        <p className="subtitle" style={{ marginTop: '6px' }}>
          La valise est calculée avec tes pièces, la météo et ces réponses.
        </p>
      </header>

      <button
        type="button"
        onClick={() => { setCityModalMode('travel'); setShowCityModal(true); }}
        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '0.9rem 0', cursor: 'pointer' }}
      >
        <div style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Destination</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <MapPin size={16} />
          <span>{travelData.destination || 'Choisir une ville'}</span>
        </div>
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '0.8rem' }}>
        <label>
          <div style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Départ</div>
          <input type="date" value={travelData.startDate} onChange={(e) => setField('startDate', e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', padding: '0.7rem 0', color: 'inherit', font: 'inherit' }} />
        </label>
        <label>
          <div style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Retour</div>
          <input type="date" value={travelData.endDate} onChange={(e) => setField('endDate', e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', padding: '0.7rem 0', color: 'inherit', font: 'inherit' }} />
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1.2rem' }}>
        {QUESTIONS.map(question => {
          const on = Boolean(travelData[question.key]);
          return (
            <button
              key={question.key}
              type="button"
              aria-pressed={on}
              onClick={() => setField(question.key, !on)}
              style={{
                border: '1px solid ' + (on ? '#161513' : 'var(--border)'),
                background: on ? '#161513' : 'transparent',
                color: on ? '#f3f0ea' : '#161513',
                padding: '0.55rem 0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: '0.66rem',
                cursor: 'pointer'
              }}
            >
              {question.label}
            </button>
          );
        })}
      </div>

      <motion.button whileTap={{ scale: 0.98 }} className="btn-primary" onClick={handleGenerateSuitcase} disabled={suitcaseLoading} style={{ marginTop: '1.4rem' }}>
        {suitcaseLoading ? <Loader2 className="animate-spin" size={16} /> : null}
        <span>{suitcaseLoading ? 'Calcul…' : 'Préparer la valise'}</span>
      </motion.button>

      {suitcase.length > 0 && (
        <section style={{ marginTop: '1.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <h3 className="title" style={{ margin: 0, fontSize: '1.8rem' }}>Valise</h3>
            <span className="subtitle" style={{ margin: 0 }}>{Math.round((suitcaseChecked.length / suitcase.length) * 100)} %</span>
          </div>
          {suitcaseNote && <p className="subtitle" style={{ marginTop: '4px' }}>{suitcaseNote}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.6rem' }}>
            {suitcase.map((pack) => {
              const packedId = String(pack.id);
              const isChecked = suitcaseChecked.includes(packedId);
              return (
                <button
                  key={packedId}
                  type="button"
                  onClick={() => onTogglePacked(packedId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    padding: '0.75rem 0',
                    cursor: 'pointer',
                    opacity: isChecked ? 0.45 : 1
                  }}
                >
                  <div style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    {pack.image_url
                      ? <img src={pack.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <span>{pack.icon}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{pack.category}</div>
                    <div>{pack.type}{pack.color ? ` · ${pack.color}` : ''}</div>
                  </div>
                  {isChecked && <Check size={16} />}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default TravelView;
