import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shirt, Copy, ChevronLeft, Check, LogIn, Share2, 
  Plus, Camera, Image as ImageIcon, Sparkles, 
  Tag, Palette, Sun, Briefcase, X, ArrowRight, Loader2,
  Settings, Mail, ShieldCheck, LogOut, AlertCircle,
  Thermometer, CloudRain, Wind, Wand2, RefreshCw,
  Calendar, Trash2, Heart, ShoppingBag, Home, User
} from 'lucide-react'

// Styles & DB & Services
import './styles/index.css'
import { supabase } from './lib/supabase'
import { analyzeClothing, generateOutfit } from './services/ai'
import { getLocalWeather } from './services/weather'

// Assets
import logoImg from './assets/logo.png'

function App() {
  const [view, setView] = useState('splash') 
  const [gender, setGender] = useState('female')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [uid, setUid] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Weather & Outfit
  const [weather, setWeather] = useState(null)
  const [currentOutfit, setCurrentOutfit] = useState(null)
  const [outfitLoading, setOutfitLoading] = useState(false)

  // Forgotten items & Alerts
  const [forgottenItems, setForgottenItems] = useState([])
  const [showAlertModal, setShowAlertModal] = useState(false)

  // Loading Phrases
  const [loadingPhrase, setLoadingPhrase] = useState("Analyse de ton dressing...")
  const phrases = [
    "Analyse de ton dressing...",
    "Vérification de la météo locale...",
    "Création de la tenue parfaite...",
    "Coordination des couleurs...",
    "Presque prêt ! ✨"
  ]

  // Image handling
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const camInputRef = useRef(null)

  // Current Item state (for add flow)
  const [newItem, setNewItem] = useState({
    type: 'Robe',
    color: 'Rose',
    season: 'Été',
    activity: 'Quotidien',
    icon: '👗'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', gender)
  }, [gender])

  useEffect(() => {
    if (view === 'dashboard' || view === 'outfit-result' || view === 'settings') {
      if (!weather) initWeather()
      checkForForgottenItems()
    }
  }, [view, items])

  useEffect(() => {
    let interval;
    if (view === 'loading-ai' || view === 'loading-outfit') {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % phrases.length;
        setLoadingPhrase(phrases[i]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [view])

  const initWeather = async () => {
    const data = await getLocalWeather()
    setWeather(data)
  }

  // --- UTILS ---

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1
    if (month >= 3 && month <= 5) return 'Printemps'
    if (month >= 6 && month <= 8) return 'Été'
    if (month >= 9 && month <= 11) return 'Automne'
    return 'Hiver'
  }

  const checkForForgottenItems = () => {
    const currentSeason = getCurrentSeason()
    const now = new Date()
    const thresholdDays = 60 

    const forgotten = items.filter(item => {
      if (item.season !== currentSeason && item.season !== 'Toutes saisons') return false
      const lastWorn = new Date(item.last_worn_date || item.created_at)
      const diffTime = Math.abs(now - lastWorn)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > thresholdDays
    })
    setForgottenItems(forgotten)
  }

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

  const handleUpdateLastWorn = async (itemIds) => {
    setLoading(true)
    const ids = Array.isArray(itemIds) ? itemIds : [itemIds]
    const { error } = await supabase
      .from('clothes')
      .update({ last_worn_date: new Date().toISOString() })
      .in('id', ids)

    if (error) {
      alert("Erreur lors de la mise à jour.")
    } else {
      await fetchItems(uid)
      if (view === 'outfit-result') {
        alert("Tenue validée ! Bon style ✨")
        setView('dashboard')
      }
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
    setEmail(profile.email || '')
    await fetchItems(profile.id)
    setView('dashboard')
    setLoading(false)
  }

  const uploadImageToStorage = async (file) => {
    const fileName = `${uid}-${Date.now()}.jpg`
    const { data, error } = await supabase.storage
      .from('clothes-images')
      .upload(fileName, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('clothes-images')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleAddItem = async () => {
    setLoading(true)
    try {
      const { error: addError } = await supabase
        .from('clothes')
        .insert([{
          profile_id: uid,
          type: newItem.type,
          color: newItem.color,
          season: newItem.season,
          activity: newItem.activity,
          icon: getIconForType(newItem.type),
          image_url: selectedImage,
          last_worn_date: new Date().toISOString()
        }])
      
      if (addError) throw addError

      await fetchItems(uid)
      setSelectedImage(null)
      setView('dashboard')
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'ajout : " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateOutfitRequest = async () => {
    if (items.length < 3) {
      alert("Ajoute au moins 3 ou 4 vêtements pour que l'IA puisse créer une tenue complète !")
      return
    }
    setOutfitLoading(true)
    setView('loading-outfit')
    try {
      const weatherData = weather || await getLocalWeather()
      const result = await generateOutfit(items, weatherData)
      setCurrentOutfit(result)
      setView('outfit-result')
    } catch (err) {
      alert("L'IA n'a pas pu générer de tenue. Réessaie !")
      setView('dashboard')
    } finally {
      setOutfitLoading(false)
    }
  }

  const getIconForType = (type) => {
    const icons = { 'Haut': '👕', 'Bas': '👖', 'Robe': '👗', 'Veste': '🧥', 'Chaussures': '👟', 'Accessoire': '👜' }
    return icons[type] || '✨'
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setView('loading-ai')
      setLoading(true)
      try {
        const [publicUrl, aiTags] = await Promise.all([
          uploadImageToStorage(file),
          analyzeClothing(file)
        ])
        setSelectedImage(publicUrl)
        setNewItem({ ...newItem, ...aiTags, icon: getIconForType(aiTags.type) })
        setView('add-detail')
      } catch (err) {
        setView('add-detail')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mon Code Dressflow', text: `Voici mon code d'accès : ${uid}` })
      } catch (err) { console.log(err) }
    } else {
      navigator.clipboard.writeText(uid); setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  const generateRandomUID = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''; for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
  }

  const formatUID = (val) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (cleaned.length > 4) return `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}`
    return cleaned
  }

  const findItemById = (id) => items.find(i => i.id === id)

  // --- SUB-COMPONENTS ---

  const BottomNav = () => (
    <div className="bottom-nav">
      <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
        <Home size={24} />
        <span>Dressing</span>
      </div>
      <div className={`nav-item ${view === 'outfit-result' ? 'active' : ''}`} onClick={() => {
        if (currentOutfit) setView('outfit-result')
        else handleGenerateOutfitRequest()
      }}>
        <Wand2 size={24} />
        <span>Styliste</span>
      </div>
      <div className="nav-item" onClick={() => setView('add-choice')}>
        <div className="add-nav-btn">
          <Plus size={32} />
        </div>
        <span>Ajouter</span>
      </div>
      <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
        <User size={24} />
        <span>Profil</span>
      </div>
    </div>
  )

  const isMainView = ['dashboard', 'outfit-result', 'settings'].includes(view)

  return (
    <div id="root">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="app-container">
        <AnimatePresence mode="wait">
          
          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="title" style={{ fontSize: '2.2rem' }}>Dressflow</h1>
              </header>

              {/* Weather & Info */}
              <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '15px' }}>
                    <Sun size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div>
                    <div className="subtitle" style={{ fontSize: '0.8rem' }}>{weather ? weather.description : 'Météo...'}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>{items.length} habits</div>
              </div>

              {/* ALERTS SECTION */}
              {forgottenItems.length > 0 && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={() => setShowAlertModal(true)} className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: '#fbbf24', color: 'white', padding: '8px', borderRadius: '10px' }}><AlertCircle size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e' }}>{forgottenItems.length} vêtements oubliés</div>
                    <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Clique pour trier ton dressing !</div>
                  </div>
                </motion.div>
              )}

              {loading ? <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={40} /></div> : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{ fontSize: '4rem' }}>🧥</div>
                  <h3 className="title" style={{ fontSize: '1.4rem' }}>Dressing vide</h3>
                  <p className="subtitle">Ajoute ton premier vêtement !</p>
                </div>
              ) : (
                <div className="item-grid">
                  {items.map(item => (
                    <div key={item.id} className="item-card" onClick={() => handleUpdateLastWorn(item.id)}>
                      <div className="item-image">
                        {item.image_url ? <img src={item.image_url} alt={item.type} /> : <span>{item.icon || '👕'}</span>}
                        <div className="worn-badge"><Calendar size={12} /></div>
                      </div>
                      <div className="item-info">
                        <div className="item-type">{item.type}</div>
                        <div className="item-meta">{item.activity} • {item.season}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* OUTFIT RESULT VIEW */}
          {view === 'outfit-result' && currentOutfit && (
            <motion.div key="outfit-result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="dashboard-container" style={{ width: '100%', paddingBottom: '3rem' }}>
              <h2 className="title" style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Tenue suggérée 🪄</h2>
              <p className="subtitle" style={{ marginBottom: '2rem' }}>{currentOutfit.explanation}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id).map((id, idx) => {
                  const item = findItemById(id)
                  if (!item) return null
                  return (
                    <div key={idx} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem' }}>
                      <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.5)', borderRadius: '15px', overflow: 'hidden' }}>
                        {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '2rem', textAlign: 'center', lineHeight: '80px' }}>{item.icon}</div>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800 }}>{item.type}</div>
                        <div className="subtitle" style={{ fontSize: '0.8rem' }}>{item.color} • {item.activity}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button onClick={() => handleUpdateLastWorn([currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id))} className="btn-primary" style={{ display: 'flex', gap: '10px' }}>
                  <Check size={20} /> Je porte ça aujourd'hui !
                </button>
                <button onClick={handleGenerateOutfitRequest} className="btn-secondary" style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.5)' }}>
                  <RefreshCw size={20} /> Autre proposition
                </button>
              </div>
            </motion.div>
          )}

          {/* SETTINGS VIEW */}
          {view === 'settings' && (
            <motion.div key="settings" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="dashboard-container">
              <h2 className="title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Mon Profil</h2>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <Mail size={24} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Lier mon compte</h3>
                </div>
                <input type="email" placeholder="votre@email.com" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn-primary" onClick={handleLinkEmail} disabled={!email || loading} style={{ marginTop: '0.5rem' }}>Sauvegarder</button>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <button onClick={() => setView('splash')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'none', border: 'none', color: '#f43f5e', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', width: '100%' }}>
                  <LogOut size={24} /> Déconnexion
                </button>
              </div>
            </motion.div>
          )}

          {/* LOADING VIEWS */}
          {(view === 'loading-ai' || view === 'loading-outfit') && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-auto text-center" style={{ textAlign: 'center', width: '100%' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ fontSize: '5rem', marginBottom: '2rem' }}>
                {view === 'loading-ai' ? '🧠' : '🪄'}
              </motion.div>
              <h2 className="title" style={{ fontSize: '1.8rem' }}>{loadingPhrase}</h2>
            </motion.div>
          )}

          {/* SPLASH, LOGIN, REGISTER, SUCCESS */}
          {view === 'splash' && (
            <motion.div key="splash" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="logo-container">
                <motion.img src={logoImg} alt="Dressflow Logo" style={{ width: '180px', height: 'auto', marginBottom: '1rem' }} initial={{ scale: 0.8 }} animate={{ scale: 1 }} />
                <h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1>
                <p className="subtitle">L'IA au service de votre style.</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
                <button onClick={() => setView('register')} className="btn-primary">Créer mon dressing ✨</button>
                <button onClick={() => setView('login')} className="btn-secondary">J'ai déjà un code d'accès</button>
              </div>
            </motion.div>
          )}
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="glass-card my-auto">
              <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Connexion</h2>
              <input type="text" placeholder="Ex: AB12 - CD34" className="input-styled" value={formatUID(inputCode)} onChange={(e) => setInputCode(e.target.value)} maxLength={11} />
              <button className="btn-primary" onClick={handleLogin} disabled={inputCode.length < 8 || loading} style={{ marginTop: '2rem' }}>{loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight size={20} /></>}</button>
            </motion.div>
          )}
          {view === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="glass-card my-auto">
              <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Nouveau Dressing</h2>
              <input type="text" placeholder="Ton prénom" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="gender-toggle">
                <button className={`gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Femme</button>
                <button className={`gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Homme</button>
                <button className={`gender-btn ${gender === 'neutral' ? 'active' : ''}`} onClick={() => setGender('neutral')}>Neutre</button>
              </div>
              <button className="btn-primary" onClick={handleRegister} disabled={!name || loading}>{loading ? <Loader2 className="animate-spin" /> : <>C'est parti <ArrowRight size={20} /></>}</button>
            </motion.div>
          )}
          {view === 'success' && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card my-auto" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>✨</div>
              <h2 className="title" style={{ fontSize: '2.2rem' }}>Bravo {name} !</h2>
              <p className="subtitle" style={{ margin: '0 auto 2rem auto' }}>Note bien ce code unique pour ton dressing.</p>
              <div className="uid-box"><div className="uid-text">{uid}</div></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(uid); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ flex: 1 }}>{copied ? 'Copié !' : 'Copier'}</button>
                <button className="btn-primary" onClick={handleShare} style={{ background: 'rgba(255,255,255,0.8)', color: '#000', width: '80px', boxShadow: 'none' }}><Share2 size={24} /></button>
              </div>
              <button onClick={() => setView('dashboard')} className="btn-secondary" style={{ marginTop: '2.5rem' }}>Accéder à mon dressing</button>
            </motion.div>
          )}

          {/* ADD FLOW VIEWS */}
          {view === 'add-choice' && (
            <motion.div key="add-choice" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="glass-card" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '40px 40px 0 0', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="title" style={{ fontSize: '1.6rem' }}>Ajouter un habit</h2>
                <button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none' }}><X size={28} /></button>
              </div>
              <input type="file" accept="image/*" capture="environment" ref={camInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => camInputRef.current.click()} className="btn-primary" style={{ flex: 1, height: '140px', flexDirection: 'column', background: 'white', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}><Camera size={32} /> Photo</button>
                <button onClick={() => fileInputRef.current.click()} className="btn-primary" style={{ flex: 1, height: '140px', flexDirection: 'column', background: 'white', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}><ImageIcon size={32} /> Galerie</button>
              </div>
            </motion.div>
          )}

          {view === 'add-detail' && (
            <motion.div key="add-detail" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container" style={{ width: '100%', paddingBottom: '3rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                {selectedImage ? <img src={selectedImage} alt="Preview" style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: '200px', objectFit: 'contain' }} /> : <div style={{ fontSize: '6rem' }}>👗</div>}
                <p style={{ marginTop: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Vérification des infos ✨</p>
              </div>
              <div className="glass-card" style={{ gap: '1.2rem', display: 'flex', flexDirection: 'column' }}>
                <h2 className="title" style={{ fontSize: '1.6rem' }}>Détails</h2>
                <div>
                  <label className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block' }}>Type</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{['Haut', 'Bas', 'Robe', 'Veste', 'Chaussures', 'Accessoire'].map(t => (<span key={t} className={`tag-pill ${newItem.type === t ? 'active' : ''}`} onClick={() => setNewItem({...newItem, type: t})}>{t}</span>))}</div>
                </div>
                <div>
                  <label className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block' }}>Couleur</label>
                  <input type="text" className="input-styled" style={{ padding: '0.8rem' }} value={newItem.color} onChange={(e) => setNewItem({...newItem, color: e.target.value})} />
                </div>
                <div>
                  <label className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block' }}>Saison</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{['Printemps', 'Été', 'Automne', 'Hiver', 'Toutes saisons'].map(s => (<span key={s} className={`tag-pill ${newItem.season === s ? 'active' : ''}`} onClick={() => setNewItem({...newItem, season: s})}>{s}</span>))}</div>
                </div>
                <div>
                  <label className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '0.4rem', display: 'block' }}>Activité</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{['Quotidien', 'Travail', 'Sport', 'Soirée', 'Détente'].map(a => (<span key={a} className={`tag-pill ${newItem.activity === a ? 'active' : ''}`} onClick={() => setNewItem({...newItem, activity: a})}>{a}</span>))}</div>
                </div>
                <button onClick={handleAddItem} className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>{loading ? <Loader2 className="animate-spin" /> : <>Confirmer et ajouter</>}</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ALERTS MODAL */}
        <AnimatePresence>
          {showAlertModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAlertModal(false)}>
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 className="title" style={{ fontSize: '1.5rem' }}>Oubliés du dressing</h2>
                  <button onClick={() => setShowAlertModal(false)} style={{ background: 'none', border: 'none' }}><X size={24} /></button>
                </div>
                <p className="subtitle" style={{ marginBottom: '2rem' }}>Pièces de saison non portées depuis +60 jours.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {forgottenItems.map(item => (
                    <div key={item.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.4)' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '10px', overflow: 'hidden' }}>{item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span>{item.icon}</span>}</div>
                      <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700 }}>{item.type} ({item.color})</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setShowAlertModal(false)} className="action-btn-small"><Heart size={16} /></button>
                        <button onClick={() => console.log('Vendre')} className="action-btn-small"><ShoppingBag size={16} /></button>
                        <button onClick={() => console.log('Donner')} className="action-btn-small"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowAlertModal(false)} className="btn-primary" style={{ marginTop: '2rem' }}>Fermer</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMainView && <BottomNav />}
      </div>
    </div>
  )
}

export default App
