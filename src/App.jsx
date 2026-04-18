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
  MapPin, Luggage, Plane, ListChecks, ChevronRight
} from 'lucide-react'
import { format, addDays, isWithinInterval, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// Styles & DB & Services
import './styles/index.css'
import { supabase } from './lib/supabase'
import { analyzeClothing, generateOutfit } from './services/ai'
import { getLocalWeather, searchCity } from './services/weather'

// Assets
import logoImg from './assets/logo.png'

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
  const [uid, setUid] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Weather & Filters
  const [weather, setWeather] = useState(null)
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [citySearch, setCitySearch] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [showCityModal, setShowCityModal] = useState(false)

  // Travel Mode
  const [travelData, setTravelData] = useState({ destination: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'), lat: null, lon: null })
  const [suitcase, setSuitcase] = useState([])
  const [suitcaseLoading, setSuitcaseLoading] = useState(false)

  // AI & Alerts
  const [currentOutfit, setCurrentOutfit] = useState(null)
  const [outfitLoading, setOutfitLoading] = useState(false)
  const [forgottenItems, setForgottenItems] = useState([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [loadingPhrase, setLoadingPhrase] = useState("Analyse de ton dressing...")

  const fileInputRef = useRef(null)
  const camInputRef = useRef(null)

  // Expanded Lists
  const ALL_TYPES = ['T-shirt', 'Crop-top', 'Hoodie', 'Sweat', 'Chemise', 'Polo', 'Top', 'Blouse', 'Jean', 'Pantalon', 'Short', 'Jupe', 'Legging', 'Chino', 'Robe', 'Veste', 'Blazer', 'Manteau', 'Parka', 'Trench', 'Cardigan', 'Pull', 'Maillot de bain', 'Pyjama', 'Basket', 'Bottes', 'Sandales', 'Escarpins', 'Accessoire', 'Sac', 'Casquette', 'Bonnet']
  const ALL_COLORS = ['Blanc', 'Noir', 'Gris', 'Beige', 'Marine', 'Bleu Ciel', 'Kaki', 'Vert Sapin', 'Bordeaux', 'Rouge', 'Rose Poudré', 'Rose', 'Moutarde', 'Jaune', 'Lilas', 'Violet', 'Terracotta', 'Orange', 'Or', 'Argent', 'Marron', 'Camel']

  const [newItem, setNewItem] = useState({ type: 'T-shirt', color: 'Blanc', season: 'Été', activity: 'Quotidien', icon: '👕' })

  useEffect(() => { document.documentElement.setAttribute('data-theme', gender) }, [gender])
  useEffect(() => { 
    checkUserSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setView('reset-password')
      else if (session?.user) syncProfile(session.user.email)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (['dashboard', 'outfit-result', 'settings', 'travel'].includes(view)) {
      if (!weather) initWeather()
      checkForForgottenItems()
    }
  }, [view, items])

  const initWeather = async (lat = null, lon = null, cityName = null) => {
    const data = await getLocalWeather(lat, lon)
    if (cityName) data.city = cityName
    setWeather(data)
  }

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) await syncProfile(session.user.email)
  }

  const syncProfile = async (userEmail) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).single()
    if (profile) {
      setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email);
      await fetchItems(profile.id); setView('dashboard');
    }
  }

  const fetchItems = async (profileId) => {
    setLoading(true)
    const { data, error } = await supabase.from('clothes').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    if (error) setError("Erreur de chargement.")
    else setItems(data || [])
    setLoading(false)
  }

  // --- INTELLIGENT SORTING & FILTERING ---
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

    // Sort by Category First (Default)
    list.sort((a, b) => a.type.localeCompare(b.type))

    // Then promote by weather score
    if (weather) {
      list.sort((a, b) => {
        const scoreA = getItemWeatherScore(a, weather.temp)
        const scoreB = getItemWeatherScore(b, weather.temp)
        return scoreB - scoreA
      })
    }
    return list
  }, [items, activeFilter, weather])

  const getItemWeatherScore = (item, temp) => {
    let score = 0
    const winterTypes = ['Manteau', 'Parka', 'Pull', 'Sweat', 'Bonnet', 'Bottes']
    const summerTypes = ['Short', 'T-shirt', 'Crop-top', 'Maillot de bain', 'Sandales']
    
    if (temp < 12) {
      if (winterTypes.includes(item.type)) score += 10
      if (item.season === 'Hiver') score += 5
    } else if (temp > 22) {
      if (summerTypes.includes(item.type)) score += 10
      if (item.season === 'Été') score += 5
    } else {
      if (item.season === 'Printemps' || item.season === 'Automne' || item.season === 'Toutes saisons') score += 5
    }
    return score
  }

  // --- ACTIONS ---
  const handleCitySearch = async (val) => {
    setCitySearch(val)
    if (val.length > 2) {
      const results = await searchCity(val)
      setCityResults(results)
    }
  }

  const selectCity = (city) => {
    initWeather(city.latitude, city.longitude, city.name)
    setShowCityModal(false)
    setCitySearch('')
    setCityResults([])
  }

  const handleGenerateSuitcase = async () => {
    if (!travelData.lat) { alert("Choisis une destination !"); return; }
    setSuitcaseLoading(true)
    try {
      // In a real app, we'd fetch forecast for specific dates. Here we simulate based on location weather.
      const weatherData = await getLocalWeather(travelData.lat, travelData.lon)
      const suggestions = items.filter(item => getItemWeatherScore(item, weatherData.temp) > 0).slice(0, 8)
      setSuitcase(suggestions.map(s => ({ ...s, checked: false })))
    } catch (err) { alert("Erreur lors de la préparation.") }
    setSuitcaseLoading(false)
  }

  const handleLinkEmail = async () => {
    if (!email) return; setLoading(true)
    try {
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'com.dressflow.app://login' } })
      await supabase.from('profiles').update({ email }).eq('id', uid)
      alert("Vérifie tes emails ! ✨")
    } catch (err) { alert(err.message) }
    setLoading(false)
  }

  const handleUpdateLastWorn = async (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids]
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).in('id', idList)
    await fetchItems(uid)
  }

  const handleRegister = async () => {
    setLoading(true); const newUid = generateRandomUID()
    await supabase.from('profiles').insert([{ id: newUid, name, gender }])
    setUid(newUid); setView('success'); setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true); const cleanCode = inputCode.replace(/[^A-Z0-9]/g, '')
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', cleanCode).single()
    if (!profile) { setError("Code invalide"); setLoading(false); return; }
    if (profile.email) { setError("Compte sécurisé par email."); setLoading(false); return; }
    setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email || '');
    await fetchItems(profile.id); setView('dashboard'); setLoading(false)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setView('loading-ai'); setLoading(true)
      try {
        const fileName = `${uid}-${Date.now()}.jpg`
        const { data: upData } = await supabase.storage.from('clothes-images').upload(fileName, file)
        const { data: { publicUrl } } = supabase.storage.from('clothes-images').getPublicUrl(fileName)
        const aiTags = await analyzeClothing(file)
        setNewItem({ ...newItem, ...aiTags, icon: getIconForType(aiTags.type) })
        setSelectedImage(publicUrl); setView('add-detail')
      } catch (err) { setView('add-detail') }
      finally { setLoading(false) }
    }
  }

  const handleAddItem = async () => {
    setLoading(true)
    await supabase.from('clothes').insert([{ profile_id: uid, ...newItem, image_url: selectedImage, last_worn_date: new Date().toISOString() }])
    await fetchItems(uid); setView('dashboard'); setLoading(false)
  }

  const getIconForType = (type) => {
    const icons = { 'T-shirt': '👕', 'Hoodie': '🧥', 'Pantalon': '👖', 'Jean': '👖', 'Robe': '👗', 'Veste': '🧥', 'Basket': '👟', 'Sac': '👜', 'Short': '🩳' }
    return icons[type] || '✨'
  }

  const generateRandomUID = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''; for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
  }

  const formatUID = (val) => {
    const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8)
    return cleaned.length > 4 ? `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}` : cleaned
  }

  const checkForForgottenItems = () => {
    const currentSeason = 'Été' // Hardcoded for demo
    const forgotten = items.filter(item => {
      const lastWorn = new Date(item.last_worn_date || item.created_at)
      return (new Date() - lastWorn) > (60 * 24 * 60 * 60 * 1000)
    })
    setForgottenItems(forgotten)
  }

  // --- COMPONENTS ---
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
  const [selectedImage, setSelectedImage] = useState(null)

  return (
    <div id="root">
      <div className="bg-blobs"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
      <div className="app-container">
        <AnimatePresence mode="wait">
          
          {/* DASHBOARD WITH FILTERS & WEATHER SORT */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1>
                <div onClick={() => setShowCityModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <MapPin size={14} /> {weather?.city || 'Localiser'}
                </div>
              </header>

              {/* Weather Card Interactive */}
              <div className="glass-card" onClick={() => setShowCityModal(true)} style={{ padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '18px' }}><Sun size={24} /></div>
                  <div><div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div><div className="subtitle" style={{ fontSize: '0.85rem', marginTop: 0 }}>{weather ? weather.description : 'Récupération...'}</div></div>
                </div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.8rem' }}>Recommandé</div><div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Basé sur le climat</div></div>
              </div>

              {/* Filter Bar */}
              <div className="filter-bar" style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '1.2rem', scrollbarWidth: 'none' }}>
                {['Tous', 'Mes Hauts', 'Mes Bas', 'Extérieur', 'Robe', 'Sport', 'Soirée'].map(f => (
                  <button key={f} className={`filter-pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
                ))}
              </div>

              {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div> : filteredAndSortedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}><div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧥</div><h3 className="title" style={{ fontSize: '1.4rem' }}>Aucun vêtement</h3><p className="subtitle">Ajoute des habits pour ton dressing intelligent !</p></div>
              ) : (
                <div className="item-grid">
                  {filteredAndSortedItems.map(item => (
                    <div key={item.id} className="item-card" onClick={() => handleUpdateLastWorn(item.id)}>
                      <div className="item-image">
                        {item.image_url ? <img src={item.image_url} alt={item.type} /> : <div style={{ fontSize: '3rem' }}>{item.icon}</div>}
                        {getItemWeatherScore(item, weather?.temp || 20) > 5 && <div className="weather-badge"><Sparkles size={12} /></div>}
                      </div>
                      <div className="item-info"><div className="item-type">{item.type}</div><div className="item-meta">{item.color} • {item.activity}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TRAVEL MODE (SUITCASE HELPER) */}
          {view === 'travel' && (
            <motion.div key="travel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-container">
              <header style={{ marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mode Voyage ✈️</h2><p className="subtitle">Prépare ta valise intelligemment.</p></header>
              
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="subtitle" style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Destination</label>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '15px', opacity: 0.4 }} size={18} />
                    <input type="text" placeholder="Où pars-tu ?" className="input-styled" style={{ paddingLeft: '40px' }} value={citySearch} onChange={(e) => handleCitySearch(e.target.value)} />
                    {cityResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '15px', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: '5px' }}>
                        {cityResults.map(city => (
                          <div key={city.id} onClick={() => { setTravelData({ ...travelData, destination: city.name, lat: city.latitude, lon: city.longitude }); setCityResults([]); setCitySearch(city.name); }} style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700 }}>{city.name}</span><span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{city.country}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}><label className="subtitle" style={{ fontSize: '0.7rem' }}>Départ</label><input type="date" className="input-styled" value={travelData.startDate} onChange={e => setTravelData({ ...travelData, startDate: e.target.value })} /></div>
                  <div style={{ flex: 1 }}><label className="subtitle" style={{ fontSize: '0.7rem' }}>Retour</label><input type="date" className="input-styled" value={travelData.endDate} onChange={e => setTravelData({ ...travelData, endDate: e.target.value })} /></div>
                </div>
                <button className="btn-primary" onClick={handleGenerateSuitcase} style={{ marginTop: '1.5rem' }}>{suitcaseLoading ? <Loader2 className="animate-spin" /> : "Générer ma valise ✨"}</button>
              </div>

              {suitcase.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                  <h3 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Ma Checklist Valise</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {suitcase.map((item, idx) => (
                      <div key={idx} className={`glass-card ${item.checked ? 'checked' : ''}`} onClick={() => setSuitcase(suitcase.map((s, i) => i === idx ? { ...s, checked: !s.checked } : s))} style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: item.checked ? 'rgba(16, 185, 129, 0.1)' : 'white' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.checked ? 'var(--primary)' : 'transparent' }}>
                          {item.checked && <Check size={16} color="white" />}
                        </div>
                        <div style={{ flex: 1, fontWeight: 700, opacity: item.checked ? 0.5 : 1 }}>{item.type} ({item.color})</div>
                        <div style={{ fontSize: '1.2rem' }}>{item.icon}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ADD DETAIL WITH EXPANDED CHOICES */}
          {view === 'add-detail' && (
            <motion.div key="add-detail" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="dashboard-container">
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                {selectedImage ? <img src={selectedImage} alt="Preview" style={{ width: '100%', borderRadius: '20px', maxHeight: '180px', objectFit: 'contain' }} /> : <div style={{ fontSize: '6rem' }}>👗</div>}
              </div>
              <div className="glass-card" style={{ gap: '1.5rem', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                <h2 className="title" style={{ fontSize: '1.6rem' }}>Modifier les infos</h2>
                <div>
                  <label className="subtitle" style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.8rem', display: 'block' }}>Type de vêtement</label>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', maxHeight: '150px', overflowY: 'auto', padding: '5px' }}>
                    {ALL_TYPES.map(t => (<span key={t} className={`tag-pill ${newItem.type === t ? 'active' : ''}`} onClick={() => setNewItem({...newItem, type: t, icon: getIconForType(t)})}>{t}</span>))}
                  </div>
                </div>
                <div>
                  <label className="subtitle" style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.8rem', display: 'block' }}>Couleur</label>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto', padding: '5px' }}>
                    {ALL_COLORS.map(c => (<span key={c} className={`tag-pill ${newItem.color === c ? 'active' : ''}`} onClick={() => setNewItem({...newItem, color: c})}>{c}</span>))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="subtitle" style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Saison</label>
                    <select className="input-styled" style={{ padding: '0.8rem' }} value={newItem.season} onChange={e => setNewItem({...newItem, season: e.target.value})}>
                      {['Été', 'Hiver', 'Printemps', 'Automne', 'Toutes saisons'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="subtitle" style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Activité</label>
                    <select className="input-styled" style={{ padding: '0.8rem' }} value={newItem.activity} onChange={e => setNewItem({...newItem, activity: e.target.value})}>
                      {['Quotidien', 'Travail', 'Soirée', 'Sport', 'Détente'].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleAddItem} className="btn-primary" style={{ marginTop: '1rem' }}>Ajouter à mon dressing ✨</button>
              </div>
            </motion.div>
          )}

          {/* CITY MODAL */}
          <AnimatePresence>
            {showCityModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowCityModal(false)}>
                <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ height: 'auto', padding: '2rem' }}>
                  <h2 className="title" style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>Changer de ville</h2>
                  <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '15px', opacity: 0.4 }} size={18} />
                    <input type="text" placeholder="Rechercher une ville..." className="input-styled" style={{ paddingLeft: '40px' }} value={citySearch} onChange={(e) => handleCitySearch(e.target.value)} />
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {cityResults.map(city => (
                      <div key={city.id} onClick={() => selectCity(city)} className="btn-secondary" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
                        <span style={{ fontWeight: 800 }}>{city.name}</span><span style={{ opacity: 0.5 }}>{city.country}</span>
                      </div>
                    ))}
                    {citySearch.length > 2 && cityResults.length === 0 && <p className="subtitle" style={{ textAlign: 'center', padding: '1rem' }}>Aucun résultat...</p>}
                  </div>
                  <button className="btn-primary" style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.05)', color: 'black', boxShadow: 'none' }} onClick={() => setShowCityModal(false)}>Fermer</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OTHER VIEWS (SPLASH, LOGIN, SUCCESS, RESET, OUTFIT, ADD CHOICE, LOADING) - Keep existing logic or update as needed */}
          {view === 'splash' && (
            <motion.div key="splash" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="logo-container"><RotatingClothes /><h1 className="title" style={{ marginTop: '1rem' }}>Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1><p className="subtitle">L'IA au service de votre style.</p></div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}>
                <button onClick={() => setView('register')} className="btn-primary">Créer mon dressing ✨</button>
                <button onClick={() => setView('login')} className="btn-secondary">J'ai déjà un compte</button>
              </div>
            </motion.div>
          )}
          {view === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} className="glass-card my-auto">
              <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Connexion</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button onClick={() => setView('login-code')} className="btn-primary" style={{ background: 'white', color: 'black' }}><Key size={20} /> Via Code d'accès</button>
                <button onClick={() => setView('login-email')} className="btn-primary"><Mail size={20} /> Via Email</button>
              </div>
            </motion.div>
          )}
          {view === 'login-code' && (
            <motion.div key="login-code" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} className="glass-card my-auto">
              <button onClick={() => setView('login')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Code d'accès</h2>
              {error && <div style={{ color: '#f43f5e', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 700 }}>{error}</div>}
              <input type="text" placeholder="Ex: AB12 - CD34" className="input-styled" value={formatUID(inputCode)} onChange={(e) => setInputCode(e.target.value)} maxLength={11} />
              <button className="btn-primary" onClick={handleLogin} disabled={inputCode.length < 8 || loading} style={{ marginTop: '2rem' }}>{loading ? <Loader2 className="animate-spin" /> : "Se connecter"}</button>
            </motion.div>
          )}
          {view === 'login-email' && (
            <motion.div key="login-email" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} className="glass-card my-auto">
              <button onClick={() => setView('login')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>Email Login</h2>
              <input type="email" placeholder="votre@email.com" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn-primary" onClick={handleLoginEmail} disabled={!email || loading} style={{ marginTop: '2rem' }}>Envoyer le lien ✨</button>
            </motion.div>
          )}
          {view === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} className="glass-card my-auto">
              <button onClick={() => setView('splash')} className="btn-secondary" style={{ textAlign: 'left', padding: 0, width: 'auto', background: 'none', border: 'none' }}><ChevronLeft size={20} /> Retour</button>
              <div style={{ marginBottom: '1.5rem' }}><RotatingClothes /></div>
              <h2 className="title" style={{ fontSize: '2.4rem', marginBottom: '2.5rem', textAlign: 'center' }}>Nouveau Dressing</h2>
              <input type="text" placeholder="Ton prénom" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="gender-toggle"><button className={`gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Femme</button><button className={`gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Homme</button></div>
              <button className="btn-primary" onClick={handleRegister} disabled={!name || loading}>C'est parti</button>
            </motion.div>
          )}
          {view === 'success' && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card my-auto" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>✨</div>
              <h2 className="title" style={{ fontSize: '2.2rem' }}>Bravo {name} !</h2>
              <div className="uid-box"><div className="uid-text">{uid}</div></div>
              <button onClick={() => setView('dashboard')} className="btn-secondary" style={{ marginTop: '2.5rem' }}>Accéder à mon dressing</button>
            </motion.div>
          )}
          {view === 'add-choice' && (
            <motion.div key="add-choice" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="glass-card" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderRadius: '40px 40px 0 0', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '1.6rem' }}>Ajouter un habit</h2><button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none' }}><X size={28} /></button></div>
              <input type="file" accept="image/*" capture="environment" ref={camInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => camInputRef.current.click()} className="btn-primary" style={{ flex: 1, height: '140px', flexDirection: 'column', background: 'white', color: 'black', border: '1px solid #ddd' }}><Camera size={32} /> Photo</button>
                <button onClick={() => fileInputRef.current.click()} className="btn-primary" style={{ flex: 1, height: '140px', flexDirection: 'column', background: 'white', color: 'black', border: '1px solid #ddd' }}><ImageIcon size={32} /> Galerie</button>
              </div>
            </motion.div>
          )}
          {(view === 'loading-ai' || view === 'loading-outfit') && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="my-auto text-center" style={{ textAlign: 'center', width: '100%' }}><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ fontSize: '5rem', marginBottom: '2rem' }}>{view === 'loading-ai' ? '🧠' : '🪄'}</motion.div><h2 className="title" style={{ fontSize: '1.8rem' }}>{loadingPhrase}</h2></motion.div>
          )}

          {/* OUTFIT RESULT VIEW */}
          {view === 'outfit-result' && (
            <motion.div key="outfit-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Ton Styliste IA 🪄</h2><p className="subtitle">Basé sur la météo de {weather?.city || 'ta position'}.</p></header>
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧥</div>
                <h3 className="title" style={{ fontSize: '1.4rem' }}>Générer un look ?</h3>
                <p className="subtitle" style={{ marginBottom: '2rem' }}>L'IA va scanner ton dressing et la météo ({weather?.temp}°C) pour te proposer la tenue idéale.</p>
                <button className="btn-primary" onClick={() => alert("Génération en cours...")}>Générer mon look ✨</button>
              </div>
            </motion.div>
          )}

          {/* SETTINGS VIEW */}
          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mon Profil 👤</h2></header>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}><Mail size={20} color="var(--primary)" /><span style={{ fontWeight: 800 }}>{email || 'Non renseigné'}</span></div>
                <button className="btn-secondary" onClick={() => setView('splash')}>Se déconnecter</button>
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
