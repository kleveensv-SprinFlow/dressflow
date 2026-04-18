import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shirt, Copy, ChevronLeft, Check, LogIn, Share2, 
  Plus, Camera, Image as ImageIcon, Sparkles, 
  Tag, Palette, Sun, Briefcase, X, ArrowRight, Loader2,
  Settings, Mail, ShieldCheck, LogOut, AlertCircle
} from 'lucide-react'

// Styles & DB
import './styles/index.css'
import { supabase } from './lib/supabase'

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
  
  // Image handling
  const [selectedImage, setSelectedImage] = useState(null) // Local URL for preview
  const [originalFile, setOriginalFile] = useState(null) // Real file to upload
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
      let finalImageUrl = null
      
      if (originalFile) {
        finalImageUrl = await uploadImageToStorage(originalFile)
      }

      const { error: addError } = await supabase
        .from('clothes')
        .insert([{
          profile_id: uid,
          type: newItem.type,
          color: newItem.color,
          season: newItem.season,
          activity: newItem.activity,
          icon: newItem.icon,
          image_url: finalImageUrl
        }])
      
      if (addError) throw addError

      await fetchItems(uid)
      setSelectedImage(null)
      setOriginalFile(null)
      setView('dashboard')
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'ajout : " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkEmail = async () => {
    setLoading(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email })
      .eq('id', uid)
    
    if (updateError) {
      alert("Erreur lors de l'enregistrement de l'email.")
    } else {
      alert("Email enregistré ! Un mail de confirmation va vous être envoyé.")
    }
    setLoading(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setOriginalFile(file)
      setSelectedImage(URL.createObjectURL(file))
      setView('add-detail') // Direct to details view
    }
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
      navigator.clipboard.writeText(uid)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const generateRandomUID = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // --- UI UTILS ---
  const formatUID = (val) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (cleaned.length > 4) return `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}`
    return cleaned
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
            <motion.div key="splash" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="logo-container">
                <motion.img 
                  src={logoImg} 
                  alt="Dressflow Logo" 
                  style={{ width: '180px', height: 'auto', marginBottom: '1rem' }}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12 }}
                />
                <h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1>
                <p className="subtitle">L'IA au service de votre style.</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
                <button onClick={() => setView('register')} className="btn-primary">Créer mon dressing ✨</button>
                <button onClick={() => setView('login')} className="btn-secondary">J'ai déjà un code d'accès</button>
              </div>
            </motion.div>
          )}

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="glass-card my-auto">
              <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Connexion</h2>
              <input 
                type="text" 
                placeholder="Ex: AB12 - CD34" 
                className="input-styled" 
                value={formatUID(inputCode)} 
                onChange={(e) => setInputCode(e.target.value)} 
                maxLength={11}
              />
              <button className="btn-primary" onClick={handleLogin} disabled={inputCode.length < 8 || loading} style={{ marginTop: '2rem' }}>
                {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight size={20} /></>}
              </button>
            </motion.div>
          )}

          {/* REGISTER VIEW */}
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

          {/* SUCCESS VIEW */}
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

          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1>
                <div onClick={() => setView('settings')} style={{ cursor: 'pointer', padding: '10px' }}>
                  <Settings size={28} color="var(--text-main)" />
                </div>
              </header>
              {loading ? <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={40} /></div> : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <div style={{ fontSize: '4rem' }}>🧥</div>
                  <h3 className="title" style={{ fontSize: '1.4rem' }}>Dressing vide</h3>
                  <button onClick={() => setView('add-choice')} className="btn-primary" style={{ marginTop: '2rem' }}>Ajouter un habit</button>
                </div>
              ) : (
                <div className="item-grid">
                  {items.map(item => (
                    <div key={item.id} className="item-card">
                      <div className="item-image">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.type} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
                        ) : (
                          item.icon || '👕'
                        )}
                      </div>
                      <div className="item-info">
                        <div className="item-type">{item.type}</div>
                        <div className="item-meta">{item.activity} • {item.season}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="fab" onClick={() => setView('add-choice')}><Plus size={35} /></button>
            </motion.div>
          )}

          {/* SETTINGS VIEW */}
          {view === 'settings' && (
            <motion.div key="settings" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card my-auto">
              <button onClick={() => setView('dashboard')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <h2 className="title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Paramètres</h2>
              
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <Mail size={24} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Sécuriser mon compte</h3>
                </div>
                <p className="subtitle" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Liez votre email pour ne jamais perdre vos données.</p>
                <input type="email" placeholder="votre@email.com" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn-primary" onClick={handleLinkEmail} disabled={!email || loading} style={{ marginTop: '0.5rem' }}>Lier mon email</button>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <button onClick={() => setView('splash')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'none', border: 'none', color: '#f43f5e', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', width: '100%' }}>
                  <LogOut size={24} /> Déconnexion
                </button>
              </div>
            </motion.div>
          )}

          {/* ADD CHOICE & FLOW */}
          {view === 'add-choice' && (
            <motion.div key="add-choice" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="glass-card" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '40px 40px 0 0', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="title" style={{ fontSize: '1.6rem' }}>Ajouter un habit</h2>
                <button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none' }}><X size={28} /></button>
              </div>
              
              {/* Hidden Inputs */}
              <input type="file" accept="image/*" capture="environment" ref={camInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => camInputRef.current.click()} className="btn-primary" style={{ flex: 1, height: '140px', flexDirection: 'column', background: 'white', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}><Camera size={32} /> Photo</button>
                <button onClick={() => fileInputRef.current.click()} className="btn-primary" style={{ flex: 1, height: '140px', flexDirection: 'column', background: 'white', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}><ImageIcon size={32} /> Galerie</button>
              </div>
            </motion.div>
          )}

          {view === 'add-detail' && (
            <motion.div key="add-detail" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container" style={{ width: '100%' }}>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                {selectedImage ? (
                  <img src={selectedImage} alt="Selected" style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: '200px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ fontSize: '6rem' }}>👗</div>
                )}
                <p style={{ marginTop: '1rem', fontWeight: 700, color: 'var(--primary)' }}>Aperçu de la photo ✨</p>
              </div>
              
              <div className="glass-card" style={{ gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <h2 className="title" style={{ fontSize: '1.6rem' }}>Vérification</h2>
                
                <div>
                  <label className="subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Type</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['Robe', 'Haut', 'Bas', 'Veste'].map(t => (
                      <span key={t} className={`tag-pill ${newItem.type === t ? 'active' : ''}`} onClick={() => setNewItem({...newItem, type: t})}>{t}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Activité</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['Quotidien', 'Travail', 'Sport', 'Soirée'].map(a => (
                      <span key={a} className={`tag-pill ${newItem.activity === a ? 'active' : ''}`} onClick={() => setNewItem({...newItem, activity: a})}>{a}</span>
                    ))}
                  </div>
                </div>

                <button onClick={handleAddItem} className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                  {loading ? <Loader2 className="animate-spin" /> : <>Valider et ajouter</>}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
