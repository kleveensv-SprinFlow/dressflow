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
          Combien emporter. Coche chaque ligne une fois dans la valise.
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
          <div style={{ marginTop: '1rem' }}>
            {suitcase.reduce((groups, pack) => {
              const last = groups[groups.length - 1];
              if (!last || last.name !== pack.category) groups.push({ name: pack.category, rows: [pack] });
              else last.rows.push(pack);
              return groups;
            }, []).map(group => (
              <section key={group.name} style={{ marginBottom: '1.1rem' }}>
                <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--text-muted)' }}>{group.name}</h4>
                {group.rows.map((pack) => {
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
                        padding: '0.8rem 0',
                        cursor: 'pointer',
                        color: 'inherit'
                      }}
                    >
                      <span style={{
                        width: 16,
                        height: 16,
                        border: '1px solid #161513',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '0 0 auto',
                        background: isChecked ? '#161513' : 'transparent',
                        color: '#f3f0ea'
                      }}>
                        {isChecked && <Check size={12} />}
                      </span>
                      <span style={{ flex: 1, textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.45 : 1 }}>{pack.label || pack.type}</span>
                      <span style={{ letterSpacing: '0.06em' }}>× {pack.qty}</span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TravelView;
