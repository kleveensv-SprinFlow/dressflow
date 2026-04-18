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
  UserCircle, Edit3, Save, Info
} from 'lucide-react'
import { format, addDays } from 'date-fns'

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
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false)
  const [uid, setUid] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [selectedItem, setSelectedItem] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [weather, setWeather] = useState(null)
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [citySearch, setCitySearch] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [showCityModal, setShowCityModal] = useState(false)
  const [travelData, setTravelData] = useState({ destination: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'), lat: null, lon: null })
  const [suitcase, setSuitcase] = useState([])
  const [suitcaseLoading, setSuitcaseLoading] = useState(false)
  
  // Outfit
  const [currentOutfit, setCurrentOutfit] = useState(null)
  const [outfitLoading, setOutfitLoading] = useState(false)

  const [forgottenItems, setForgottenItems] = useState([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [loadingPhrase, setLoadingPhrase] = useState("Analyse de ton dressing...")

  const fileInputRef = useRef(null)
  const camInputRef = useRef(null)

  const ALL_TYPES = ['T-shirt', 'Crop-top', 'Hoodie', 'Sweat', 'Chemise', 'Polo', 'Top', 'Blouse', 'Jean', 'Pantalon', 'Short', 'Jupe', 'Legging', 'Chino', 'Robe', 'Veste', 'Blazer', 'Manteau', 'Parka', 'Trench', 'Cardigan', 'Pull', 'Maillot de bain', 'Pyjama', 'Basket', 'Bottes', 'Sandales', 'Escarpins', 'Accessoire', 'Sac', 'Casquette', 'Bonnet']
  const ALL_COLORS = ['Blanc', 'Noir', 'Gris', 'Beige', 'Marine', 'Bleu Ciel', 'Kaki', 'Vert Sapin', 'Bordeaux', 'Rouge', 'Rose Poudré', 'Rose', 'Moutarde', 'Jaune', 'Lilas', 'Violet', 'Terracotta', 'Orange', 'Or', 'Argent', 'Marron', 'Camel']

  const [newItem, setNewItem] = useState({ type: 'T-shirt', color: 'Blanc', season: 'Été', activity: 'Quotidien', icon: '👕' })
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => { document.documentElement.setAttribute('data-theme', gender) }, [gender])
  useEffect(() => { 
    checkUserSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) { setIsEmailConfirmed(true); setEmail(session.user.email); syncProfile(session.user.email); }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (['dashboard', 'outfit-result', 'settings', 'travel'].includes(view)) {
      if (!weather) initWeather(); checkForForgottenItems();
    }
  }, [view, items])

  const initWeather = async (lat = null, lon = null, cityName = null) => {
    const data = await getLocalWeather(lat, lon); if (cityName) data.city = cityName; setWeather(data)
  }

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) { setIsEmailConfirmed(true); setEmail(session.user.email); await syncProfile(session.user.email); }
  }

  const syncProfile = async (userEmail) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).single()
    if (profile) {
      setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email);
      await fetchItems(profile.id); if (view === 'splash' || view === 'login') setView('dashboard');
    }
  }

  const fetchItems = async (profileId) => {
    setLoading(true)
    const { data, error } = await supabase.from('clothes').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    if (error) setError("Erreur de chargement."); else setItems(data || [])
    setLoading(false)
  }

  const handleAddItem = async () => {
    if (!uid) return; setLoading(true)
    try {
      await supabase.from('clothes').insert([{ profile_id: uid, ...newItem, image_url: selectedImage, last_worn_date: new Date().toISOString() }])
      await fetchItems(uid); setView('dashboard'); setSelectedImage(null)
    } catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }

  const handleUpdateLastWorn = async (item) => {
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).eq('id', item.id)
    await fetchItems(uid); setSelectedItem(null);
  }

  const handleGenerateOutfitRequest = async () => {
    if (items.length < 3) { alert("Ajoute plus d'habits pour générer une tenue !"); return; }
    setOutfitLoading(true)
    try {
      const result = await generateOutfit(items, weather || await getLocalWeather())
      setCurrentOutfit(result)
      setView('outfit-result')
    } catch (err) { alert("Erreur génération") }
    finally { setOutfitLoading(false) }
  }

  const handleValidateOutfit = async () => {
    if (!currentOutfit) return;
    const ids = [currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id)
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).in('id', ids)
    await fetchItems(uid)
    alert("Super style ! Tenue validée. ✨")
    setView('dashboard')
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Supprimer ce vêtement ?")) return
    setLoading(true); await supabase.from('clothes').delete().eq('id', id); await fetchItems(uid); setSelectedItem(null); setLoading(false)
  }

  const handleUpdateItem = async () => {
    setLoading(true); await supabase.from('clothes').update({ ...editForm }).eq('id', selectedItem.id); await fetchItems(uid); setIsEditing(false); setSelectedItem({ ...selectedItem, ...editForm }); setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true); const newUid = generateRandomUID(); await supabase.from('profiles').insert([{ id: newUid, name, gender }]); setUid(newUid); setView('success'); setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true); const { data: profile } = await supabase.from('profiles').select('*').eq('id', inputCode.replace(/[^A-Z0-9]/g, '')).single()
    if (!profile) { setError("Code invalide"); setLoading(false); return; }
    if (profile.email) { setError("Compte sécurisé par email."); setLoading(false); return; }
    setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email || ''); await fetchItems(profile.id); setView('dashboard'); setLoading(false)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setView('loading-ai'); setLoading(true)
      try {
        const fileName = `${uid}-${Date.now()}.jpg`
        await supabase.storage.from('clothes-images').upload(fileName, file)
        const { data: { publicUrl } } = supabase.storage.from('clothes-images').getPublicUrl(fileName)
        const aiTags = await analyzeClothing(file)
        setNewItem({ ...newItem, ...aiTags, icon: getIconForType(aiTags.type) })
        setSelectedImage(publicUrl); setView('add-detail')
      } catch (err) { setView('add-detail') }
      finally { setLoading(false) }
    }
  }

  const getIconForType = (type) => {
    const icons = { 'T-shirt': '👕', 'Hoodie': '🧥', 'Pantalon': '👖', 'Jean': '👖', 'Robe': '👗', 'Veste': '🧥', 'Basket': '👟', 'Sac': '👜', 'Short': '🩳' }; return icons[type] || '✨'
  }

  const generateRandomUID = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let res = ''; for (let i = 0; i < 8; i++) res += chars.charAt(Math.floor(Math.random() * chars.length)); return res
  }

  const formatUID = (val) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8); return cleaned.length > 4 ? `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}` : cleaned
  }

  const checkForForgottenItems = () => {
    const forgotten = items.filter(item => (new Date() - new Date(item.last_worn_date || item.created_at)) > (60 * 24 * 60 * 60 * 1000)); setForgottenItems(forgotten)
  }

  const handleCitySearch = async (val) => {
    setCitySearch(val); if (val.length > 2) setCityResults(await searchCity(val))
  }

  const handleGenerateSuitcase = async () => {
    if (!travelData.lat) return; setSuitcaseLoading(true); const weatherData = await getLocalWeather(travelData.lat, travelData.lon); setSuitcase(items.filter(item => getItemWeatherScore(item, weatherData.temp) > 0).slice(0, 8).map(s => ({ ...s, checked: false }))); setSuitcaseLoading(false)
  }

  const findItemById = (id) => items.find(item => item.id === id)

  const filteredAndSortedItems = useMemo(() => {
    let list = [...items]
    if (activeFilter !== 'Tous') {
      list = list.filter(item => {
        if (activeFilter === 'Mes Hauts') return ['T-shirt', 'Hoodie', 'Sweat', 'Chemise', 'Top', 'Pull'].includes(item.type)
        if (activeFilter === 'Mes Bas') return ['Jean', 'Pantalon', 'Short', 'Jupe', 'Chino'].includes(item.type)
        if (activeFilter === 'Extérieur') return ['Veste', 'Manteau', 'Parka', 'Trench'].includes(item.type)
        return item.type === activeFilter || item.activity === activeFilter
      })
    }
    list.sort((a, b) => a.type.localeCompare(b.type))
    if (weather) { list.sort((a, b) => getItemWeatherScore(b, weather.temp) - getItemWeatherScore(a, weather.temp)); }
    return list
  }, [items, activeFilter, weather])

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
          
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1>
                <div onClick={() => setShowCityModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '12px' }}><MapPin size={14} /> {weather?.city || 'Localiser'}</div>
              </header>
              <div className="glass-card" onClick={() => setShowCityModal(true)} style={{ padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '18px' }}><Sun size={24} /></div><div><div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div><div className="subtitle" style={{ fontSize: '0.85rem', marginTop: 0 }}>{weather ? weather.description : 'Récupération...'}</div></div></div>
              </div>
              <div className="filter-bar">{['Tous', 'Mes Hauts', 'Mes Bas', 'Extérieur', 'Robe', 'Sport', 'Soirée'].map(f => (<button key={f} className={`filter-pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>))}</div>
              <div className="item-grid">{filteredAndSortedItems.map(item => (<div key={item.id} className="item-card" onClick={() => setSelectedItem(item)}><div className="item-image">{item.image_url ? <img src={item.image_url} alt={item.type} /> : <div style={{ fontSize: '3rem' }}>{item.icon}</div>}{getItemWeatherScore(item, weather?.temp || 20) > 5 && <div className="weather-badge"><Sparkles size={12} /></div>}</div><div className="item-info"><div className="item-type">{item.type}</div><div className="item-meta">{item.color} • {item.activity}</div></div></div>))}</div>
            </motion.div>
          )}

          {view === 'outfit-result' && currentOutfit && (
            <motion.div key="outfit-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Ton Styliste 🪄</h2><p className="subtitle">{currentOutfit.explanation}</p></header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {[currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id).map(id => {
                  const item = findItemById(id); if (!item) return null;
                  return (
                    <div key={id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden' }}>{item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '2rem' }}>{item.icon}</div>}</div>
                      <div><div style={{ fontWeight: 800 }}>{item.type}</div><div className="subtitle" style={{ fontSize: '0.8rem' }}>{item.color}</div></div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn-primary" onClick={handleValidateOutfit}><Check size={20} /> Je porte cette tenue !</button>
                <button className="btn-secondary" onClick={handleGenerateOutfitRequest}><RefreshCw size={20} /> Autre proposition</button>
              </div>
            </motion.div>
          )}

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

          {/* TRAVEL & OTHERS */}
          {view === 'travel' && (
            <motion.div key="travel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mode Voyage ✈️</h2></header>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <input type="text" placeholder="Où pars-tu ?" className="input-styled" value={citySearch} onChange={(e) => handleCitySearch(e.target.value)} />
                <button className="btn-primary" onClick={handleGenerateSuitcase} style={{ marginTop: '1rem' }}>Générer ma valise ✨</button>
              </div>
              <div style={{ padding: '0 0.5rem' }}>{suitcase.map((item, idx) => (
                <div key={idx} className={`glass-card ${item.checked ? 'checked' : ''}`} onClick={() => setSuitcase(suitcase.map((s, i) => i === idx ? { ...s, checked: !s.checked } : s))} style={{ padding: '1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: '2px solid var(--primary)', background: item.checked ? 'var(--primary)' : 'transparent' }} />
                  <div style={{ flex: 1, fontWeight: 700 }}>{item.type}</div><div style={{ fontSize: '1.2rem' }}>{item.icon}</div>
                </div>
              ))}</div>
            </motion.div>
          )}

          {/* AUTH FLOWS */}
          {view === 'splash' && (
            <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="logo-container"><RotatingClothes /><h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1><p className="subtitle">L'IA au service de votre style.</p></div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
                <button onClick={() => setView('register')} className="btn-primary">Créer mon dressing ✨</button>
                <button onClick={() => setView('login')} className="btn-secondary">J'ai déjà un compte</button>
              </div>
            </motion.div>
          )}
          {view === 'register' && (
            <motion.div key="register" initial={{ x: 100 }} animate={{ x: 0 }} className="glass-card my-auto">
              <h2 className="title" style={{ textAlign: 'center' }}>Nouveau Dressing</h2>
              <input type="text" placeholder="Ton prénom" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: '2rem' }} />
              <div className="gender-toggle"><button className={`gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Femme</button><button className={`gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Homme</button></div>
              <button className="btn-primary" onClick={handleRegister}>C'est parti</button>
            </motion.div>
          )}
          {view === 'add-choice' && (
            <motion.div key="add-choice" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="glass-card" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '40px 40px 0 0', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '1.6rem' }}>Ajouter</h2><button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none' }}><X size={28} /></button></div>
              <input type="file" accept="image/*" capture="environment" ref={camInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <div style={{ display: 'flex', gap: '1rem' }}><button onClick={() => camInputRef.current.click()} className="btn-primary" style={{ flex: 1, background: 'white', color: 'black', border: '1px solid #ddd' }}><Camera size={24} /> Photo</button><button onClick={() => fileInputRef.current.click()} className="btn-primary" style={{ flex: 1, background: 'white', color: 'black', border: '1px solid #ddd' }}><ImageIcon size={24} /> Galerie</button></div>
            </motion.div>
          )}
          {view === 'add-detail' && (
            <motion.div key="add-detail" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>{selectedImage && <img src={selectedImage} alt="Preview" style={{ width: '100%', borderRadius: '20px', maxHeight: '180px', objectFit: 'contain' }} />}</div>
              <div className="glass-card" style={{ gap: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <h2 className="title" style={{ fontSize: '1.6rem' }}>Détails détectés</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <select className="input-styled" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value, icon: getIconForType(e.target.value)})}>{ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  <select className="input-styled" value={newItem.color} onChange={e => setNewItem({...newItem, color: e.target.value})}>{ALL_COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <button onClick={handleAddItem} className="btn-primary" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Confirmer ✨"}</button>
              </div>
            </motion.div>
          )}
          {outfitLoading && (
            <motion.div key="loading-outfit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', width: '100%', marginTop: '5rem' }}><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ fontSize: '5rem', marginBottom: '2rem' }}>🪄</motion.div><h2 className="title">Génération de ta tenue...</h2></motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
              <header style={{ marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mon Profil</h2></header>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="profile-avatar">{gender === 'female' ? '👩' : '👨'}</div>
                <h3 className="title" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{name || 'Utilisateur'}</h3>
                <input type="email" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isEmailConfirmed} style={{ marginBottom: '1rem' }} />
                <button className="btn-secondary" onClick={async () => { await supabase.auth.signOut(); setIsEmailConfirmed(false); setView('splash'); }} style={{ color: '#f43f5e' }}><LogOut size={20} /> Déconnexion</button>
              </div>
            </motion.div>
          )}

          {showCityModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay" onClick={() => setShowCityModal(false)}>
              <motion.div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2rem' }}>
                <h2 className="title" style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>Changer de ville</h2>
                <input type="text" placeholder="Rechercher..." className="input-styled" value={citySearch} onChange={(e) => handleCitySearch(e.target.value)} />
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem' }}>{cityResults.map(city => (<div key={city.id} onClick={() => { initWeather(city.latitude, city.longitude, city.name); setShowCityModal(false); }} className="btn-secondary" style={{ marginBottom: '0.5rem', textAlign: 'left' }}>{city.name} ({city.country})</div>))}</div>
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
