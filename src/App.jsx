import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shirt, Copy, ChevronLeft, Check, LogIn } from 'lucide-react'

function App() {
  const [view, setView] = useState('splash') // splash, register, login, success
  const [gender, setGender] = useState('female')
  const [name, setName] = useState('')
  const [uid, setUid] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [iconIndex, setIconIndex] = useState(0)

  const icons = ['👕', '👗', '🧥', '👠', '👔', '👖']

  // Update theme on document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', gender)
  }, [gender])

  // Cycle icons for the splash screen
  useEffect(() => {
    if (view === 'splash') {
      const interval = setInterval(() => {
        setIconIndex((prev) => (prev + 1) % icons.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [view])

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {/* VIEW: SPLASH */}
        {view === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="card"
          >
            <div className="logo-container">
              <div className="logo-icon" style={{ height: '5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={icons[iconIndex]}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                  >
                    {icons[iconIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
              <h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1>
              <p className="subtitle">Votre dressing intelligent</p>
            </div>

            <button onClick={() => setView('register')} className="btn-primary">
              Créer mon dressing
            </button>
            
            <button onClick={() => setView('login')} className="btn-secondary">
              J'ai déjà un code d'accès
            </button>
          </motion.div>
        )}

        {/* VIEW: REGISTER */}
        {view === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="card"
          >
            <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, marginBottom: '1rem' }}>
              <ChevronLeft size={20} /> Retour
            </button>
            
            <h2 className="title" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Bienvenue !</h2>
            
            <div className="input-group">
              <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>Prénom</label>
              <input 
                type="text" 
                placeholder="Ex: Julie" 
                className="input-styled"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>Genre</label>
            <div className="gender-toggle">
              <button 
                className={`gender-btn ${gender === 'female' ? 'active' : ''}`}
                onClick={() => setGender('female')}
              >
                Femme
              </button>
              <button 
                className={`gender-btn ${gender === 'male' ? 'active' : ''}`}
                onClick={() => setGender('male')}
              >
                Homme
              </button>
            </div>

            <button 
              className="btn-primary" 
              onClick={generateUID}
              disabled={!name}
              style={{ opacity: name ? 1 : 0.5 }}
            >
              C'est parti
            </button>
          </motion.div>
        )}

        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="card"
          >
            <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, marginBottom: '1rem' }}>
              <ChevronLeft size={20} /> Retour
            </button>
            
            <h2 className="title" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Bon retour</h2>
            
            <div className="input-group">
              <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>Code d'accès</label>
              <input 
                type="text" 
                placeholder="Entrez votre code" 
                className="input-styled"
                style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              />
            </div>

            <button 
              className="btn-primary"
              disabled={!inputCode}
              style={{ opacity: inputCode ? 1 : 0.5 }}
            >
              Entrer dans mon dressing
            </button>
          </motion.div>
        )}

        {/* VIEW: SUCCESS (Generated UID) */}
        {view === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ textAlign: 'center' }}
          >
            <div className="logo-icon" style={{ color: 'var(--primary-dark)' }}>✨</div>
            <h2 className="title" style={{ fontSize: '1.5rem' }}>Dressing créé !</h2>
            <p className="subtitle">Voici votre code d'accès unique. Notez-le bien, il est indispensable pour vous reconnecter.</p>
            
            <div className="uid-box">
              <div className="uid-text">{uid}</div>
            </div>

            <button className="btn-primary" onClick={handleCopy}>
              {copied ? <><Check size={20} /> Copié !</> : <><Copy size={20} /> Copier le code</>}
            </button>
            
            <button onClick={() => alert("Direction le dressing !")} className="btn-secondary">
              Continuer vers le dressing
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
