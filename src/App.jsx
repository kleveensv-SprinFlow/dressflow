import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shirt, Copy, ChevronLeft, Check, LogIn, Share2, 
  Plus, Camera, Image as ImageIcon, Sparkles, 
  Tag, Palette, Sun, Briefcase, X, ArrowRight, Loader2,
  Settings, Mail, ShieldCheck, LogOut, AlertCircle,
  Thermometer, CloudRain, Wind, Wand2, RefreshCw,
  Calendar, Trash2, Heart, ShoppingBag, Home, User,
  LifeBuoy, FileText, ShieldAlert, Key, Lock, Search,
  MapPin, Luggage, Plane, ListChecks, ChevronRight,
  UserCircle, Edit3, Save, Info, MapPinned, History,
  Eye, EyeOff, UploadCloud, Dices, Layers
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { App as CapApp } from '@capacitor/app'

// Styles & DB & Services
import './styles/index.css'
import { supabase } from './lib/supabase'
import { analyzeClothing, generateOutfit } from './services/ai'
import { getLocalWeather, searchCity } from './services/weather'

const RotatingClothes = () => {
  const icons = ['👕', '👖', '👗', '🧥', '👟', '👜']
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % icons.length), 2000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>
      <AnimatePresence mode="wait">
        <motion.div key={icons[index]} initial={{ y: 20, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: -20, opacity: 0, rotate: 10 }} transition={{ duration: 0.5 }}>
          {icons[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Composant pour le slider horizontal ludique (Slot Machine style)
const CategorySlider = ({ title, items, selectedId, onSelect }) => {
  if (items.length === 0) return null
  return (
    <div className="slider-category">
      <div className="slider-header">
        <span className="slider-title">{title}</span>
        <span className="slider-count">{items.length} options</span>
      </div>
      <div className="slider-scroll">
        {items.map(item => (
          <div 
            key={item.id} 
            className={`slider-card ${selectedId === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <div className="slider-image">
              {item.image_url ? <img src={item.image_url} /> : <div className="slider-icon">{item.icon}</div>}
            </div>
            {selectedId === item.id && <div className="slider-check"><Check size={12} /></div>}
          </div>
        ))}
        {/* Option "Aucun" pour les couches optionnelles (Veste, Accessoires) */}
        {['Tête', 'Couche', 'Sac'].includes(title) && (
          <div className={`slider-card ${!selectedId ? 'active' : ''}`} onClick={() => onSelect(null)}>
            <div className="slider-image"><X size={20} opacity={0.3} /></div>
            <div className="slider-label">Aucun</div>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState('splash') 
  const [gender, setGender] = useState('female')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false)
  const [uid, setUid] = useState('') 
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [loginMode, setLoginMode] = useState('code')
  
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(null)
  const [error, setError] = useState(null)
  
  const [citySearch, setCitySearch] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [showCityModal, setShowCityModal] = useState(false)
  const [cityModalMode, setCityModalMode] = useState('home')
  const [activeFilter, setActiveFilter] = useState('Tous')
  
  const [travelData, setTravelData] = useState({ destination: '', lat: null, lon: null })
  const [suitcase, setSuitcase] = useState([])
  const [suitcaseLoading, setSuitcaseLoading] = useState(false)
  
  // Styliste States
  const [stylistMode, setStylistMode] = useState('ai') // 'ai' ou 'manual'
  const [currentOutfit, setCurrentOutfit] = useState(null)
  const [manualOutfit, setManualOutfit] = useState({ head: null, top: null, layer: null, bottom: null, feet: null, bag: null })
  const [outfitLoading, setOutfitLoading] = useState(false)
  
  const [forgottenItems, setForgottenItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const [tempAvatarFile, setTempAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const avatarInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  const ALL_TYPES = ['T-shirt', 'Crop-top', 'Hoodie', 'Sweat', 'Chemise', 'Polo', 'Top', 'Blouse', 'Jean', 'Pantalon', 'Short', 'Jupe', 'Legging', 'Chino', 'Robe', 'Veste', 'Blazer', 'Manteau', 'Parka', 'Trench', 'Cardigan', 'Pull', 'Maillot de bain', 'Pyjama', 'Basket', 'Bottes', 'Sandales', 'Escarpins', 'Accessoire', 'Sac', 'Casquette', 'Bonnet']
  const ALL_COLORS = ['Blanc', 'Noir', 'Gris', 'Beige', 'Marine', 'Bleu Ciel', 'Kaki', 'Vert Sapin', 'Bordeaux', 'Rouge', 'Rose Poudré', 'Rose', 'Moutarde', 'Jaune', 'Lilas', 'Violet', 'Terracotta', 'Orange', 'Or', 'Argent', 'Marron', 'Camel']
  const ALL_ACTIVITIES = ['Quotidien', 'Sport', 'Soirée', 'Travail']

  const [newItem, setNewItem] = useState({ type: 'T-shirt', color: 'Blanc', season: 'Été', activity: 'Quotidien', icon: '👕' })
  const [selectedImage, setSelectedImage] = useState(null)
  const [tempFile, setTempFile] = useState(null)

  useEffect(() => { document.documentElement.setAttribute('data-theme', gender) }, [gender])
  
  useEffect(() => {
    const savedSuitcase = localStorage.getItem('suitcase')
    const savedTravel = localStorage.getItem('travelData')
    if (savedSuitcase) setSuitcase(JSON.parse(savedSuitcase))
    if (savedTravel) setTravelData(JSON.parse(savedTravel))
  }, [])

  useEffect(() => {
    localStorage.setItem('suitcase', JSON.stringify(suitcase))
    localStorage.setItem('travelData', JSON.stringify(travelData))
  }, [suitcase, travelData])

  useEffect(() => { 
    checkUserSession()
    CapApp.addListener('appUrlOpen', data => {
      const url = new URL(data.url.replace('#', '?'))
      const accessToken = url.searchParams.get('access_token')
      const refreshToken = url.searchParams.get('refresh_token')
      if (accessToken && refreshToken) supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsEmailConfirmed(true); setEmail(session.user.email); await syncProfile(session.user.email);
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (['dashboard', 'outfit-result', 'settings', 'travel'].includes(view)) {
      if (!weather && !weatherLoading) initWeather(); checkForForgottenItems();
    }
  }, [view, items])

  const initWeather = async (lat = null, lon = null, cityName = null) => {
    setWeatherLoading(true); setWeatherError(null)
    try {
      const data = await getLocalWeather(lat, lon); if (cityName) data.city = cityName; setWeather(data)
    } catch (err) { setWeatherError("Position introuvable.") } finally { setWeatherLoading(false) }
  }

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) { setIsEmailConfirmed(true); setEmail(session.user.email); await syncProfile(session.user.email); }
  }

  const syncProfile = async (userEmail) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).single()
    if (profile) {
      setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email); setAvatarUrl(profile.avatar_url);
      await fetchItems(profile.id); if (['splash', 'login', 'register', 'complete-profile'].includes(view)) setView('dashboard');
    }
  }

  const fetchItems = async (profileId) => {
    setLoading(true); const { data } = await supabase.from('clothes').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    setItems(data || []); setLoading(false)
  }

  const handleLogout = async () => {
    if (!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUid(''); setName(''); setEmail(''); setItems([]); setIsEmailConfirmed(false); setAvatarUrl(null);
      setSuitcase([]); setCurrentOutfit(null); setForgottenItems([]); setWeather(null); 
      setTravelData({ destination: '', lat: null, lon: null });
      localStorage.removeItem('suitcase'); localStorage.removeItem('travelData');
      setView('splash')
    } catch (err) { alert("Erreur") } finally { setLoading(false) }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) { setTempAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  }

  const handleDeleteAvatar = async () => {
    if (!window.confirm("Supprimer la photo de profil ?")) return
    setLoading(true)
    try {
      if (avatarUrl) {
        const path = avatarUrl.split('/').pop()
        await supabase.storage.from('avatars').remove([path])
      }
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', uid)
      setAvatarUrl(null); setAvatarPreview(null); setTempAvatarFile(null);
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const handleCompleteProfile = async () => {
    if (!email || !password || password !== confirmPassword) { alert("Vérifie tes mots de passe !"); return; }
    setLoading(true)
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single()
      if (existing) throw new Error("Cet email est déjà lié à un autre dressing.")
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      let finalAvatarUrl = avatarUrl
      if (tempAvatarFile) {
        const fileName = `avatar-${uid}-${Date.now()}.jpg`
        await supabase.storage.from('avatars').upload(fileName, tempAvatarFile)
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
        finalAvatarUrl = publicUrl
      }
      await supabase.from('profiles').update({ email, user_id: authData.user.id, avatar_url: finalAvatarUrl }).eq('id', uid)
      setIsEmailConfirmed(true); setAvatarUrl(finalAvatarUrl); setView('dashboard')
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const handleAddItem = async () => {
    if (!uid || !tempFile) return; setLoading(true)
    try {
      const fileName = `${uid}-${Date.now()}.jpg`
      await supabase.storage.from('clothes-images').upload(fileName, tempFile)
      const { data: { publicUrl } } = supabase.storage.from('clothes-images').getPublicUrl(fileName)
      await supabase.from('clothes').insert([{ profile_id: uid, ...newItem, image_url: publicUrl, last_worn_date: new Date().toISOString() }])
      await fetchItems(uid); setView('dashboard'); setSelectedImage(null); setTempFile(null)
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const handleUpdateLastWorn = async (item) => {
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).eq('id', item.id); await fetchItems(uid); setSelectedItem(null);
  }

  const handleGenerateOutfitRequest = async () => {
    if (items.length < 3) { alert("Ajoute plus d'habits !"); return; }
    setOutfitLoading(true); setStylistMode('ai')
    try {
      const result = await generateOutfit(items, weather || await getLocalWeather())
      setCurrentOutfit(result); setView('outfit-result')
    } catch (err) { alert("Erreur") } finally { setOutfitLoading(false) }
  }

  const handleValidateOutfit = async () => {
    const ids = stylistMode === 'ai' 
      ? [currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id)
      : Object.values(manualOutfit).filter(id => id)
    
    if (ids.length === 0) return
    setLoading(true)
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).in('id', ids)
    await fetchItems(uid); setView('dashboard'); alert("Tenue validée ! ✨"); setLoading(false)
  }

  const handleCitySearch = (val) => {
    setCitySearch(val); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (val.length > 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchCity(val); setCityResults(results)
      }, 500)
    } else setCityResults([])
  }

  const handleSelectCity = (city) => {
    if (cityModalMode === 'home') initWeather(city.latitude, city.longitude, city.name);
    else setTravelData({ destination: city.name, lat: city.latitude, lon: city.longitude });
    setShowCityModal(false); setCitySearch(''); setCityResults([])
  }

  const handleGenerateSuitcase = async () => {
    if (!travelData.lat) { alert("Destination ?"); return; }
    setSuitcaseLoading(true)
    try {
      const destWeather = await getLocalWeather(travelData.lat, travelData.lon)
      const suggestions = items.filter(item => getItemWeatherScore(item, destWeather.temp) > 0).slice(0, 10).map(s => ({ ...s, checked: false }))
      setSuitcase(suggestions)
    } catch (err) { alert("Erreur") } finally { setSuitcaseLoading(false) }
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Supprimer ?")) return
    setLoading(true); await supabase.from('clothes').delete().eq('id', id); await fetchItems(uid); setSelectedItem(null); setLoading(false)
  }

  const handleUpdateItem = async () => {
    setLoading(true); await supabase.from('clothes').update({ ...editForm }).eq('id', selectedItem.id); await fetchItems(uid); setIsEditing(false); setSelectedItem({ ...selectedItem, ...editForm }); setLoading(false)
  }

  const handleRegister = async () => {
    if (!name) { alert("Prénom requis !"); return; }
    setLoading(true)
    try {
      const newUid = generateRandomUID()
      const { error } = await supabase.from('profiles').insert([{ id: newUid, name, gender }])
      if (error) throw error
      setUid(newUid); setView('success')
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const handleLogin = async () => {
    setLoading(true); setError(null)
    try {
      if (loginMode === 'code') {
        const cleanCode = inputCode.replace(/[^A-Z0-9]/g, '')
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', cleanCode).single()
        if (!profile) throw new Error("Code invalide")
        setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email || ''); setAvatarUrl(profile.avatar_url);
        await fetchItems(profile.id); setView('dashboard')
      } else {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
        if (authErr) throw authErr
        await syncProfile(email);
      }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setView('loading-ai'); setLoading(true)
      try {
        const aiTags = await analyzeClothing(file)
        setNewItem({ ...newItem, ...aiTags, icon: getIconForType(aiTags.type), activity: 'Quotidien' })
        setTempFile(file); setSelectedImage(URL.createObjectURL(file)); setView('add-detail')
      } catch (err) { setView('add-detail') } finally { setLoading(false) }
    }
  }

  const getIconForType = (type) => {
    const icons = { 'T-shirt': '👕', 'Hoodie': '🧥', 'Pantalon': '👖', 'Jean': '👖', 'Robe': '👗', 'Veste': '🧥', 'Basket': '👟', 'Sac': '👜', 'Short': '🩳' }; return icons[type] || '✨'
  }

  const generateRandomUID = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let res = ''; for (let i = 0; i < 8; i++) res += chars.charAt(Math.floor(Math.random() * chars.length)); return res
  }

  const formatUID = (val) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (cleaned.length > 4) return `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}`
    return cleaned
  }

  const checkForForgottenItems = () => {
    const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const forgotten = items.filter(item => new Date(item.last_worn_date || item.created_at) < sixtyDaysAgo)
    setForgottenItems(forgotten.slice(0, 5))
  }

  const findItemById = (id) => items.find(item => item.id === id)

  const getItemWeatherScore = (item, temp) => {
    let score = 0; if (temp < 12) { if (['Manteau', 'Parka', 'Pull'].includes(item.type)) score += 10; if (item.season === 'Hiver') score += 5; }
    else if (temp > 22) { if (['Short', 'T-shirt'].includes(item.type)) score += 10; if (item.season === 'Été') score += 5; }
    else if (['Printemps', 'Automne', 'Toutes saisons'].includes(item.season)) score += 5; return score
  }

  // Filtrage des items par catégorie pour le mode manuel
  const manualItems = useMemo(() => {
    return {
      head: items.filter(i => ['Bonnet', 'Casquette', 'Accessoire'].includes(i.type)),
      top: items.filter(i => ['T-shirt', 'Chemise', 'Top', 'Blouse', 'Polo', 'Robe'].includes(i.type)),
      layer: items.filter(i => ['Veste', 'Manteau', 'Pull', 'Cardigan', 'Blazer', 'Hoodie'].includes(i.type)),
      bottom: items.filter(i => ['Jean', 'Pantalon', 'Short', 'Jupe', 'Legging'].includes(i.type)),
      feet: items.filter(i => ['Basket', 'Bottes', 'Sandales', 'Escarpins'].includes(i.type)),
      bag: items.filter(i => ['Sac'].includes(i.type))
    }
  }, [items])

  const BottomNav = () => (
    <div className="bottom-nav">
      <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><Home size={22} /><span>Dressing</span></div>
      <div className={`nav-item ${view === 'travel' ? 'active' : ''}`} onClick={() => setView('travel')}><Plane size={22} /><span>Voyage</span></div>
      <div className="nav-item" onClick={() => setView('add-choice')}><div className="add-nav-btn"><Plus size={30} /></div><span>Ajouter</span></div>
      <div className={`nav-item ${view === 'outfit-result' ? 'active' : ''}`} onClick={() => setView('outfit-result')}><Wand2 size={22} /><span>Styliste</span></div>
      <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><User size={22} /><span>Profil</span></div>
    </div>
  )

  const isMainView = ['dashboard', 'outfit-result', 'settings', 'travel'].includes(view)

  return (
    <div id="root">
      <div className="bg-blobs"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
      <div className="app-container">
        <AnimatePresence mode="wait">
          
          {/* ... AUTRES VUES (SPLASH, LOGIN, REGISTER, SUCCESS) ... */}
          {view === 'splash' && (
            <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="logo-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <RotatingClothes />
                <h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1>
                <p className="subtitle">L'IA au service de votre style.</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
                <button onClick={() => setView('register')} className="btn-primary">Créer mon dressing ✨</button>
                <button onClick={() => setView('login')} className="btn-secondary">J'ai déjà un compte</button>
              </div>
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div key="register" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ background: 'var(--primary)', color: 'white', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><UserCircle size={35} /></div>
                <h2 className="title">Créer mon dressing</h2>
                <p className="subtitle">On commence par faire connaissance ?</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem', display: 'block', opacity: 0.6 }}>TON PRÉNOM</label>
                  <input type="text" placeholder="Ex: Marie" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem', display: 'block', opacity: 0.6 }}>TON STYLE PRÉFÉRÉ</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setGender('female')} className={`btn-secondary ${gender === 'female' ? 'active' : ''}`} style={{ flex: 1, border: gender === 'female' ? '2px solid var(--primary)' : '2px solid transparent' }}>👩 Femme</button>
                    <button onClick={() => setGender('male')} className={`btn-secondary ${gender === 'male' ? 'active' : ''}`} style={{ flex: 1, border: gender === 'male' ? '2px solid var(--primary)' : '2px solid transparent' }}>👨 Homme</button>
                  </div>
                </div>
                <button onClick={handleRegister} className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "C'est parti ! ✨"}</button>
                <button onClick={() => setView('splash')} style={{ background: 'none', border: 'none', fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>Retour</button>
              </div>
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div key="login" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <h2 className="title" style={{ textAlign: 'center' }}>Bon retour ! 👋</h2>
              <div className="filter-bar" style={{ margin: '1.5rem 0' }}>
                <button className={`filter-pill ${loginMode === 'code' ? 'active' : ''}`} onClick={() => setLoginMode('code')}>Code Secret</button>
                <button className={`filter-pill ${loginMode === 'email' ? 'active' : ''}`} onClick={() => setLoginMode('email')}>Email</button>
              </div>
              {loginMode === 'code' ? (
                <>
                  <p className="subtitle" style={{ textAlign: 'center' }}>Saisis ton code à 8 caractères.</p>
                  <input type="text" placeholder="XXXX - XXXX" className="input-styled" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '2px' }} value={formatUID(inputCode)} onChange={(e) => setInputCode(e.target.value.toUpperCase())} maxLength={11} />
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="email" placeholder="Email" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input type="password" placeholder="Mot de passe" className="input-styled" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              )}
              {error && <div style={{ color: '#f43f5e', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center', fontWeight: 700 }}><AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> {error}</div>}
              <button className="btn-primary" onClick={handleLogin} style={{ marginTop: '2rem' }} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Me connecter"}</button>
              <button onClick={() => setView('splash')} style={{ background: 'none', border: 'none', fontSize: '0.8rem', opacity: 0.5, fontWeight: 700, width: '100%', marginTop: '1rem' }}>Retour</button>
            </motion.div>
          )}

          {/* SECTION STYLISTE DUAL (LUDIQUE) */}
          {view === 'outfit-result' && (
            <motion.div key="outfit-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '1.5rem' }}>
                <h2 className="title" style={{ fontSize: '2.2rem' }}>Mon Studio 🎨</h2>
                <div className="filter-bar" style={{ marginTop: '1rem' }}>
                  <button className={`filter-pill ${stylistMode === 'ai' ? 'active' : ''}`} onClick={() => setStylistMode('ai')}><Sparkles size={14} /> IA ✨</button>
                  <button className={`filter-pill ${stylistMode === 'manual' ? 'active' : ''}`} onClick={() => setStylistMode('manual')}><Dices size={14} /> Mélangeur 🎮</button>
                </div>
              </header>

              {stylistMode === 'ai' ? (
                <div style={{ marginTop: '1rem' }}>
                  {outfitLoading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto 1.5rem' }} /><p className="subtitle">L'IA analyse ton dressing...</p></div>
                  ) : currentOutfit ? (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                      <p className="subtitle" style={{ fontSize: '1rem', lineHeight: '1.4', marginBottom: '1.5rem' }}>{currentOutfit.explanation}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {[currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id).map(id => {
                          const item = findItemById(id); if (!item) return null;
                          return (
                            <div key={id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem' }}>
                              <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>{item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '2rem', textAlign: 'center', lineHeight: '60px' }}>{item.icon}</div>}</div>
                              <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: '1rem' }}>{item.type}</div><div className="subtitle" style={{ fontSize: '0.8rem', marginTop: 0 }}>{item.color}</div></div>
                            </div>
                          )
                        })}
                      </div>
                      <button className="btn-primary" onClick={handleValidateOutfit} disabled={loading}><Check size={20} /> Je porte cette tenue !</button>
                      <button className="btn-secondary" onClick={handleGenerateOutfitRequest} style={{ marginTop: '1rem' }}><RefreshCw size={20} /> Autre proposition IA</button>
                    </motion.div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '4rem' }}><button className="btn-primary" onClick={handleGenerateOutfitRequest}>Générer une tenue IA ✨</button></div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: '1rem', paddingBottom: '4rem' }}>
                  <CategorySlider title="Tête" items={manualItems.head} selectedId={manualOutfit.head} onSelect={(id) => setManualOutfit({...manualOutfit, head: id})} />
                  <CategorySlider title="Haut" items={manualItems.top} selectedId={manualOutfit.top} onSelect={(id) => setManualOutfit({...manualOutfit, top: id})} />
                  <CategorySlider title="Couche" items={manualItems.layer} selectedId={manualOutfit.layer} onSelect={(id) => setManualOutfit({...manualOutfit, layer: id})} />
                  <CategorySlider title="Bas" items={manualItems.bottom} selectedId={manualOutfit.bottom} onSelect={(id) => setManualOutfit({...manualOutfit, bottom: id})} />
                  <CategorySlider title="Pieds" items={manualItems.feet} selectedId={manualOutfit.feet} onSelect={(id) => setManualOutfit({...manualOutfit, feet: id})} />
                  <CategorySlider title="Sac" items={manualItems.bag} selectedId={manualOutfit.bag} onSelect={(id) => setManualOutfit({...manualOutfit, bag: id})} />
                  
                  <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 100 }}>
                    <button className="btn-primary" onClick={handleValidateOutfit} disabled={loading} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                      {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Valider ce look ! ✨</>}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ... AUTRES VUES (DASHBOARD, TRAVEL, SETTINGS) ... */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1>
                <div onClick={() => { setCityModalMode('home'); setShowCityModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '12px' }}><MapPin size={14} /> {weather?.city || 'Localiser'}</div>
              </header>
              <div className="glass-card" onClick={() => { setCityModalMode('home'); setShowCityModal(true); }} style={{ padding: '1.2rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                {weatherLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Loader2 className="animate-spin" size={24} color="var(--primary)" /> <div className="subtitle">Localisation...</div></div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '18px' }}><Sun size={24} /></div><div><div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div><div className="subtitle" style={{ fontSize: '0.85rem', marginTop: 0 }}>{weather ? weather.description : 'Clique pour localiser'}</div></div></div>
                    <ChevronRight size={20} style={{ opacity: 0.3 }} />
                  </div>
                )}
              </div>
              <div className="filter-bar">{['Tous', 'Mes Hauts', 'Mes Bas', 'Extérieur', 'Robe', 'Sport', 'Soirée'].map(f => (<button key={f} className={`filter-pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>))}</div>
              <div className="item-grid">{items.map(item => (<div key={item.id} className="item-card" onClick={() => setSelectedItem(item)}><div className="item-image">{item.image_url ? <img src={item.image_url} alt={item.type} /> : <div style={{ fontSize: '3rem' }}>{item.icon}</div>}</div><div className="item-info"><div className="item-type">{item.type}</div><div className="item-meta">{item.color}</div></div></div>))}</div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
              <header style={{ marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mon Profil</h2></header>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 1.5rem' }}>
                  <div className="profile-avatar" style={{ overflow: 'hidden' }}>{avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (gender === 'female' ? '👩' : '👨')}</div>
                  {isEmailConfirmed && <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#10b981', color: 'white', borderRadius: '50%', padding: '4px' }}><ShieldCheck size={16} /></div>}
                </div>
                <h3 className="title" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{name || 'Utilisateur'}</h3>
                {!isEmailConfirmed && <button className="btn-primary" onClick={() => setView('complete-profile')} style={{ marginBottom: '1.5rem' }}><ShieldCheck size={18} /> Sécuriser mon compte 🛡️</button>}
                <button className="btn-secondary" onClick={handleLogout} style={{ color: '#f43f5e', width: '100%' }}>Déconnexion</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        {isMainView && <BottomNav />}
      </div>
    </div>
  )
}

export default App
