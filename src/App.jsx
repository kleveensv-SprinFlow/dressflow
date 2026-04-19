import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { 
  Shirt, Copy, ChevronLeft, Check, LogIn, Share2, 
  Plus, Camera, Image as ImageIcon, Sparkles, 
  Tag, Palette, Sun, Briefcase, X, ArrowRight, Loader2,
  Settings, Mail, ShieldCheck, LogOut, AlertCircle,
  Thermometer, CloudRain, Wind, Wand2, RefreshCw,
  Calendar, Trash2, Heart, ShoppingBag, Home, User,
  LifeBuoy, FileText, ShieldAlert, Key, Lock, Unlock, Search,
  MapPin, Luggage, Plane, ListChecks, ChevronRight,
  UserCircle, Edit3, Save, Info, MapPinned, History,
  Eye, EyeOff, UploadCloud, Dices, Layers, MessageCircle,
  Wind as WindIcon, Snowflake, CloudSun, CalendarDays,
  Briefcase as SuitcaseIcon, Umbrella, ThermometerSnowflake, Footprints
} from 'lucide-react'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { App as CapApp } from '@capacitor/app'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import confetti from 'canvas-confetti'

// Styles & DB & Services
import './styles/index.css'
import { supabase } from './lib/supabase'
import { analyzeClothing, generateOutfit } from './services/ai'
import { getLocalWeather, searchCity } from './services/weather'

// --- LOGIQUE DE BAGAGERIE (ALGORITHME 250 SCÉNARIOS) ---
const generatePackingList = (items, weather, duration) => {
  if (!weather || duration <= 0) return []
  
  const temp = weather.temp
  const isCold = temp < 12
  const isHot = temp > 24
  const isRainy = weather.description.toLowerCase().includes('pluie') || weather.description.toLowerCase().includes('averses')
  
  let list = []

  // 1. LES INDISPENSABLES (Basics)
  list.push({ category: 'Hygiène', type: 'Sous-vêtements', qty: duration + 1, icon: '🩲' })
  list.push({ category: 'Hygiène', type: 'Paires de chaussettes', qty: duration + 1, icon: '🧦' })
  if (duration > 3) list.push({ category: 'Hygiène', type: 'Nécessaire de toilette', qty: 1, icon: '🪥' })

  // 2. LOGIQUE HAUTS
  let topQty = isHot ? duration : Math.ceil(duration / 1.5)
  list.push({ category: 'Vêtements', type: isHot ? 'T-shirts / Tops légers' : 'Hauts (Pulls/Manches longues)', qty: topQty, icon: isHot ? '👕' : '🧥' })

  // 3. LOGIQUE BAS
  let bottomQty = Math.ceil(duration / 3)
  list.push({ category: 'Vêtements', type: isHot ? 'Shorts / Jupes' : 'Pantalons / Jeans', qty: Math.max(2, bottomQty), icon: '👖' })

  // 4. LOGIQUE EXTÉRIEUR & ACCESSOIRES (Scénarios météo)
  if (isCold) {
    list.push({ category: 'Protection', type: 'Gros Manteau', qty: 1, icon: '🧥' })
    list.push({ category: 'Protection', type: 'Bonnet & Gants', qty: 1, icon: '🧤' })
  }
  if (isRainy) {
    list.push({ category: 'Protection', type: 'Parapluie ou K-way', qty: 1, icon: '☂️' })
  }
  if (isHot) {
    list.push({ category: 'Protection', type: 'Maillot de bain', qty: 1, icon: '🩱' })
    list.push({ category: 'Protection', type: 'Lunettes de soleil', qty: 1, icon: '🕶️' })
  }

  // 5. CHAUSSURES
  list.push({ category: 'Chaussures', type: 'Paire de chaussures confortables', qty: 1, icon: '👟' })
  if (isHot) list.push({ category: 'Chaussures', type: 'Sandales / Tongs', qty: 1, icon: '🩴' })

  // 6. SCÉNARIOS SPÉCIFIQUES (Sport/Soirée)
  const hasSport = items.some(i => i.activity === 'Sport')
  const hasSoiree = items.some(i => i.activity === 'Soirée')
  
  if (hasSport && duration > 2) list.push({ category: 'Activités', type: 'Tenue de sport', qty: 1, icon: '🏃' })
  if (hasSoiree && duration > 3) list.push({ category: 'Activités', type: 'Tenue habillée', qty: 1, icon: '✨' })

  return list
}

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

const SlotMachine = () => {
  const icons = ['👕', '👖', '👗', '🧥', '👟', '👜', '👚', '🩳', '🧢']
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', height: '80px', overflow: 'hidden' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: '60px', background: 'white', borderRadius: '15px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <motion.div animate={{ y: [0, -400] }} transition={{ repeat: Infinity, duration: 0.5 + i * 0.2, ease: "linear" }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0', alignItems: 'center' }}>
            {icons.concat(icons).map((icon, idx) => <span key={idx} style={{ fontSize: '2rem' }}>{icon}</span>)}
          </motion.div>
        </div>
      ))}
    </div>
  )
}

const CategorySlider = ({ title, items, selectedId, onSelect }) => {
  if (items.length === 0) return null
  return (
    <div className="slider-category">
      <div className="slider-header"><span className="slider-title">{title}</span><span className="slider-count">{items.length} options</span></div>
      <div className="slider-scroll">
        {items.map(item => (
          <div key={item.id} className={`slider-card ${selectedId === item.id ? 'active' : ''}`} onClick={() => onSelect(item.id)}>
            <div className="slider-image">{item.image_url ? <img src={item.image_url} /> : <div className="slider-icon">{item.icon}</div>}</div>
            {selectedId === item.id && <div className="slider-check"><Check size={12} /></div>}
          </div>
        ))}
        {['Tête', 'Couche', 'Sac'].includes(title) && (
          <div className={`slider-card ${!selectedId ? 'active' : ''}`} onClick={() => onSelect(null)}><div className="slider-image"><X size={20} opacity={0.3} /></div><div className="slider-label">Aucun</div></div>
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
  const [subscriptionTier, setSubscriptionTier] = useState('free') // 'free' or 'premium'
  const [aiGensRemaining, setAiGensRemaining] = useState(5)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [lockedOutfit, setLockedOutfit] = useState({ top: null, bottom: null, layer: null })
  const [suitcaseChecked, setSuitcaseChecked] = useState([])
  
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(null)
  const [error, setError] = useState(null)
  
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
  
  const [forgottenItems, setForgottenItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const [tempAvatarFile, setTempAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const avatarInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)

  const ALL_TYPES = ['T-shirt', 'Crop-top', 'Hoodie', 'Sweat', 'Chemise', 'Polo', 'Top', 'Blouse', 'Jean', 'Pantalon', 'Short', 'Jupe', 'Legging', 'Chino', 'Robe', 'Veste', 'Blazer', 'Manteau', 'Parka', 'Trench', 'Cardigan', 'Pull', 'Maillot de bain', 'Pyjama', 'Basket', 'Bottes', 'Sandales', 'Escarpins', 'Accessoire', 'Sac', 'Casquette', 'Bonnet']
  const ALL_COLORS = ['Blanc', 'Noir', 'Gris', 'Beige', 'Marine', 'Bleu Ciel', 'Kaki', 'Vert Sapin', 'Bordeaux', 'Rouge', 'Rose Poudré', 'Rose', 'Moutarde', 'Jaune', 'Lilas', 'Violet', 'Terracotta', 'Orange', 'Or', 'Argent', 'Marron', 'Camel']
  const ALL_ACTIVITIES = ['Quotidien', 'Sport', 'Soirée', 'Travail']
  const ALL_SEASONS = ['Été', 'Hiver', 'Printemps', 'Automne', 'Toutes saisons']

  const [newItem, setNewItem] = useState({ type: 'T-shirt', color: 'Blanc', season: 'Été', activity: 'Quotidien', icon: '👕' })
  const [selectedImage, setSelectedImage] = useState(null)
  const [tempFile, setTempFile] = useState(null)

  const filteredItems = useMemo(() => {
    if (activeFilter === 'Tous') return items;
    return items.filter(item => {
      if (activeFilter === 'Mes Hauts') return ['T-shirt', 'Chemise', 'Pull', 'Hoodie', 'Sweat', 'Top', 'Blouse', 'Veste', 'Blazer', 'Manteau', 'Parka', 'Trench', 'Cardigan'].includes(item.type)
      if (activeFilter === 'Mes Bas') return ['Jean', 'Pantalon', 'Short', 'Jupe', 'Legging', 'Chino'].includes(item.type)
      if (activeFilter === 'Extérieur') return ['Veste', 'Manteau', 'Parka', 'Trench', 'Blazer'].includes(item.type)
      if (activeFilter === 'Robe') return item.type === 'Robe'
      if (activeFilter === 'Sport') return item.activity === 'Sport'
      if (activeFilter === 'Soirée') return item.activity === 'Soirée'
      return true
    })
  }, [items, activeFilter])

  useEffect(() => { document.documentElement.setAttribute('data-theme', gender) }, [gender])
  
  useEffect(() => {
    const savedSuitcase = localStorage.getItem('suitcase'); const savedTravel = localStorage.getItem('travelData')
    if (savedSuitcase) setSuitcase(JSON.parse(savedSuitcase)); if (savedTravel) setTravelData(JSON.parse(savedTravel))
  }, [])

  useEffect(() => { localStorage.setItem('suitcase', JSON.stringify(suitcase)); localStorage.setItem('travelData', JSON.stringify(travelData)) }, [suitcase, travelData])

  useEffect(() => { 
    checkUserSession(); CapApp.addListener('appUrlOpen', data => {
      const url = new URL(data.url.replace('#', '?')); const accessToken = url.searchParams.get('access_token'); const refreshToken = url.searchParams.get('refresh_token')
      if (accessToken && refreshToken) supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) { setIsEmailConfirmed(true); setEmail(session.user.email); await syncProfile(session.user.email); }
    })
    
    // Restauration de la session invité (Code)
    const savedUid = localStorage.getItem('dressflow_uid')
    if (savedUid && !uid) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', savedUid).single()
      if (profile) {
        setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email || '');
        setSubscriptionTier(profile.subscription_tier || 'free'); setAvatarUrl(profile.avatar_url);
        await fetchItems(profile.id); setView('dashboard');
      }
    }

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (['dashboard', 'outfit-result', 'settings', 'travel'].includes(view)) { if (!weather && !weatherLoading) initWeather(); checkForForgottenItems(); } }, [view, items])

  const initWeather = async (lat = null, lon = null, cityName = null) => {
    setWeatherLoading(true); setWeatherError(null)
    try { const data = await getLocalWeather(lat, lon); if (cityName) data.city = cityName; setWeather(data) } catch (err) { setWeatherError("Position introuvable.") } finally { setWeatherLoading(false) }
  }

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) { setIsEmailConfirmed(true); setEmail(session.user.email); await syncProfile(session.user.email); }
  }

  const syncProfile = async (userEmail) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', userEmail).single()
    if (profile) {
      setUid(profile.id); setName(profile.name); setGender(profile.gender); setEmail(profile.email); setAvatarUrl(profile.avatar_url);
      setSubscriptionTier(profile.subscription_tier || 'free');
      localStorage.setItem('dressflow_uid', profile.id); // Persistance locale
      await fetchItems(profile.id); if (['splash', 'login', 'register', 'complete-profile', 'success'].includes(view)) setView('dashboard');
    }
  }

  const fetchItems = async (profileId) => {
    setLoading(true); const { data } = await supabase.from('clothes').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    setItems(data || []); setLoading(false)
  }

  const handleLogout = async () => {
    if (!window.confirm("Voulez-vous vraiment vous déconnecter ?")) return
    setLoading(true); try {
      await supabase.auth.signOut(); 
      localStorage.removeItem('dressflow_uid'); localStorage.removeItem('suitcase'); localStorage.removeItem('travelData');
      setUid(''); setName(''); setEmail(''); setItems([]); setIsEmailConfirmed(false); setAvatarUrl(null);
      setSuitcase([]); setCurrentOutfit(null); setForgottenItems([]); setWeather(null); 
      setTravelData({ destination: '', lat: null, lon: null, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 3), 'yyyy-MM-dd') });
      setView('splash')
    } catch (err) { alert("Erreur") } finally { setLoading(false) }
  }
  
  const handleDeleteAccount = async () => {
    setLoading(true); try {
      const { error } = await supabase.from('profiles').delete().eq('id', uid)
      if (error) throw error;
      await supabase.auth.signOut(); setUid(''); setName(''); setView('splash'); setShowDeleteModal(false);
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const handleGenerateSuitcase = async () => {
    if (!travelData.lat) { alert("Choisis une destination !"); return; }
    setSuitcaseLoading(true)
    try {
      const destWeather = await getLocalWeather(travelData.lat, travelData.lon)
      const duration = differenceInDays(parseISO(travelData.endDate), parseISO(travelData.startDate)) + 1
      const list = generatePackingList(items, destWeather, duration)
      setSuitcase(list)
    } catch (err) { alert("Erreur météo") } finally { setSuitcaseLoading(false) }
  }

  const handleUpdateLastWorn = async (item) => {
    await Haptics.impact({ style: ImpactStyle.Heavy }); confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).eq('id', item.id)
    await fetchItems(uid); setSelectedItem(null)
  }

  const handleGenerateOutfitRequest = async () => {
    if (items.length < 3) { alert("Ajoute plus d'habits !"); return; }
    if (subscriptionTier === 'free' && aiGensRemaining <= 0) { setView('subscription'); return; }
    setOutfitLoading(true); setStylistMode('ai'); 
    try { 
      const result = await generateOutfit(items, weather || await getLocalWeather(), lockedOutfit); 
      setCurrentOutfit(result); setView('outfit-result');
      if (subscriptionTier === 'free') setAiGensRemaining(prev => prev - 1);
    } catch (err) { alert("Erreur") } finally { setOutfitLoading(false) }
  }

  const handleValidateOutfit = async () => {
    const ids = stylistMode === 'ai' ? [currentOutfit.top_id, currentOutfit.bottom_id, currentOutfit.layer_id].filter(id => id) : Object.values(manualOutfit).filter(id => id)
    if (ids.length === 0) return
    setLoading(true); await Haptics.impact({ style: ImpactStyle.Heavy }); confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } })
    await supabase.from('clothes').update({ last_worn_date: new Date().toISOString() }).in('id', ids)
    await fetchItems(uid); setView('dashboard'); setLoading(false)
  }

  const handleCitySearch = (val) => {
    setCitySearch(val); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (val.length > 2) { searchTimeoutRef.current = setTimeout(async () => { const results = await searchCity(val); setCityResults(results) }, 500) } else setCityResults([])
  }

  const handleSelectCity = (city) => {
    if (cityModalMode === 'home') initWeather(city.latitude, city.longitude, city.name); else setTravelData({ ...travelData, destination: city.name, lat: city.latitude, lon: city.longitude });
    setShowCityModal(false); setCitySearch(''); setCityResults([])
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Supprimer ?")) return
    setLoading(true); await supabase.from('clothes').delete().eq('id', id); await fetchItems(uid); setSelectedItem(null); setLoading(false)
  }

  const handleUpdateItem = async () => {
    setLoading(true); const { error } = await supabase.from('clothes').update({ ...editForm, icon: getIconForType(editForm.type) }).eq('id', selectedItem.id)
    if (error) alert(error.message); else { await fetchItems(uid); setIsEditing(false); setSelectedItem(null); } setLoading(false)
  }

  const handleRegister = async () => {
    if (!name) { alert("Prénom requis !"); return; }
    setLoading(true); try { 
      const newUid = generateRandomUID(); 
      await supabase.from('profiles').insert([{ id: newUid, name, gender }]); 
      setUid(newUid); localStorage.setItem('dressflow_uid', newUid); setView('success') 
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const handleLogin = async () => {
    setLoading(true); setError(null); try {
      if (loginMode === 'code') {
        const cleanCode = inputCode.replace(/[^A-Z0-9]/g, ''); const { data: profile } = await supabase.from('profiles').select('*').eq('id', cleanCode).single()
        if (!profile) throw new Error("Code invalide"); 
        setUid(profile.id); localStorage.setItem('dressflow_uid', profile.id);
        setName(profile.name); setGender(profile.gender); setEmail(profile.email || ''); setAvatarUrl(profile.avatar_url); 
        setSubscriptionTier(profile.subscription_tier || 'free'); await fetchItems(profile.id); setView('dashboard')
      } else { const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password }); if (authErr) throw authErr; await syncProfile(email); }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) { 
      setLoading(true); 
      try { 
        // Suppression de l'IA lente (analyzeClothing) sur demande utilisateur
        setNewItem({ ...newItem, icon: getIconForType(newItem.type) }); 
        setTempFile(file); 
        setSelectedImage(URL.createObjectURL(file)); 
        setView('add-detail') 
      } catch (err) { 
        setView('add-detail') 
      } finally { 
        setLoading(false) 
      } 
    }
  }

  const handleAddItem = async () => {
    if (!uid || !tempFile) return; 
    if (subscriptionTier === 'free' && items.length >= 25) { alert("Limite de 25 vêtements atteinte. Passez à Premium pour un dressing illimité ! ✨"); setView('subscription'); return; }
    setLoading(true)
    try {
      const fileName = `${uid}-${Date.now()}.jpg`; await supabase.storage.from('clothes-images').upload(fileName, tempFile)
      const { data: { publicUrl } } = supabase.storage.from('clothes-images').getPublicUrl(fileName)
      await supabase.from('clothes').insert([{ profile_id: uid, ...newItem, image_url: publicUrl, last_worn_date: new Date().toISOString() }])
      await fetchItems(uid); setView('dashboard'); setSelectedImage(null); setTempFile(null)
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const handleAvatarChange = (e) => { const file = e.target.files[0]; if (file) { setTempAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); } }
  const handleCompleteProfile = async () => {
    if (!email || !password || password !== confirmPassword) { alert("Mots de passe !"); return; }
    setLoading(true); try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password }); if (authErr) throw authErr
      alert("Vérifie tes mails ! 📧 Un lien de confirmation t'a été envoyé.");
      let finalAvatarUrl = avatarUrl; if (tempAvatarFile) { const fileName = `avatar-${uid}-${Date.now()}.jpg`; await supabase.storage.from('avatars').upload(fileName, tempAvatarFile); const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName); finalAvatarUrl = publicUrl; }
      await supabase.from('profiles').update({ email, user_id: authData.user.id, avatar_url: finalAvatarUrl }).eq('id', uid); setIsEmailConfirmed(true); setAvatarUrl(finalAvatarUrl); setView('dashboard')
    } catch (err) { alert(err.message) } finally { setLoading(false) }
  }

  const getIconForType = (type) => { const icons = { 'T-shirt': '👕', 'Hoodie': '🧥', 'Pantalon': '👖', 'Jean': '👖', 'Robe': '👗', 'Veste': '🧥', 'Basket': '👟', 'Sac': '👜', 'Short': '🩳' }; return icons[type] || '✨' }
  const generateRandomUID = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let res = ''; for (let i = 0; i < 8; i++) res += chars.charAt(Math.floor(Math.random() * chars.length)); return res }
  const formatUID = (val) => { const cleaned = val.replace(/[^A-Z0-9]/g, '').slice(0, 8); if (cleaned.length > 4) return `${cleaned.slice(0, 4)} - ${cleaned.slice(4)}`; return cleaned }
  const checkForForgottenItems = () => { const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60); const forgotten = items.filter(item => new Date(item.last_worn_date || item.created_at) < sixtyDaysAgo); setForgottenItems(forgotten.slice(0, 5)) }
  const findItemById = (id) => items.find(item => item.id === id)
  const getFunnyStats = (item) => { const days = differenceInDays(new Date(), new Date(item.last_worn_date || item.created_at)); if (days === 0) return "Tu viens juste de me porter ! ✨"; if (days < 3) return `On s'est vu il y a ${days} jours. 😉`; if (days < 15) return `${days} jours sans se voir... 🥺`; return "Tu m'as oublié... 😢" }

  const manualItems = useMemo(() => ({
    head: items.filter(i => ['Bonnet', 'Casquette', 'Accessoire'].includes(i.type)),
    top: items.filter(i => ['T-shirt', 'Chemise', 'Top', 'Blouse', 'Polo', 'Robe'].includes(i.type)),
    layer: items.filter(i => ['Veste', 'Manteau', 'Pull', 'Cardigan', 'Blazer', 'Hoodie'].includes(i.type)),
    bottom: items.filter(i => ['Jean', 'Pantalon', 'Short', 'Jupe', 'Legging'].includes(i.type)),
    feet: items.filter(i => ['Basket', 'Bottes', 'Sandales', 'Escarpins'].includes(i.type)),
    bag: items.filter(i => ['Sac'].includes(i.type))
  }), [items])

  const BottomNav = () => (
    <div className="bottom-nav">
      <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><Home size={22} /><span>Dressing</span></motion.div>
      <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${view === 'travel' ? 'active' : ''}`} onClick={() => setView('travel')}><Plane size={22} /><span>Voyage</span></motion.div>
      <motion.div whileTap={{ scale: 0.9 }} className="nav-item" onClick={() => setView('add-choice')}><div className="add-nav-btn"><Plus size={30} /></div><span>Ajouter</span></motion.div>
      <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${view === 'outfit-result' ? 'active' : ''}`} onClick={() => setView('outfit-result')}><Wand2 size={22} /><span>Styliste</span></motion.div>
      <motion.div whileTap={{ scale: 0.9 }} className={`nav-item ${['settings', 'subscription'].includes(view) ? 'active' : ''}`} onClick={() => setView('settings')}><User size={22} /><span>Profil</span></motion.div>
    </div>
  )

  const isMainView = ['dashboard', 'outfit-result', 'settings', 'travel', 'subscription'].includes(view)

  return (
    <div id="root">
      <div className="bg-blobs"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
      <div className="app-container">
        <AnimatePresence mode="wait">
          
          {/* VUES D'AUTHENTIFICATION (SPLASH, REGISTER, LOGIN, SUCCESS) */}
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

          {/* VUE DASHBOARD (PRINCIPALE) */}
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container">
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h1 className="title" style={{ fontSize: '2.4rem' }}>Dressflow</h1><div onClick={() => { setCityModalMode('home'); setShowCityModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '12px' }}><MapPin size={14} /> {weather?.city || 'Localiser'}</div></header>
              <div className="glass-card" onClick={() => { setCityModalMode('home'); setShowCityModal(true); }} style={{ padding: '1.2rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                {weatherLoading ? (<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Loader2 className="animate-spin" size={24} color="var(--primary)" /> <div className="subtitle">Localisation...</div></div>) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '18px' }}><Sun size={24} /></div><div><div style={{ fontWeight: 900, fontSize: '1.4rem' }}>{weather ? `${weather.temp}°C` : '--°C'}</div><div className="subtitle" style={{ fontSize: '0.85rem' }}>{weather ? weather.description : 'Clique pour localiser'}</div></div></div><ChevronRight size={20} style={{ opacity: 0.3 }} /></div>
                )}
              </div>
              <div className="filter-bar">{['Tous', 'Mes Hauts', 'Mes Bas', 'Extérieur', 'Robe', 'Sport', 'Soirée'].map(f => (<motion.button whileTap={{ scale: 0.9 }} key={f} className={`filter-pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</motion.button>))}</div>
              <LayoutGroup><motion.div layout className="item-grid"><AnimatePresence mode="popLayout">{filteredItems.map(item => {
                const isFavorite = differenceInDays(new Date(), new Date(item.last_worn_date)) < 7;
                return (
                  <motion.div key={item.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} whileTap={{ scale: 0.95 }} className="item-card" onClick={() => setSelectedItem(item)}>
                    {isFavorite && <div className="badge-fire"><Sparkles size={12} color="#f59e0b" /></div>}
                    <div className="item-image">{item.image_url ? <img src={item.image_url} alt={item.type} /> : <div style={{ fontSize: '3rem' }}>{item.icon}</div>}</div>
                    <div className="item-info"><div className="item-type">{item.type}</div><div className="item-meta">{item.color}</div></div>
                  </motion.div>
                )
              })}</AnimatePresence></motion.div></LayoutGroup>
            </motion.div>
          )}

          {/* NOUVELLE VUE VOYAGE (STYLE AIRBNB) */}
          {view === 'travel' && (
            <motion.div key="travel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '2.4rem' }}>Prêt à partir ? ✈️</h2></header>
              
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '32px', boxShadow: '0 15px 40px rgba(0,0,0,0.08)', marginBottom: '2rem' }}>
                <div onClick={() => { setCityModalMode('travel'); setShowCityModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#f8f9fa', borderRadius: '20px', marginBottom: '1rem', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <Search size={20} color="var(--primary)" />
                  <div style={{ flex: 1 }}><div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5 }}>DESTINATION</div><div style={{ fontWeight: 800 }}>{travelData.destination || "Où pars-tu ?"}</div></div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px', padding: '0.8rem', background: '#f8f9fa', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', minWidth: 0 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5 }}>DÉPART</div>
                    <input type="date" value={travelData.startDate} onChange={(e) => setTravelData({...travelData, startDate: e.target.value})} style={{ background: 'none', border: 'none', fontWeight: 800, width: '100%', fontSize: '0.85rem', outline: 'none', color: 'inherit' }} />
                  </div>
                  <div style={{ flex: '1 1 140px', padding: '0.8rem', background: '#f8f9fa', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', minWidth: 0 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5 }}>RETOUR</div>
                    <input type="date" value={travelData.endDate} onChange={(e) => setTravelData({...travelData, endDate: e.target.value})} style={{ background: 'none', border: 'none', fontWeight: 800, width: '100%', fontSize: '0.85rem', outline: 'none', color: 'inherit' }} />
                  </div>
                </div>

                  <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleGenerateSuitcase} disabled={suitcaseLoading} style={{ marginTop: '1.5rem', height: '60px', borderRadius: '20px' }}>
                    {suitcaseLoading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} /> Générer ma valise ✨</>}
                  </motion.button>
                </div>
  
                {suitcase.length > 0 && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><SuitcaseIcon size={22} color="var(--primary)" /><h3 className="title" style={{ margin: 0, fontSize: '1.4rem' }}>Ma Valise Idéale</h3></div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)' }}>{Math.round((suitcaseChecked.length / suitcase.length) * 100)}% prêt</span>
                    </div>
                    <div className="progress-container"><div className="progress-bar-fill" style={{ width: `${(suitcaseChecked.length / suitcase.length) * 100}%` }}></div></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '4rem', marginTop: '1.5rem' }}>
                      {suitcase.map((pack, idx) => {
                        const isChecked = suitcaseChecked.includes(idx);
                        return (
                          <motion.div key={idx} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 300 }} className={`glass-card suitcase-item ${isChecked ? 'checked' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem', cursor: 'pointer' }} onClick={() => setSuitcaseChecked(prev => isChecked ? prev.filter(i => i !== idx) : [...prev, idx])}>
                            <div style={{ fontSize: '2rem' }}>{pack.icon}</div>
                            <div style={{ flex: 1 }}><div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5 }}>{pack.category.toUpperCase()}</div><div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{pack.type}</div></div>
                            <div style={{ background: isChecked ? '#10b981' : 'var(--primary)', color: 'white', padding: '6px 14px', borderRadius: '12px', fontWeight: 900, transition: 'all 0.3s' }}>{isChecked ? <Check size={16} /> : `x${pack.qty}`}</div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
            </motion.div>
          )}

          {/* AUTRES VUES (STYLISTE, SETTINGS, ETC.) */}
          {view === 'outfit-result' && (
            <motion.div key="outfit-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '1.5rem' }}><h2 className="title" style={{ fontSize: '2.2rem' }}>Mon Studio 🎨</h2><div className="filter-bar" style={{ marginTop: '1rem' }}><button className={`filter-pill ${stylistMode === 'ai' ? 'active' : ''}`} onClick={() => setStylistMode('ai')}><Sparkles size={14} /> IA ✨</button><button className={`filter-pill ${stylistMode === 'manual' ? 'active' : ''}`} onClick={() => setStylistMode('manual')}><Dices size={14} /> Mélangeur 🎮</button></div></header>
              {stylistMode === 'ai' ? (
                <div style={{ marginTop: '1rem' }}>{outfitLoading ? (
                  <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <SlotMachine />
                    <Loader2 className="animate-spin" size={30} color="var(--primary)" style={{ margin: '2rem auto 1rem' }} />
                    <p className="subtitle">L'IA mélange ton dressing...</p>
                  </div>
                ) : currentOutfit ? (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <p className="subtitle" style={{ fontSize: '0.9rem', lineHeight: '1.4', margin: 0, flex: 1 }}>{currentOutfit.explanation}</p>
                      <motion.button whileTap={{ scale: 0.9 }} className="btn-secondary" style={{ padding: '8px', border: 'none' }} onClick={handleGenerateOutfitRequest}><RefreshCw size={20} color="var(--primary)" /></motion.button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                      {[
                        { id: currentOutfit.top_id, type: 'top' },
                        { id: currentOutfit.bottom_id, type: 'bottom' },
                        { id: currentOutfit.layer_id, type: 'layer' }
                      ].filter(o => o.id).map(o => {
                        const item = findItemById(o.id);
                        const isLocked = lockedOutfit[o.type] === o.id;
                        return item ? (
                          <div key={o.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'white', overflow: 'hidden' }}>
                              {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '2rem', textAlign: 'center', lineHeight: '60px' }}>{item.icon}</div>}
                            </div>
                            <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: '1rem' }}>{item.type}</div><div className="subtitle" style={{ fontSize: '0.8rem' }}>{item.color}</div></div>
                            <motion.button whileTap={{ scale: 0.9 }} className={`lock-btn ${isLocked ? 'locked' : ''}`} onClick={() => setLockedOutfit(prev => ({ ...prev, [o.type]: isLocked ? null : o.id }))}>
                              {isLocked ? <Lock size={18} /> : <Unlock size={18} opacity={0.3} />}
                            </motion.button>
                          </div>
                        ) : null
                      })}
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleValidateOutfit} disabled={loading}><Check size={20} /> Je porte cette tenue !</motion.button>
                  </motion.div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎰</div>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleGenerateOutfitRequest}>Faire tourner la machine ✨</motion.button>
                  </div>
                )}</div>
              ) : (
                <div style={{ marginTop: '1rem', paddingBottom: '4rem' }}><CategorySlider title="Tête" items={manualItems.head} selectedId={manualOutfit.head} onSelect={(id) => setManualOutfit({...manualOutfit, head: id})} /><CategorySlider title="Haut" items={manualItems.top} selectedId={manualOutfit.top} onSelect={(id) => setManualOutfit({...manualOutfit, top: id})} /><CategorySlider title="Couche" items={manualItems.layer} selectedId={manualOutfit.layer} onSelect={(id) => setManualOutfit({...manualOutfit, layer: id})} /><CategorySlider title="Bas" items={manualItems.bottom} selectedId={manualOutfit.bottom} onSelect={(id) => setManualOutfit({...manualOutfit, bottom: id})} /><CategorySlider title="Pieds" items={manualItems.feet} selectedId={manualOutfit.feet} onSelect={(id) => setManualOutfit({...manualOutfit, feet: id})} /><CategorySlider title="Sac" items={manualItems.bag} selectedId={manualOutfit.bag} onSelect={(id) => setManualOutfit({...manualOutfit, bag: id})} /><div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 100 }}><motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleValidateOutfit} disabled={loading}><Check size={20} /> Valider ce look ! ✨</motion.button></div></div>
              )}
            </motion.div>
          )}

          {view === 'add-choice' && (
            <motion.div key="add-choice" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2rem', height: '100%' }}>
              <header><h2 className="title" style={{ textAlign: 'center' }}>Ajouter un vêtement</h2><p className="subtitle" style={{ textAlign: 'center' }}>Comment voulez-vous procéder ?</p></header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <motion.div whileTap={{ scale: 0.98 }} className="glass-card" onClick={() => fileInputRef.current.click()} style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', border: '2px dashed var(--primary)' }}>
                  <div style={{ background: 'var(--primary)', color: 'white', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}><Camera size={30} /></div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Prendre une photo</div>
                </motion.div>
                <motion.div whileTap={{ scale: 0.98 }} className="glass-card" onClick={() => fileInputRef.current.click()} style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}><ImageIcon size={30} /></div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Choisir une image</div>
                </motion.div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
              </div>
              <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" onClick={() => setView('dashboard')}>Annuler</motion.button>
            </motion.div>
          )}

          {view === 'loading-ai' && (
            <motion.div key="loading-ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
              <div className="ai-loader-container">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: '100px', height: '100px', background: 'var(--primary)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Sparkles size={50} />
                </motion.div>
                <div className="ai-pulse-ring"></div>
              </div>
              <h2 className="title" style={{ marginTop: '2rem' }}>Analyse par l'IA...</h2>
              <p className="subtitle">Dressflow identifie votre vêtement pour vous simplifier la vie.</p>
            </motion.div>
          )}

          {view === 'add-detail' && (
            <motion.div key="add-detail" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '2rem' }}><h2 className="title">Presque fini ! ✨</h2></header>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ width: '100%', height: '200px', borderRadius: '20px', overflow: 'hidden', background: 'white', marginBottom: '1.5rem' }}>
                  <img src={selectedImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Preview" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>TYPE DE VÊTEMENT</label><select className="input-styled" value={newItem.type} onChange={(e) => setNewItem({...newItem, type: e.target.value, icon: getIconForType(e.target.value)})}>{ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>COULEUR DOMINANTE</label><select className="input-styled" value={newItem.color} onChange={(e) => setNewItem({...newItem, color: e.target.value})}>{ALL_COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>SAISON</label><select className="input-styled" value={newItem.season} onChange={(e) => setNewItem({...newItem, season: e.target.value})}>{ALL_SEASONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div style={{ flex: 1 }}><label className="subtitle" style={{ fontSize: '0.65rem', fontWeight: 800 }}>ACTIVITÉ</label><select className="input-styled" value={newItem.activity} onChange={(e) => setNewItem({...newItem, activity: e.target.value})}>{ALL_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', paddingBottom: '2rem' }}>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 2 }} onClick={handleAddItem} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Ajouter au dressing ✨"}</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => setView('dashboard')}>Annuler</motion.button>
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '2.4rem' }}>Mon Profil</h2></header>
              
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
                <div onClick={() => avatarInputRef.current.click()} style={{ width: '100px', height: '100px', borderRadius: '35px', background: 'var(--primary)', margin: '0 auto 1.5rem', overflow: 'hidden', cursor: 'pointer', border: '4px solid white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                  {avatarPreview || avatarUrl ? <img src={avatarPreview || avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><UserCircle size={50} /></div>}
                  <div style={{ position: 'absolute', bottom: '110px', right: '50%', transform: 'translateX(50px)', background: 'var(--primary)', color: 'white', padding: '5px', borderRadius: '10px', border: '2px solid white' }}><Camera size={14} /></div>
                </div>
                <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarChange} />
                <h3 className="title" style={{ fontSize: '1.6rem', margin: 0 }}>{name || "Utilisateur"}</h3>
                <p className="subtitle" style={{ fontSize: '0.9rem' }}>{email || "Compte local"}</p>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.5rem' }}>MON CODE DRESSFLOW</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: '15px' }}>
                  <div style={{ flex: 1, fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', letterSpacing: '2px' }}>{formatUID(uid)}</div>
                  <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => { navigator.clipboard.writeText(uid); alert("Code copié !"); }}><Copy size={18} /></button>
                </div>
                <p className="subtitle" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>Partage ce code pour synchroniser ton dressing sur un autre appareil.</p>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.8rem' }}>SÉCURITÉ DU COMPTE</div>
                {isEmailConfirmed ? (
                  <div className="status-badge"><ShieldCheck size={16} /> Compte sécurisé (email)</div>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}><ShieldAlert color="#f59e0b" size={24} /><div><div style={{ fontWeight: 800 }}>Compte non sécurisé</div><p className="subtitle" style={{ fontSize: '0.75rem', margin: '4px 0 10px' }}>Liez un email pour ne jamais perdre votre dressing.</p><button className="btn-primary" style={{ height: '36px', fontSize: '0.75rem', padding: '0 15px' }} onClick={() => setView('complete-profile')}>Lier mon dressing</button></div></div>
                )}
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, marginBottom: '1rem' }}>MON PLAN : {subscriptionTier === 'premium' ? 'PREMIUM ✨' : 'GRATUIT'}</div>
                <div className="gauge-container">
                  <div className="gauge-header"><span>Vêtements ajoutés</span><span>{items.length} / 40</span></div>
                  <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${Math.min(100, (items.length / 40) * 100)}%` }}></div></div>
                </div>
                <div className="gauge-container">
                  <div className="gauge-header"><span>Générations IA restantes</span><span>{subscriptionTier === 'premium' ? 'Illimité' : `${aiGensRemaining} / 5`}</span></div>
                  <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${subscriptionTier === 'premium' ? 100 : (aiGensRemaining / 5) * 100}%` }}></div></div>
                </div>
                {subscriptionTier === 'free' && (
                  <button className="btn-secondary" style={{ width: '100%', marginBottom: '1rem', fontSize: '0.8rem' }} onClick={() => console.log("Pub simulée")}>🎬 Regarder une publicité pour +1 tenue</button>
                )}
                <button className="btn-gold" style={{ width: '100%', height: '50px' }}><Sparkles size={18} /> Débloquer l'illimité (Premium)</button>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, marginBottom: '1rem' }}>APPARENCE & THÈME</div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button onClick={() => setGender('female')} className={`theme-pill ${gender === 'female' ? 'active' : ''}`}>👩 Femme</button>
                  <button onClick={() => setGender('male')} className={`theme-pill ${gender === 'male' ? 'active' : ''}`}>👨 Homme</button>
                  <button onClick={() => setGender('neutral')} className={`theme-pill ${gender === 'neutral' ? 'active' : ''}`}>✨ Neutre</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => setView('subscription')}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ShoppingBag size={18} /><span>Abonnement</span></div><ChevronRight size={18} opacity={0.3} /></motion.button>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ justifyContent: 'space-between', color: '#f43f5e' }} onClick={handleLogout}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><LogOut size={18} /><span>Déconnexion</span></div></motion.button>
              </div>

              <div className="danger-zone">
                <div style={{ color: '#f43f5e', fontWeight: 900, fontSize: '0.7rem', marginBottom: '1rem', letterSpacing: '1px' }}>ZONE DE DANGER</div>
                <button className="btn-danger" style={{ width: '100%', height: '45px', borderRadius: '15px' }} onClick={() => setShowDeleteModal(true)}><Trash2 size={18} /> Supprimer mon compte</button>
              </div>
              <div style={{ height: '100px' }}></div>
            </motion.div>
          )}

          {view === 'complete-profile' && (
            <motion.div key="complete-profile" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <h2 className="title" style={{ textAlign: 'center' }}>Sécuriser mon compte 🛡️</h2>
              <p className="subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>Créez vos identifiants pour accéder à votre dressing partout.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <input type="email" placeholder="Email" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Mot de passe" className="input-styled" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="password" placeholder="Confirmer" className="input-styled" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleCompleteProfile} disabled={loading}>Lier mon dressing ✨</motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ border: 'none', background: 'none' }} onClick={() => setView('settings')}>Retour</motion.button>
      </div>
            </motion.div>
          )}

          {view === 'subscription' && (
            <motion.div key="subscription" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="dashboard-container" style={{ width: '100%' }}>
              <header style={{ marginBottom: '2rem' }}><h2 className="title" style={{ fontSize: '2.4rem' }}>Abonnement</h2></header>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
                
                {!isEmailConfirmed && (
                  <div className="glass-card" style={{ padding: '1.2rem', border: '1px solid var(--primary)', background: 'rgba(var(--primary-rgb), 0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>Liez votre compte pour débloquer ces offres ! 🛡️</p>
                    <button className="btn-primary" style={{ height: '40px', fontSize: '0.8rem', marginTop: '10px' }} onClick={() => setView('complete-profile')}>Lier mon dressing</button>
                  </div>
                )}

                <div className={`glass-card ${subscriptionTier === 'free' ? 'active-tier' : ''}`} style={{ padding: '1.5rem', border: subscriptionTier === 'free' ? '2px solid var(--primary)' : '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ fontWeight: 900 }}>Gratuit</h3>{subscriptionTier === 'free' && <span className="tag-pill active">Actuel</span>}</div>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={14} color="#10b981" /> Jusqu'à 25 vêtements</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><X size={14} color="#f43f5e" /> Pas de génération de tenue IA</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={14} color="#10b981" /> Analyse IA individuelle</li>
                  </ul>
                </div>

                <div className={`glass-card ${subscriptionTier === 'premium' ? 'active-tier' : ''}`} style={{ padding: '1.5rem', border: '2px solid var(--primary)', background: 'rgba(var(--primary-rgb), 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><h3 style={{ fontWeight: 900 }}>Premium ✨</h3>{subscriptionTier === 'premium' && <span className="tag-pill active">Actuel</span>}</div>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={14} color="#10b981" /> Dressing illimité</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={14} color="#10b981" /> Génération de tenues par IA</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={14} color="#10b981" /> Conseils personnalisés</li>
                  </ul>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 1, height: 'auto', padding: '1rem', flexDirection: 'column', gap: '2px' }} onClick={() => { if (!isEmailConfirmed) { alert("Liez votre compte pour activer Premium !"); setView('complete-profile'); } else { setSubscriptionTier('premium'); alert("Passage à Premium ! (Simulé)"); } }} disabled={subscriptionTier === 'premium'}><strong>2.99€</strong><span style={{ fontSize: '0.6rem', opacity: 0.8 }}>Mensuel</span></motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" style={{ flex: 1, height: 'auto', padding: '1rem', flexDirection: 'column', gap: '2px' }} onClick={() => { if (!isEmailConfirmed) { alert("Liez votre compte pour activer Premium !"); setView('complete-profile'); } else { setSubscriptionTier('premium'); alert("Passage à Premium ! (Simulé)"); } }} disabled={subscriptionTier === 'premium'}><strong>19.99€</strong><span style={{ fontSize: '0.6rem', opacity: 0.8 }}>Annuel</span></motion.button>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" onClick={() => setView('settings')}>Retour</motion.button>
              </div>
            </motion.div>
          )}


        </AnimatePresence>

        {isMainView && <BottomNav />}

        {/* MODALES & DRAWERS (DÉJÀ CODÉES) */}
        <AnimatePresence>
          {selectedItem && (
            <div className="modal-overlay" style={{ alignItems: 'flex-end' }} onClick={() => { if (!isEditing) setSelectedItem(null); }}>
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2.5rem 2rem', borderRadius: '40px 40px 0 0', width: '100%', height: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ width: '40px', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', margin: '-1rem auto 1.5rem' }}></div>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <h2 className="title">Modifier</h2>
                    <select className="input-styled" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>{ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    <select className="input-styled" value={editForm.color} onChange={e => setEditForm({...editForm, color: e.target.value})}>{ALL_COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <select className="input-styled" value={editForm.season} onChange={e => setEditForm({...editForm, season: e.target.value})}>{ALL_SEASONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="input-styled" value={editForm.activity} onChange={e => setEditForm({...editForm, activity: e.target.value})}>{ALL_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                    <div style={{ display: 'flex', gap: '1rem' }}><button className="btn-primary" style={{ flex: 1 }} onClick={handleUpdateItem}>Sauver</button><button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Annuler</button></div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '20px', overflow: 'hidden' }}>
                        {selectedItem.image_url ? <img src={selectedItem.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '3rem', textAlign: 'center', lineHeight: '80px' }}>{selectedItem.icon}</div>}
                      </div>
                      <div><h2 className="title" style={{ fontSize: '1.6rem' }}>{selectedItem.type}</h2><p className="subtitle">{selectedItem.color} • {selectedItem.season}</p></div>
                    </div>
                    <div className="glass-card" style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: 'none', padding: '1.2rem', marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{getFunnyStats(selectedItem)}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                      <div className="glass-card" style={{ padding: '0.8rem', textAlign: 'center' }}><div style={{ fontSize: '0.6rem', opacity: 0.5 }}>SAISON</div><div style={{ fontWeight: 800 }}>{selectedItem.season}</div></div>
                      <div className="glass-card" style={{ padding: '0.8rem', textAlign: 'center' }}><div style={{ fontSize: '0.6rem', opacity: 0.5 }}>ACTIVITÉ</div><div style={{ fontWeight: 800 }}>{selectedItem.activity}</div></div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={() => handleUpdateLastWorn(selectedItem)} style={{ width: '100%', height: '60px' }}><Sparkles size={20} /> Je le porte !</motion.button>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1 }} onClick={() => { setIsEditing(true); setEditForm({...selectedItem}); }}><Edit3 size={18} /> Modifier</motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ flex: 1, color: '#f43f5e' }} onClick={() => handleDeleteItem(selectedItem.id)}><Trash2 size={18} /></motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {showCityModal && (
          <div className="modal-overlay" onClick={() => setShowCityModal(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2.5rem 2rem', borderRadius: '40px 40px 0 0', width: '100%', height: 'auto', maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="modal-handle"></div>
              <h2 className="title" style={{ marginBottom: '1.5rem' }}>Choisir une ville</h2>
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={20} />
                <input type="text" className="input-styled" style={{ paddingLeft: '3rem' }} placeholder="Ex: Paris, Lyon..." value={citySearch} onChange={(e) => handleCitySearch(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {cityResults.length > 0 ? cityResults.map(city => (
                  <div key={city.id} onClick={() => handleSelectCity(city)} className="btn-secondary" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', border: 'none' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{city.name}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{city.admin1}, {city.country}</div>
                    </div>
                    <ChevronRight size={18} opacity={0.3} />
                  </div>
                )) : citySearch.length > 2 && <p className="subtitle" style={{ textAlign: 'center', padding: '2rem' }}>Aucune ville trouvée... 🔍</p>}
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ margin: 'auto', padding: '2rem', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><AlertCircle size={35} /></div>
              <h2 className="title" style={{ fontSize: '1.4rem' }}>Supprimer le compte ?</h2>
              <p className="subtitle" style={{ margin: '1rem 0 2rem' }}>Cette action est irréversible. Toutes vos données seront effacées.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn-danger" style={{ height: '50px', borderRadius: '15px' }} onClick={handleDeleteAccount} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Oui, supprimer définitivement"}</button>
                <button className="btn-secondary" style={{ height: '50px', borderRadius: '15px' }} onClick={() => setShowDeleteModal(false)}>Annuler</button>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
