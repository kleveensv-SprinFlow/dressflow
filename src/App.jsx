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
  Eye, EyeOff, UploadCloud
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
  const [loginMode, setLoginMode] = useState('code') // 'code' ou 'email'
  
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
  
  const [currentOutfit, setCurrentOutfit] = useState(null)
  const [outfitLoading, setOutfitLoading] = useState(false)
  const [forgottenItems, setForgottenItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const [tempAvatarFile, setTempAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const fileInputRef = useRef(null)
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
      // 1. Vérifier si l'email existe déjà
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single()
      if (existing) throw new Error("Cet email est déjà lié à un autre dressing.")

      // 2. Créer le compte Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError

      let finalAvatarUrl = avatarUrl

      // 3. Uploader l'avatar si présent
      if (tempAvatarFile) {
        const fileName = `avatar-${uid}-${Date.now()}.jpg`
        await supabase.storage.from('avatars').upload(fileName, tempAvatarFile)
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
        finalAvatarUrl = publicUrl
      }

      // 4. Mettre à jour le profil
      await supabase.from('profiles').update({ 
        email, 
        user_id: authData.user.id, 
        avatar_url: finalAvatarUrl 
      }).eq('id', uid)

      setIsEmailConfirmed(true); setAvatarUrl(finalAvatarUrl); setView('dashboard')
      alert("Profil finalisé ! Bienvenue officiellement ✨")
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
    setOutfitLoading(true)
    try {
      const result = await generateOutfit(items, weather || await getLocalWeather())
      setCurrentOutfit(result); setView('outfit-result')
    } catch (err) { alert("Erreur") } finally { setOutfitLoading(false) }
  }

  const handleValidateOutfit = async () => {
    if (!currentOutfit) return;
    const ids = [currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id)
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).in('id', ids)
    await fetchItems(uid); setView('dashboard'); alert("Tenue validée ! ✨")
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
        if (profile.email) throw new Error("Ce compte nécessite un mot de passe.")
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

  const BottomNav = () => (
    <div className="bottom-nav">
      <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><Home size={22} /><span>Dressing</span></div>
      <div className={`nav-item ${view === 'travel' ? 'active' : ''}`} onClick={() => setView('travel')}><Plane size={22} /><span>Voyage</span></div>
      <div className="nav-item" onClick={() => setView('add-choice')}><div className="add-nav-btn"><Plus size={30} /></div><span>Ajouter</span></div>
      <div className={`nav-item ${view === 'outfit-result' ? 'active' : ''}`} onClick={() => handleGenerateOutfitRequest()}><Wand2 size={22} /><span>Styliste</span></div>
      <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><User size={22} /><span>Profil</span></div>
    </div>
  )

  const isMainView = ['dashboard', 'outfit-result', 'settings', 'travel'].includes(view)

  return (
    <div id="root">
      <div className="bg-blobs"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
      <div className="app-container">
        <AnimatePresence mode="wait">
          
          {/* 1. SPLASH VIEW */}
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

          {/* 2. REGISTER VIEW */}
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

          {/* 3. LOGIN VIEW (HYBRIDE CODE / EMAIL) */}
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

          {/* 4. DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1>
                <div onClick={() => { setCityModalMode('home'); setShowCityModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '12px' }}><MapPin size={14} /> {weather?.city || 'Localiser'}</div>
              </header>

              <div className="glass-card" onClick={() => { setCityModalMode('home'); setShowCityModal(true); }} style={{ padding: '1.2rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                {weatherLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Loader2 className="animate-spin" size={24} color="var(--primary)" /> <div className="subtitle">Localisation...</div></div>
                ) : weatherError ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#f43f5e' }}><AlertCircle size={24} /> <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Position introuvable</div></div> <div style={{ background: 'var(--primary)', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem' }}>Choisir une ville</div></div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '18px' }}><Sun size={24} /></div><div><div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div><div className="subtitle" style={{ fontSize: '0.85rem', marginTop: 0 }}>{weather ? weather.description : 'Clique pour localiser'}</div></div></div>
                    <ChevronRight size={20} style={{ opacity: 0.3 }} />
                  </div>
                )}
              </div>

              {forgottenItems.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <History size={18} color="var(--primary)" />
                    <h3 className="title" style={{ fontSize: '1.2rem', margin: 0 }}>À redécouvrir ✨</h3>
                  </div>
                  <div className="forgotten-scroll">
                    {forgottenItems.map(item => (
                      <div key={item.id} className="forgotten-card" onClick={() => setSelectedItem(item)}>
                        <div className="forgotten-img">{item.image_url ? <img src={item.image_url} /> : item.icon}</div>
                        <div className="forgotten-label">{item.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="filter-bar">{['Tous', 'Mes Hauts', 'Mes Bas', 'Extérieur', 'Robe', 'Sport', 'Soirée'].map(f => (<button key={f} className={`filter-pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>))}</div>
              <div className="item-grid">{items.map(item => (<div key={item.id} className="item-card" onClick={() => setSelectedItem(item)}><div className="item-image">{item.image_url ? <img src={item.image_url} alt={item.type} /> : <div style={{ fontSize: '3rem' }}>{item.icon}</div>}{getItemWeatherScore(item, weather?.temp || 20) > 5 && <div className="weather-badge"><Sparkles size={12} /></div>}</div><div className="item-info"><div className="item-type">{item.type}</div><div className="item-meta">{item.color} • {item.activity}</div></div></div>))}</div>
            </motion.div>
          )}

          {/* 5. COMPLETE PROFILE VIEW (LE FORMULAIRE QUE TU AS DEMANDÉ) */}
          {view === 'complete-profile' && (
            <motion.div key="complete-profile" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="dashboard-container">
              <header style={{ marginBottom: '1.5rem' }}>
                <h2 className="title" style={{ fontSize: '2rem' }}>Finaliser mon profil 🛡️</h2>
                <p className="subtitle">Protège ton dressing avec un mot de passe et une photo.</p>
              </header>

              <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* PHOTO DE PROFIL */}
                <div style={{ textAlign: 'center' }}>
                  <div onClick={() => avatarInputRef.current.click()} style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'white', margin: '0 auto 1rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', border: '3px solid var(--primary)' }}>
                    {avatarPreview || avatarUrl ? <img src={avatarPreview || avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={30} color="var(--primary)" /></div>}
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '0.6rem', padding: '2px 0' }}>MODIFIER</div>
                  </div>
                  <input type="file" ref={avatarInputRef} hidden onChange={handleAvatarChange} accept="image/*" />
                  {(avatarPreview || avatarUrl) && <button onClick={handleDeleteAvatar} style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 800 }}>Supprimer la photo</button>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.6 }}>INFOS DE CONNEXION</div>
                  <input type="email" placeholder="Ton email" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input type="password" placeholder="Mot de passe" className="input-styled" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <input type="password" placeholder="Confirmer le mot de passe" className="input-styled" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>

                <button className="btn-primary" onClick={handleCompleteProfile} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Sécuriser mon dressing ✨"}</button>
                <button onClick={() => setView('settings')} style={{ background: 'none', border: 'none', fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>Plus tard</button>
              </div>
            </motion.div>
          )}

          {/* 6. SETTINGS VIEW */}
          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
              <header style={{ marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mon Profil</h2></header>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 1.5rem' }}>
                  <div className="profile-avatar" style={{ overflow: 'hidden' }}>{avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (gender === 'female' ? '👩' : '👨')}</div>
                  {isEmailConfirmed && <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#10b981', color: 'white', borderRadius: '50%', padding: '4px' }}><ShieldCheck size={16} /></div>}
                </div>
                
                <h3 className="title" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{name || 'Utilisateur'}</h3>
                
                {isEmailConfirmed ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>{email}</div>
                ) : (
                  <button className="btn-primary" onClick={() => setView('complete-profile')} style={{ marginBottom: '1.5rem' }}><ShieldCheck size={18} /> Sécuriser mon compte 🛡️</button>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {!isEmailConfirmed && <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>Lier ton email te permet de retrouver ton dressing même si tu perds ton téléphone.</p>}
                  <button className="btn-secondary" onClick={() => setView('complete-profile')} style={{ width: '100%' }}>Modifier mon profil</button>
                  <button className="btn-secondary" onClick={handleLogout} style={{ color: '#f43f5e', width: '100%' }} disabled={loading}><LogOut size={20} /> {loading ? "Déconnexion..." : "Déconnexion"}</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ... AUTRES VUES (DÉJÀ CODÉES) ... */}
          {view === 'success' && (
            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card my-auto" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ background: '#10b981', color: 'white', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Check size={35} /></div>
              <h2 className="title">Bienvenue, {name} !</h2>
              <p className="subtitle">Voici ton code secret. Note-le bien, il te permet de retrouver ton dressing partout.</p>
              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.5)', padding: '1.5rem', margin: '1.5rem 0', border: '2px dashed var(--primary)' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '3px', color: 'var(--primary)' }}>{formatUID(uid)}</div>
              </div>
              <button onClick={() => setView('dashboard')} className="btn-primary">Découvrir mon dressing ✨</button>
            </motion.div>
          )}

          {view === 'outfit-result' && (
            <motion.div key="outfit-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '1.5rem' }}>
                <h2 className="title" style={{ fontSize: '2.2rem' }}>Ton Styliste 🪄</h2>
                {outfitLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto 1rem' }} /><p className="subtitle">L'IA prépare ton look...</p></div>
                ) : currentOutfit ? (
                  <p className="subtitle" style={{ fontSize: '1rem', lineHeight: '1.4' }}>{currentOutfit.explanation}</p>
                ) : (
                  <p className="subtitle">Aucune tenue générée.</p>
                )}
              </header>
              {!outfitLoading && currentOutfit && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {[currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id).map(id => {
                      const item = findItemById(id); if (!item) return null;
                      return (
                        <div key={id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem' }}>
                          <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>{item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '2rem', textAlign: 'center', lineHeight: '60px' }}>{item.icon}</div>}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{item.type}</div>
                            <div className="subtitle" style={{ fontSize: '0.8rem', marginTop: 0 }}>{item.color} • {item.activity}</div>
                          </div>
                          <Sparkles size={18} color="var(--primary)" style={{ opacity: 0.5 }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="btn-primary" onClick={handleValidateOutfit}><Check size={20} /> Je porte cette tenue !</button>
                    <button className="btn-secondary" onClick={handleGenerateOutfitRequest}><RefreshCw size={20} /> Autre proposition</button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {view === 'travel' && (
            <motion.div key="travel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mode Voyage ✈️</h2></header>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div onClick={() => { setCityModalMode('travel'); setShowCityModal(true); }} className="input-styled" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}><Search size={18} /> {travelData.destination || "Où pars-tu ?"}</div>
                <button className="btn-primary" onClick={handleGenerateSuitcase} style={{ marginTop: '1rem' }} disabled={suitcaseLoading}>
                  {suitcaseLoading ? <Loader2 className="animate-spin" /> : "Générer ma valise ✨"}
                </button>
              </div>
              <div style={{ padding: '0 0.5rem' }}>{suitcase.map((item, idx) => (
                <div key={idx} className={`glass-card ${item.checked ? 'checked' : ''}`} onClick={() => setSuitcase(suitcase.map((s, i) => i === idx ? { ...s, checked: !s.checked } : s))} style={{ padding: '1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: '2px solid var(--primary)', background: item.checked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.checked && <Check size={14} color="white" />}</div>
                  <div style={{ flex: 1, fontWeight: 700 }}>{item.type}</div><div style={{ fontSize: '1.2rem' }}>{item.icon}</div>
                </div>
              ))}</div>
            </motion.div>
          )}

          {view === 'add-detail' && (
            <motion.div key="add-detail" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>{selectedImage && <img src={selectedImage} alt="Preview" style={{ width: '100%', borderRadius: '20px', maxHeight: '180px', objectFit: 'contain' }} />}</div>
              <div className="glass-card" style={{ gap: '1.2rem', display: 'flex', flexDirection: 'column' }}>
                <h2 className="title" style={{ fontSize: '1.4rem' }}>Vêtement détecté ✨</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.6 }}>TYPE & COULEUR</div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <select className="input-styled" style={{ flex: 2 }} value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value, icon: getIconForType(e.target.value)})}>{ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    <select className="input-styled" style={{ flex: 1 }} value={newItem.color} onChange={e => setNewItem({...newItem, color: e.target.value})}>{ALL_COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, opacity: 0.6, marginTop: '0.5rem' }}>ACTIVITÉ</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {ALL_ACTIVITIES.map(act => (
                      <button key={act} onClick={() => setNewItem({...newItem, activity: act})} className={`filter-pill ${newItem.activity === act ? 'active' : ''}`} style={{ fontSize: '0.75rem' }}>{act}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleAddItem} className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Ajouter au dressing ✨"}</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {isMainView && <BottomNav />}

        {/* MODAL CITY SEARCH */}
        {showCityModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay" onClick={() => setShowCityModal(false)}>
            <motion.div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2rem' }}>
              <h2 className="title" style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>{cityModalMode === 'home' ? 'Changer de ville' : 'Destination'}</h2>
              <input type="text" placeholder="Rechercher une ville..." className="input-styled" value={citySearch} onChange={(e) => handleCitySearch(e.target.value)} />
              <div style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '1rem' }}>{cityResults.map(city => (<div key={city.id} onClick={() => handleSelectCity(city)} className="btn-secondary" style={{ marginBottom: '0.5rem', textAlign: 'left' }}>{city.name} ({city.country})</div>))}</div>
            </motion.div>
          </motion.div>
        )}

        {/* MODAL ITEM DETAILS */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => { setSelectedItem(null); setIsEditing(false); }}>
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2rem', height: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '1.6rem' }}>{isEditing ? 'Modifier' : 'Détails'}</h2><button onClick={() => { setSelectedItem(null); setIsEditing(false); }} style={{ background: 'none', border: 'none' }}><X size={24} /></button></div>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <select className="input-styled" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>{ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    <select className="input-styled" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})}>{ALL_COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <button className="btn-primary" onClick={handleUpdateItem}><Save size={20} /> Enregistrer</button>
                  </div>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}><div style={{ width: '150px', height: '150px', margin: '0 auto', background: 'white', borderRadius: '20px', overflow: 'hidden' }}>{selectedItem.image_url ? <img src={selectedItem.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '4rem', lineHeight: '150px' }}>{selectedItem.icon}</div>}</div></div>
                    <div style={{ marginBottom: '2rem' }}><div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{selectedItem.type} {selectedItem.color}</div><div className="subtitle">{selectedItem.activity} • {selectedItem.season}</div></div>
                    <div style={{ display: 'flex', gap: '1rem' }}><button className="btn-primary" style={{ flex: 2 }} onClick={() => handleUpdateLastWorn(selectedItem)}><Check size={20} /> Je porte ça !</button><button className="btn-secondary" onClick={() => { setIsEditing(true); setEditForm({ type: selectedItem.type, color: selectedItem.color, season: selectedItem.season }); }}><Edit3 size={20} /></button><button className="btn-secondary" style={{ color: '#f43f5e' }} onClick={() => handleDeleteItem(selectedItem.id)}><Trash2 size={20} /></button></div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}

export default App
