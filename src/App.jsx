import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shirt, Copy, ChevronLeft, Check, LogIn, Share2, 
  Plus, Camera, Image as ImageIcon, Sparkles, 
  Tag, Palette, Sun, Briefcase, X, ArrowRight
} from 'lucide-react'

// --- MOCK DATA ---
const MOCK_ITEMS = [
  { id: 1, type: 'T-shirt', color: 'Blanc', icon: '👕', brand: 'Nike', season: 'Été' },
  { id: 2, type: 'Pantalon', color: 'Bleu', icon: '👖', brand: 'Levi\'s', season: 'Hiver' },
]

// --- COMPONENTS ---

const DressflowLogo = () => (
  <motion.svg 
    viewBox="0 0 100 100" 
    className="logo-svg"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    <path d="M20,30 Q50,10 80,30 L85,45 Q50,35 15,45 Z" />
    <path d="M25,46 L25,85 Q50,95 75,85 L75,46 Q50,40 25,46" opacity="0.8" />
    <rect x="45" y="15" width="10" height="20" rx="2" />
  </motion.svg>
)

function App() {
  // Views: splash, register, login, success, dashboard, add-choice, loading, detail
  const [view, setView] = useState('splash') 
  const [gender, setGender] = useState('female') // female, male, neutral
  const [name, setName] = useState('')
  const [uid, setUid] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [items, setItems] = useState(MOCK_ITEMS)

  // Formatting UID in login
  const formatUID = (val) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}`
    }
    return cleaned
  }

  // Update theme on document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', gender)
  }, [gender])

  const generateUID = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setUid(result)
    setView('success')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(uid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mon Code Dressflow',
          text: `Voici mon code d'accès à mon dressing Dressflow : ${uid}`,
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      handleCopy()
    }
  }

  const handleLogin = () => {
    // Basic mock login
    setView('dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[var(--bg)]">
      <AnimatePresence mode="wait">
        {/* --- STEP 1 REFINED --- */}

        {view === 'splash' && (
          <motion.div key="splash" exit={{ opacity: 0 }} className="card my-auto">
            <div className="logo-container">
              <DressflowLogo />
              <h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1>
              <p className="subtitle">L'IA au service de votre style</p>
            </div>
            <button onClick={() => setView('register')} className="btn-primary">Créer mon dressing</button>
            <button onClick={() => setView('login')} className="btn-secondary">J'ai déjà un code d'accès</button>
          </motion.div>
        )}

        {view === 'register' && (
          <motion.div key="register" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="card my-auto">
            <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0 }}><ChevronLeft size={20} /> Retour</button>
            <h2 className="title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Prêt(e) ?</h2>
            <input type="text" placeholder="Ton prénom" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="subtitle" style={{ display: 'block', marginBottom: '0.8rem' }}>Ton style préféré</label>
            <div className="gender-toggle">
              <button className={`gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Femme</button>
              <button className={`gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Homme</button>
              <button className={`gender-btn ${gender === 'neutral' ? 'active' : ''}`} onClick={() => setGender('neutral')}>Neutre</button>
            </div>
            <button className="btn-primary" onClick={generateUID} disabled={!name}>Générer mon dressing</button>
          </motion.div>
        )}

        {view === 'login' && (
          <motion.div key="login" initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="card my-auto">
            <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0 }}><ChevronLeft size={20} /> Retour</button>
            <h2 className="title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Connexion</h2>
            <input 
              type="text" 
              placeholder="CODE - ACCÈS" 
              className="input-styled" 
              style={{ textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }} 
              value={inputCode} 
              onChange={(e) => setInputCode(formatUID(e.target.value.toUpperCase()))} 
            />
            <button className="btn-primary" onClick={handleLogin} disabled={inputCode.length < 11}>Entrer</button>
          </motion.div>
        )}

        {view === 'success' && (
          <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card my-auto" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 className="title" style={{ fontSize: '1.5rem' }}>C'est fait, {name} !</h2>
            <p className="subtitle">Voici ton code secret. Garde-le précieusement.</p>
            <div className="uid-box"><div className="uid-text">{uid}</div></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-primary" onClick={handleCopy} style={{ flex: 1 }}>{copied ? 'Copié !' : 'Copier'}</button>
              <button className="btn-primary" onClick={handleShare} style={{ background: 'var(--accent)', color: 'var(--text-main)', width: '60px' }}><Share2 size={20} /></button>
            </div>
            <button onClick={() => setView('dashboard')} className="btn-secondary">Aller au Dashboard</button>
          </motion.div>
        )}

        {/* --- STEP 2: DASHBOARD --- */}

        {view === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
            <header style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 className="title" style={{ fontSize: '1.8rem' }}>Mon Dressing</h1>
              <div className="glass" style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Sparkles size={20} color="var(--primary)" />
              </div>
            </header>

            {items.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
                <h3 className="title" style={{ fontSize: '1.2rem' }}>Ton dressing est vide !</h3>
                <p className="subtitle">Ajoute ta première pépite pour commencer l'aventure.</p>
              </div>
            ) : (
              <div className="item-grid">
                {items.map(item => (
                  <motion.div key={item.id} className="item-card" whileTap={{ scale: 0.95 }}>
                    <div className="item-image">{item.icon}</div>
                    <div className="item-info">
                      <div className="item-type">{item.type}</div>
                      <div className="item-meta">{item.brand} • {item.season}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <button className="fab" onClick={() => setView('add-choice')}>
              <Plus size={32} />
            </button>
          </motion.div>
        )}

        {/* --- STEP 2: ADD FLOW --- */}

        {view === 'add-choice' && (
          <motion.div key="add-choice" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="card" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '30px 30px 0 0', width: '100%', maxWidth: 'none', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 className="title" style={{ fontSize: '1.4rem' }}>Ajouter un vêtement</h2>
              <button onClick={() => setView('dashboard')} className="btn-secondary" style={{ width: 'auto', marginTop: 0 }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setView('loading')} className="btn-primary" style={{ flex: 1, height: '120px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--secondary)', color: 'var(--text-main)' }}>
                <Camera size={32} /> Appareil Photo
              </button>
              <button onClick={() => setView('loading')} className="btn-primary" style={{ flex: 1, height: '120px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--secondary)', color: 'var(--text-main)' }}>
                <ImageIcon size={32} /> Galerie
              </button>
            </div>
          </motion.div>
        )}

        {view === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-auto text-center" style={{ padding: '2rem' }}>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              style={{ fontSize: '4rem', marginBottom: '2rem' }}
            >
              ✨
            </motion.div>
            <h2 className="title" style={{ fontSize: '1.5rem' }}>Analyse en cours...</h2>
            <p className="subtitle">L'IA de Dressflow analyse ton vêtement pour l'ajouter à ta collection.</p>
            {/* Simulate transition after 2 seconds */}
            {useEffect(() => {
              const timer = setTimeout(() => setView('detail'), 3000)
              return () => clearTimeout(timer)
            }, [])}
          </motion.div>
        )}

        {view === 'detail' && (
          <motion.div key="detail" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
            <div className="card" style={{ width: '100%', marginBottom: '1rem', padding: '1rem' }}>
              <div className="item-image" style={{ height: '250px', borderRadius: '20px' }}>👗</div>
            </div>
            
            <div className="card" style={{ width: '100%' }}>
              <h2 className="title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Détails détectés</h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}><Tag size={16} /> Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="tag-pill active">Robe</span>
                  <span className="tag-pill">Haut</span>
                  <span className="tag-pill">Bas</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}><Palette size={16} /> Couleur</label>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#ff7eb9', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#fff', border: '1px solid #ddd' }}></div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}><Sun size={16} /> Saison</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="tag-pill active">Été</span>
                  <span className="tag-pill">Mi-saison</span>
                </div>
              </div>

              <button onClick={() => {
                setItems([{ id: Date.now(), type: 'Robe', color: 'Rose', icon: '👗', brand: 'Dressflow', season: 'Été' }, ...items])
                setView('dashboard')
              }} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                Valider et ajouter <Check size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
