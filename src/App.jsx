import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, UserCircle, Search, RefreshCw, Loader2, Wand2, Plus, 
  Sun, MapPin, ChevronRight, Lock, Unlock, Mail, Save, LogOut
} from 'lucide-react'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { App as CapApp } from '@capacitor/app'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import confetti from 'canvas-confetti'
import toast, { Toaster } from 'react-hot-toast'

// Styles & Services
import './styles/index.css'
import { supabase } from './lib/supabase'
import { generateOutfit } from './services/ai'
import { getLocalWeather, searchCity } from './services/weather'

// Components & Views
import { RotatingClothes } from './components/UIElements'
import BottomNav from './components/BottomNav'
import { CityModal, EditModal, DeleteModal } from './components/Modals'
import DashboardView from './views/DashboardView'
import StylistView from './views/StylistView'
import TravelView from './views/TravelView'
import SettingsView from './views/SettingsView'
import AddClothingView from './views/AddClothingView'

// Utils
import { generatePackingList } from './utils/packing'
import { 
  MAIN_CATEGORIES, CATEGORY_HIERARCHY, getIconForType, 
  ALL_SEASONS, ALL_ACTIVITIES, formatUID, findItemById 
} from './utils/helpers.jsx'

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
  const [subscriptionTier, setSubscriptionTier] = useState('free')
  const [aiGensRemaining, setAiGensRemaining] = useState(5)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [lockedOutfit, setLockedOutfit] = useState({ top: null, bottom: null, layer: null })
  const [suitcaseChecked, setSuitcaseChecked] = useState([])
  
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  
  const [citySearch, setCitySearch] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [showCityModal, setShowCityModal] = useState(false)
  const [cityModalMode, setCityModalMode] = useState('home')
  const [activeFilter, setActiveFilter] = useState('Tous')
  
  const [travelData, setTravelData] = useState({ 
    destination: '', lat: null, lon: null, 
    startDate: format(new Date(), 'yyyy-MM-dd'), 
    endDate: format(addDays(new Date(), 3), 'yyyy-MM-dd') 
  })
  const [suitcase, setSuitcase] = useState([])
  const [suitcaseLoading, setSuitcaseLoading] = useState(false)
  
  const [stylistMode, setStylistMode] = useState('ai') 
  const [currentOutfit, setCurrentOutfit] = useState(null)
  const [manualOutfit, setManualOutfit] = useState({ head: null, top: null, layer: null, bottom: null, feet: null, bag: null })
  const [outfitLoading, setOutfitLoading] = useState(false)
  
  const [selectedItem, setSelectedItem] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const [bulkItems, setBulkItems] = useState([])
  const [tempAvatarFile, setTempAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const avatarInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  const [newItem, setNewItem] = useState({ main_category: null, type: '', color: 'Blanc', season: ['Été'], activity: ['Quotidien'], icon: '👕' })
  const [selectedImage, setSelectedImage] = useState(null)
  const [tempFile, setTempFile] = useState(null)

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (activeFilter !== 'Tous') {
      result = result.filter(item => {
        if (activeFilter === 'Mes Hauts') return item.main_category === 'Haut'
        if (activeFilter === 'Mes Bas') return item.main_category === 'Bas'
        if (activeFilter === 'Extérieur') return item.type === 'Veste' || item.type === 'Manteau'
        if (activeFilter === 'Robe') return item.type === 'Robe' || item.type === 'Jupe'
        if (activeFilter === 'Sport') return item.activity === 'Sport'
        if (activeFilter === 'Soirée') return item.activity === 'Soirée'
        return true
      })
    }
    const order = ["Haut", "Bas", "Chaussures", "Chapeau"]
    return result.sort((a, b) => order.indexOf(a.main_category) - order.indexOf(b.main_category))
  }, [items, activeFilter])

  const generateRandomUID = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let res = ''; for (let i = 0; i < 8; i++) res += chars.charAt(Math.floor(Math.random() * chars.length)); return res }

  const fetchItems = async (profileId) => {
    setLoading(true); const { data } = await supabase.from('clothes').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    setItems(data || []); setLoading(false)
  }

  const syncProfile = async (userEmail) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).single()
    if (profile) {
      setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email); setAvatarUrl(profile.avatar_url);
      setSubscriptionTier(profile.subscription_tier || 'free');
      localStorage.setItem('dressflow_uid', profile.id);
      await fetchItems(profile.id); if (['splash', 'login', 'register', 'complete-profile', 'success'].includes(view)) setView('dashboard');
    }
  }

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) { setIsEmailConfirmed(true); setEmail(session.user.email); await syncProfile(session.user.email); }
  }

  const initWeather = async (lat = null, lon = null, cityName = null) => {
    setWeatherLoading(true)
    try { const data = await getLocalWeather(lat, lon); if (cityName) data.city = cityName; setWeather(data) } catch (err) { toast.error("Position introuvable.") } finally { setWeatherLoading(false) }
  }

  useEffect(() => { document.documentElement.setAttribute('data-theme', gender) }, [gender])
  
  useEffect(() => {
    const savedSuitcase = localStorage.getItem('suitcase'); const savedTravel = localStorage.getItem('travelData')
    if (savedSuitcase) setSuitcase(JSON.parse(savedSuitcase)); if (savedTravel) setTravelData(JSON.parse(savedTravel))
  }, [])

  useEffect(() => { localStorage.setItem('suitcase', JSON.stringify(suitcase)); localStorage.setItem('travelData', JSON.stringify(travelData)) }, [suitcase, travelData])

  useEffect(() => { 
    checkUserSession(); 
    CapApp.addListener('appUrlOpen', data => {
      const url = new URL(data.url.replace('#', '?')); const accessToken = url.searchParams.get('access_token'); const refreshToken = url.searchParams.get('refresh_token')
      if (accessToken && refreshToken) supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) { setIsEmailConfirmed(true); setEmail(session.user.email); await syncProfile(session.user.email); }
    })
    
    const savedUid = localStorage.getItem('dressflow_uid')
    if (savedUid && !uid) {
      (async () => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', savedUid).single()
        if (profile) {
          setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email || '');
          setSubscriptionTier(profile.subscription_tier || 'free'); setAvatarUrl(profile.avatar_url);
          await fetchItems(profile.id); setView('dashboard');
        }
      })()
    }

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (['dashboard', 'stylist', 'trip', 'settings'].includes(view)) { if (!weather && !weatherLoading) initWeather(); } }, [view, items])

  const handleLogout = async () => {
    setLoading(true); try {
      await supabase.auth.signOut(); 
      localStorage.removeItem('dressflow_uid'); localStorage.removeItem('suitcase'); localStorage.removeItem('travelData');
      setUid(''); setName(''); setEmail(''); setItems([]); setIsEmailConfirmed(false); setAvatarUrl(null);
      setSuitcase([]); setCurrentOutfit(null); setWeather(null); 
      setTravelData({ destination: '', lat: null, lon: null, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 3), 'yyyy-MM-dd') });
      setView('splash');
      toast.success("Déconnecté ! 👋");
    } catch (err) { toast.error("Erreur") } finally { setLoading(false) }
  }
  
  const handleDeleteAccount = async () => {
    setLoading(true); try {
      const { error } = await supabase.from('profiles').delete().eq('id', uid)
      if (error) throw error;
      await supabase.auth.signOut(); setUid(''); setName(''); setView('splash'); setShowDeleteModal(false);
      toast.success("Compte supprimé 🗑️");
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const handleGenerateSuitcase = async () => {
    if (!travelData.lat) { toast.error("Choisis une destination !"); return; }
    setSuitcaseLoading(true)
    try {
      const destWeather = await getLocalWeather(travelData.lat, travelData.lon)
      const duration = differenceInDays(parseISO(travelData.endDate), parseISO(travelData.startDate)) + 1
      const list = generatePackingList(items, destWeather, duration)
      setSuitcase(list)
      toast.success("Valise prête ! ✈️");
    } catch (err) { toast.error("Erreur météo") } finally { setSuitcaseLoading(false) }
  }

  const handleGenerateOutfitRequest = async () => {
    if (items.length < 3) { toast.error("Ajoute plus d'habits !"); return; }
    if (subscriptionTier === 'free' && aiGensRemaining <= 0) { toast.error("Limite IA atteinte 💎"); setView('settings'); return; }
    setOutfitLoading(true); setStylistMode('ai'); 
    try { 
      const res = await generateOutfit(items, weather || await getLocalWeather(), lockedOutfit); 
      const resolved = {
        top: findItemById(items, res.top_id),
        bottom: findItemById(items, res.bottom_id),
        layer: findItemById(items, res.layer_id),
        explanation: res.explanation
      };
      setCurrentOutfit(resolved);
      if (subscriptionTier === 'free') setAiGensRemaining(prev => prev - 1);
      toast.success("Look généré ! ✨");
    } catch (err) { toast.error("Erreur") } finally { setOutfitLoading(false) }
  }

  const handleValidateOutfit = async () => {
    const ids = stylistMode === 'ai' 
      ? [currentOutfit.top?.id, currentOutfit.bottom?.id, currentOutfit.layer?.id].filter(id => id) 
      : Object.values(manualOutfit).filter(id => id)
    if (ids.length === 0) return
    setLoading(true); await Haptics.impact({ style: ImpactStyle.Heavy }); confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } })
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).in('id', ids)
    await fetchItems(uid); setView('dashboard'); setLoading(false)
    toast.success("Superbe look ! 🔥");
  }

  const handleCitySearch = (val) => {
    setCitySearch(val); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (val.length > 2) { searchTimeoutRef.current = setTimeout(async () => { const results = await searchCity(val); setCityResults(results) }, 500) } else setCityResults([])
  }

  const handleSelectCity = (city) => {
    if (cityModalMode === 'home') initWeather(city.latitude, city.longitude, city.name); else setTravelData({ ...travelData, destination: city.name, lat: city.latitude, lon: city.longitude });
    setShowCityModal(false); setCitySearch(''); setCityResults([])
  }

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    setLoading(true); await supabase.from('clothes').delete().eq('id', selectedItem.id); await fetchItems(uid); setSelectedItem(null); setLoading(false)
    toast.success("Vêtement supprimé");
  }

  const handleUpdateItem = async () => {
    setLoading(true); const { error } = await supabase.from('clothes').update({
        main_category: editForm.main_category,
        type: editForm.type,
        color: editForm.color,
        season: Array.isArray(editForm.season) ? editForm.season.join(', ') : editForm.season,
        activity: Array.isArray(editForm.activity) ? editForm.activity.join(', ') : editForm.activity,
        icon: getIconForType(editForm.type)
      }).eq('id', editForm.id)
    if (error) toast.error(error.message); else { await fetchItems(uid); setIsEditing(false); setSelectedItem(null); toast.success("Modifié ! ✨"); } setLoading(false)
  }

  const handleRegister = async () => {
    if (!name) { toast.error("Prénom requis !"); return; }
    setLoading(true); try { 
      const newUid = generateRandomUID(); 
      await supabase.from('profiles').insert([{ id: newUid, name, gender }]); 
      setUid(newUid); localStorage.setItem('dressflow_uid', newUid); setView('success') 
      toast.success("Compte créé !");
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const handleLogin = async () => {
    setLoading(true); try {
      if (loginMode === 'code') {
        const cleanCode = inputCode.replace(/[^A-Z0-9]/g, ''); const { data: profile } = await supabase.from('profiles').select('*').eq('id', cleanCode).single()
        if (!profile) throw new Error("Code invalide"); 
        setUid(profile.id); localStorage.setItem('dressflow_uid', profile.id);
        setName(profile.name); setGender(profile.gender); setEmail(profile.email || ''); setAvatarUrl(profile.avatar_url); 
        setSubscriptionTier(profile.subscription_tier || 'free'); await fetchItems(profile.id); setView('dashboard')
      } else { const { error: authErr } = await supabase.auth.signInWithPassword({ email, password }); if (authErr) throw authErr; await syncProfile(email); }
      toast.success("Bon retour ! 👋");
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files); if (files.length === 0) return
    setLoading(true)
    if (files.length === 1) {
      setTempFile(files[0]); setSelectedImage(URL.createObjectURL(files[0]))
      setNewItem({ main_category: null, type: '', color: 'Blanc', season: ['Été'], activity: ['Quotidien'], icon: '👕' })
      setView('add-detail')
    } else {
      const initialBulk = files.map(f => ({ file: f, preview: URL.createObjectURL(f), main_category: 'Haut', type: 'T-shirt', color: 'Blanc', season: ['Été', 'Hiver', 'Printemps', 'Automne'], activity: ['Quotidien'], icon: '👕' }))
      setBulkItems(initialBulk); setView('bulk-add')
    }
    setLoading(false)
  }

  const handleBulkAdd = async () => {
    setLoading(true)
    try {
      for (const item of bulkItems) {
        const fileName = `${uid}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.jpg`
        await supabase.storage.from('clothes-images').upload(fileName, item.file)
        const { data: { publicUrl } } = supabase.storage.from('clothes-images').getPublicUrl(fileName)
        await supabase.from('clothes').insert([{ profile_id: uid, main_category: item.main_category, type: item.type, color: item.color, season: Array.isArray(item.season) ? item.season.join(', ') : item.season, activity: Array.isArray(item.activity) ? item.activity.join(', ') : item.activity, icon: item.icon, image_url: publicUrl, last_worn_date: new Date().toISOString() }])
      }
      await fetchItems(uid); setView('dashboard'); setBulkItems([]);
      toast.success("Importation terminée ! 📦");
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const handleAddItem = async () => {
    if (!uid || !tempFile) return; 
    if (subscriptionTier === 'free' && items.length >= 25) { toast.error("Limite atteinte 💎"); setView('settings'); return; }
    setLoading(true)
    try {
      const fileName = `${uid}-${Date.now()}.jpg`; await supabase.storage.from('clothes-images').upload(fileName, tempFile)
      const { data: { publicUrl } } = supabase.storage.from('clothes-images').getPublicUrl(fileName)
      await supabase.from('clothes').insert([{ profile_id: uid, ...newItem, image_url: publicUrl, last_worn_date: new Date().toISOString() }])
      await fetchItems(uid); setView('dashboard'); setSelectedImage(null); setTempFile(null)
      toast.success("Ajouté avec succès ! ✨");
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const handleUpdateProfile = async () => {
    setLoading(true); try {
      let finalAvatarUrl = avatarUrl;
      if (tempAvatarFile) { const fileName = `avatar-${uid}-${Date.now()}.jpg`; await supabase.storage.from('avatars').upload(fileName, tempAvatarFile); const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName); finalAvatarUrl = publicUrl; }
      await supabase.from('profiles').update({ name, avatar_url: finalAvatarUrl }).eq('id', uid); setAvatarUrl(finalAvatarUrl);
      toast.success("Profil mis à jour ! ✅");
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const manualItems = useMemo(() => ({
    head: items.filter(i => ['Bonnet', 'Casquette', 'Chapeau', 'Bob'].includes(i.type)),
    top: items.filter(i => ['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Top / Blouse'].includes(i.type)),
    layer: items.filter(i => ['Veste', 'Manteau'].includes(i.type)),
    bottom: items.filter(i => ['Pantalon', 'Short', 'Jogging', 'Jean', 'Jupe', 'Legging'].includes(i.type)),
    feet: items.filter(i => ['Baskets', 'Bottes', 'Sandales', 'Talons', 'Ville'].includes(i.type)),
    bag: items.filter(i => ['Sac'].includes(i.type))
  }), [items])

  const isMainView = ['dashboard', 'stylist', 'trip', 'settings'].includes(view)

  return (
    <div id="root">
      <Toaster />
      <div className="bg-blobs"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
      <div className="app-container">
        <AnimatePresence mode="wait">
          
          {view === 'splash' && (
            <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="logo-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><RotatingClothes /><h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1><p className="subtitle">L'IA au service de votre style.</p></div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}><motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('register')} className="btn-primary">Créer mon dressing ✨</motion.button><motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('login')} className="btn-secondary">J'ai déjà un compte</motion.button></div>
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div key="register" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}><div style={{ background: 'var(--primary)', color: 'white', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><UserCircle size={35} /></div><h2 className="title">Créer mon dressing</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div><label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 800 }}>PRÉNOM</label><input type="text" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 800 }}>STYLE</label><div style={{ display: 'flex', gap: '1rem' }}><button onClick={() => setGender('female')} className={`btn-secondary ${gender === 'female' ? 'active' : ''}`} style={{ flex: 1 }}>👩 Femme</button><button onClick={() => setGender('male')} className={`btn-secondary ${gender === 'male' ? 'active' : ''}`} style={{ flex: 1 }}>👨 Homme</button></div></div>
                <button onClick={handleRegister} className="btn-primary" disabled={loading}>Commencer ✨</button>
              </div>
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div key="login" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <h2 className="title" style={{ textAlign: 'center' }}>Bon retour ! 👋</h2>
              <div className="filter-bar" style={{ margin: '1.5rem 0' }}><button className={`filter-pill ${loginMode === 'code' ? 'active' : ''}`} onClick={() => setLoginMode('code')}>Code</button><button className={`filter-pill ${loginMode === 'email' ? 'active' : ''}`} onClick={() => setLoginMode('email')}>Email</button></div>
              {loginMode === 'code' ? <input type="text" placeholder="XXXX - XXXX" className="input-styled" style={{ textAlign: 'center', fontSize: '1.5rem' }} value={formatUID(inputCode)} onChange={(e) => setInputCode(e.target.value.toUpperCase())} maxLength={11} /> : <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><input type="email" placeholder="Email" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} /><input type="password" placeholder="Pass" className="input-styled" value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
              <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ marginTop: '1.5rem' }}>Se connecter</button>
              <button onClick={() => setView('splash')} className="btn-secondary" style={{ border: 'none', background: 'none' }}>Retour</button>
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card my-auto" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ background: '#10b981', color: 'white', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Check size={35} /></div><h2 className="title">Bienvenue !</h2>
              <div className="glass-card" style={{ padding: '1.5rem', margin: '1.5rem 0', border: '2px dashed var(--primary)' }}><div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{formatUID(uid)}</div></div>
              <button onClick={() => setView('dashboard')} className="btn-primary">Mon dressing ✨</button>
            </motion.div>
          )}

          {view === 'dashboard' && <DashboardView key="dashboard" items={items} loading={loading} activeFilter={activeFilter} setActiveFilter={setActiveFilter} filteredItems={filteredItems} onSelectItem={(item) => setSelectedItem(item)} onAddClick={() => setView('add-choice')} weather={weather} weatherLoading={weatherLoading} onWeatherClick={() => { setCityModalMode('home'); setShowCityModal(true); }} />}
          {view === 'stylist' && <StylistView key="stylist" stylistMode={stylistMode} setStylistMode={setStylistMode} currentOutfit={currentOutfit} outfitLoading={outfitLoading} handleGenerateOutfitRequest={handleGenerateOutfitRequest} handleValidateOutfit={handleValidateOutfit} manualItems={manualItems} manualOutfit={manualOutfit} setManualOutfit={setManualOutfit} loading={loading} lockedOutfit={lockedOutfit} setLockedOutfit={setLockedOutfit} />}
          {view === 'trip' && <TravelView key="trip" travelData={travelData} setTravelData={setTravelData} suitcase={suitcase} suitcaseLoading={suitcaseLoading} handleGenerateSuitcase={handleGenerateSuitcase} suitcaseChecked={suitcaseChecked} setSuitcaseChecked={setSuitcaseChecked} setShowCityModal={setShowCityModal} setCityModalMode={setCityModalMode} />}
          {view === 'settings' && <SettingsView key="settings" profile={{id: uid, name, email, avatar_url: avatarUrl}} name={name} setName={setName} email={email} setEmail={setEmail} avatarPreview={avatarPreview} avatarInputRef={avatarInputRef} setTempAvatarFile={setTempAvatarFile} setAvatarPreview={setAvatarPreview} handleUpdateProfile={handleUpdateProfile} handleLogout={handleLogout} setShowDeleteModal={setShowDeleteModal} subscriptionTier={subscriptionTier} items={items} aiGensRemaining={aiGensRemaining} />}
          {['add-choice', 'bulk-add', 'loading-ai', 'add-detail'].includes(view) && <AddClothingView key="add" view={view} setView={setView} fileInputRef={fileInputRef} handleFileChange={handleFileChange} bulkItems={bulkItems} setBulkItems={setBulkItems} handleBulkAdd={handleBulkAdd} loading={loading} selectedImage={selectedImage} newItem={newItem} setNewItem={setNewItem} handleAddItem={handleAddItem} getIconForType={getIconForType} />}

        </AnimatePresence>

        {isMainView && <BottomNav activeTab={view} onTabChange={setView} />}

        <CityModal show={showCityModal} onClose={() => setShowCityModal(false)} title={cityModalMode === 'home' ? "Localiser" : "Destination"} citySearch={citySearch} setCitySearch={handleCitySearch} cityResults={cityResults} onSelectCity={handleSelectCity} />
        
        <EditModal show={!!selectedItem} isEditing={isEditing} setIsEditing={setIsEditing} editForm={editForm || selectedItem || {}} setEditForm={setEditForm} handleUpdateItem={handleUpdateItem} handleDeleteItem={handleDeleteItem} loading={loading} />
        
        <DeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} loading={loading} />
      </div>
    </div>
  )
}

export default App
