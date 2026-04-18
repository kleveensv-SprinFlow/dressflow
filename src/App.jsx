import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shirt, Copy, ChevronLeft, Check, LogIn, Share2, 
  Plus, Camera, Image as ImageIcon, Sparkles, 
  Tag, Palette, Sun, Briefcase, X, ArrowRight, Loader2
} from 'lucide-react'

// Styles & DB
import './styles/index.css'
import { supabase } from './lib/supabase'

// Components
import ClothesCarousel from './components/ClothesCarousel'

function App() {
  const [view, setView] = useState('splash') 
  const [gender, setGender] = useState('female')
  const [name, setName] = useState('')
  const [uid, setUid] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', gender)
  }, [gender])

  // --- DATABASE LOGIC ---

  const fetchItems = async (profileId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clothes')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error(error)
      setError("Impossible de charger tes vêtements.")
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setError(null)
    
    const newUid = generateRandomUID()
    
    const { error: regError } = await supabase
      .from('profiles')
      .insert([{ id: newUid, name, gender }])

    if (regError) {
      setError("Erreur lors de la création du profil.")
      setLoading(false)
      return
    }

    setUid(newUid)
    setView('success')
    setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    const cleanCode = inputCode.replace(/[^A-Z0-9]/g, '')
    
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', cleanCode)
      .single()

    if (profError || !profile) {
      setError("Code d'accès invalide.")
      setLoading(false)
      return
    }

    setUid(profile.id)
    setName(profile.name)
    setGender(profile.gender)
    await fetchItems(profile.id)
    setView('dashboard')
    setLoading(false)
  }

  const generateRandomUID = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // --- UTILS ---

  const formatUID = (val) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}`
    }
    return cleaned
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
      } catch (err) { console.log(err) }
    } else {
      handleCopy()
    }
  }

  return (
    <div id="root">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="app-container">
        <AnimatePresence mode="wait">
          
          {/* SPLASH VIEW */}
          {view === 'splash' && (
            <motion.div 
              key="splash" 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <div className="logo-container">
                <ClothesCarousel />
                <h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1>
                <p className="subtitle">L'intelligence artificielle au service de votre style.</p>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
                <button onClick={() => setView('register')} className="btn-primary">
                  Créer mon dressing ✨
                </button>
                <button onClick={() => setView('login')} className="btn-secondary">
                  J'ai déjà un code d'accès
                </button>
              </div>
            </motion.div>
          )}

          {/* REGISTER VIEW */}
          {view === 'register' && (
            <motion.div 
              key="register" 
              initial={{ opacity: 0, x: 100 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -100 }}
              className="glass-card my-auto"
            >
              <button onClick={() => setView('splash')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem' }}>
                <ChevronLeft size={20} /> Retour
              </button>
              
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Nouveau Dressing</h2>
              
              <div style={{ marginBottom: '2rem' }}>
                <label className="subtitle" style={{ display: 'block', marginBottom: '0.8rem', fontSize: '1rem' }}>Quel est ton prénom ?</label>
                <input type="text" placeholder="Ex: Julie" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label className="subtitle" style={{ display: 'block', marginBottom: '0.8rem', fontSize: '1rem' }}>Ton univers style</label>
                <div className="gender-toggle">
                  <button className={`gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Femme</button>
                  <button className={`gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Homme</button>
                  <button className={`gender-btn ${gender === 'neutral' ? 'active' : ''}`} onClick={() => setGender('neutral')}>Neutre</button>
                </div>
              </div>
              
              {error && <p style={{ color: '#f43f5e', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}

              <div style={{ marginTop: '2rem' }}>
                <button className="btn-primary" onClick={handleRegister} disabled={!name || loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <>Continuer <ArrowRight size={20} /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <motion.div 
              key="login" 
              initial={{ opacity: 0, x: -100 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 100 }}
              className="glass-card my-auto"
            >
              <button onClick={() => setView('splash')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem' }}>
                <ChevronLeft size={20} /> Retour
              </button>
              
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Connexion</h2>
              
              <div style={{ marginBottom: '2.5rem' }}>
                <label className="subtitle" style={{ display: 'block', marginBottom: '1rem', fontSize: '1rem' }}>Ton code secret</label>
                <input 
                  type="text" 
                  placeholder="XXXX - XXXX" 
                  className="input-styled" 
                  style={{ textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center', fontWeight: 800 }} 
                  value={inputCode} 
                  onChange={(e) => setInputCode(formatUID(e.target.value.toUpperCase()))} 
                />
              </div>

              {error && <p style={{ color: '#f43f5e', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}

              <button className="btn-primary" onClick={handleLogin} disabled={inputCode.length < 11 || loading}>
                {loading ? <Loader2 className="animate-spin" /> : <>Entrer <LogIn size={20} /></>}
              </button>
            </motion.div>
          )}

          {/* SUCCESS VIEW */}
          {view === 'success' && (
            <motion.div 
              key="success" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="glass-card my-auto" 
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>✨</div>
              <h2 className="title" style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>Bravo {name} !</h2>
              <p className="subtitle" style={{ margin: '0 auto 2rem auto' }}>Voici ton code unique pour accéder à ton dressing.</p>
              
              <div className="uid-box">
                <div className="uid-text">{uid}</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                <button className="btn-primary" onClick={handleCopy} style={{ flex: 1 }}>
                  {copied ? <Check size={20} /> : <><Copy size={20} /> Copier</>}
                </button>
                <button className="btn-primary" onClick={handleShare} style={{ background: 'rgba(255,255,255,0.8)', color: '#000', width: '80px', boxShadow: 'none' }}>
                  <Share2 size={24} />
                </button>
              </div>
              
              <button onClick={() => setView('dashboard')} className="btn-secondary" style={{ marginTop: '2.5rem' }}>
                Accéder à mon dressing
              </button>
            </motion.div>
          )}

          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1>
                <div className="gender-btn" style={{ width: '50px', height: '50px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0 }}>
                  <Sparkles size={24} />
                </div>
              </header>
              
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                  <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                </div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🧥</div>
                  <h3 className="title" style={{ fontSize: '1.4rem' }}>Dressing vide</h3>
                  <p className="subtitle">Ajoute ton premier vêtement pour commencer.</p>
                </div>
              ) : (
                <div className="item-grid">
                  {items.map(item => (
                    <div key={item.id} className="item-card">
                      <div className="item-image">{item.icon || '👕'}</div>
                      <div className="item-info">
                        <div className="item-type">{item.type}</div>
                        <div className="item-meta">{item.brand} • {item.season}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="fab" onClick={() => alert('Mode Caméra bientôt disponible !')}>
                <Plus size={35} />
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
