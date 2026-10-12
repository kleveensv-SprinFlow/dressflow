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
import { detectDominantColor } from './services/colorDetector'
import { removeBackground } from './services/backgroundRemover'
import { generateOutfit } from './services/styleEngine.js'
import { getLocalWeather, searchCity, getTripWeather } from './services/weather'

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
import { generatePackingList, describePacking } from './utils/packing'
import { 
  MAIN_CATEGORIES, CATEGORY_HIERARCHY, getIconForType, 
  ALL_SEASONS, ALL_ACTIVITIES, ALL_COLORS, currentSeason, formatUID, findItemById 
} from './utils/helpers.jsx'

function App() {
  const [view, setView] = useState('splash') 
  const [gender, setGender] = useState('female')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarPath, setAvatarPath] = useState(null)
  const passwordRecoveryRef = useRef(false)
  const [uid, setUid] = useState('') 
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState('free')
  const [selectedActivity, setSelectedActivity] = useState('Quotidien')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [lockedOutfit, setLockedOutfit] = useState({ top: null, bottom: null, layer: null, feet: null, head: null })
  const [suitcaseChecked, setSuitcaseChecked] = useState([])
  const tripRef = useRef({ suitcase: [], suitcaseChecked: [], travelData: null, uid: '' })
  const itemsRef = useRef([])
  const avatarPathRef = useRef(null)
  const imageRetryRef = useRef(new Set())
  
  const [weather, setWeather] = useState(() => {
    try {
      const saved = localStorage.getItem('dressflow_weather');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })
  const [weatherLoading, setWeatherLoading] = useState(false)
  
  const [citySearch, setCitySearch] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [showCityModal, setShowCityModal] = useState(false)
  const [cityModalMode, setCityModalMode] = useState('home')
  const [activeFilter, setActiveFilter] = useState('Tous')
  
  const [travelData, setTravelData] = useState({ 
    destination: '', lat: null, lon: null, 
    startDate: format(new Date(), 'yyyy-MM-dd'), 
    endDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    laundry: false,
    sport: false,
    evening: false
  })
  const [suitcase, setSuitcase] = useState([])
  const [suitcaseNote, setSuitcaseNote] = useState('')
  const [suitcaseLoading, setSuitcaseLoading] = useState(false)
  
  const [stylistMode, setStylistMode] = useState('ai') 
  const [currentOutfit, setCurrentOutfit] = useState(null)
  const [manualOutfit, setManualOutfit] = useState({ head: null, top: null, layer: null, bottom: null, feet: null, bag: null })
  const [outfitLoading, setOutfitLoading] = useState(false)
  
  const [selectedItem, setSelectedItem] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const [bulkItems, setBulkItems] = useState([])
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisApplied, setAnalysisApplied] = useState(false)
  const [tempAvatarFile, setTempAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const avatarInputRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const cutoutSeq = useRef(0)

  const [newItem, setNewItem] = useState({ main_category: null, type: '', color: 'Blanc', pattern: 'Uni', season: [currentSeason()], activity: ['Quotidien'], icon: '👕' })
  const [selectedImage, setSelectedImage] = useState(null)
  const [originalImage, setOriginalImage] = useState(null)
  const [useCutout, setUseCutout] = useState(true)
  const [isProcessingCutout, setIsProcessingCutout] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const [tempFile, setTempFile] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [cutoutFile, setCutoutFile] = useState(null)

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (activeFilter !== 'Tous') {
      result = result.filter(item => {
        if (activeFilter === 'Tête') return item.main_category === 'Chapeau'
        if (activeFilter === 'Hauts') return item.main_category === 'Haut'
        if (activeFilter === 'Bas') return item.main_category === 'Bas'
        if (activeFilter === 'Chaussures') return item.main_category === 'Chaussures'
        if (activeFilter === 'Accessoires') return item.main_category === 'Accessoires'
        if (activeFilter === 'Extérieur') return item.type === 'Veste' || item.type === 'Manteau'
        if (activeFilter === 'Robe') return item.type === 'Robe' || item.type === 'Jupe'
        return true
      })
    }
    const order = ["Chapeau", "Haut", "Bas", "Chaussures", "Accessoires"]
    return result.sort((a, b) => order.indexOf(a.main_category) - order.indexOf(b.main_category))
  }, [items, activeFilter])

  const createPrivateUrl = async (bucket, path) => {
    if (!path) return null;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 6 * 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  };

  const fetchItems = async (profileId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clothes').select('*').eq('profile_id', profileId).order('created_at', { ascending: false });
      if (error) throw error;
      const signedItems = await Promise.all((data || []).map(async (item) => {
        if (!item.image_url) return { ...item, image_path: null };
        try {
          return { ...item, image_path: item.image_url, image_url: await createPrivateUrl('clothes-images', item.image_url) };
        } catch {
          return { ...item, image_path: item.image_url, image_url: null };
        }
      }));
      setItems(signedItems);
    } catch (err) {
      toast.error(err.message || "Impossible de charger le dressing.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const syncProfile = async (user) => {
    if (!user?.id) return;
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!profile) {
      toast.error("Profil introuvable. Déconnecte-toi puis reconnecte-toi.");
      return;
    }
    setUid(profile.id);
    setName(profile.name || user.user_metadata?.name || '');
    setGender(profile.gender || 'female');
    setEmail(user.email || profile.email || '');
    setAvatarPath(profile.avatar_url || null);
    setAvatarUrl(profile.avatar_url ? await createPrivateUrl('avatars', profile.avatar_url).catch(() => null) : null);
    setSubscriptionTier(profile.subscription_tier || 'free');
    await fetchItems(profile.id);
    if (['splash', 'login', 'register', 'complete-profile', 'success'].includes(view)) setView('dashboard');
  };

  const checkUserSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session?.user) {
      setEmail(session.user.email || '');
      await syncProfile(session.user);
    }
  };

  const initWeather = async (lat = null, lon = null, cityName = null, isManual = false) => {
    setWeatherLoading(true)
    try {
      const data = await getLocalWeather(lat, lon);
      if (cityName) data.city = cityName;
      setWeather(data);
      try {
        localStorage.setItem('dressflow_weather', JSON.stringify(data));
      } catch {}
      if (isManual) {
        toast.success(`Météo mise à jour pour ${data.city} !`);
      }
    } catch (err) {
      if (isManual) {
        toast.error(err.message || "Position introuvable.");
      } else {
        console.warn("Silent weather init error:", err?.message || err);
      }
    } finally {
      setWeatherLoading(false);
    }
  }

  useEffect(() => { document.documentElement.setAttribute('data-theme', gender) }, [gender])

  tripRef.current = { suitcase, suitcaseChecked, travelData, uid };
  itemsRef.current = items;
  avatarPathRef.current = avatarPath;

  const persistTrip = (patch = {}) => {
    const current = tripRef.current;
    if (!current.uid) return;
    localStorage.setItem('dressflow_trip_' + current.uid, JSON.stringify({
      suitcase: patch.suitcase ?? current.suitcase,
      checked: patch.checked ?? current.suitcaseChecked,
      travelData: patch.travelData ?? current.travelData
    }));
  };

  const updateTravelData = (updater) => {
    setTravelData(previous => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const id = tripRef.current.uid;
      if (id) {
        localStorage.setItem('dressflow_trip_' + id, JSON.stringify({
          suitcase: tripRef.current.suitcase,
          checked: tripRef.current.suitcaseChecked,
          travelData: next
        }));
      }
      return next;
    });
  };

  const toggleSuitcaseItem = (id) => {
    const key = String(id);
    setSuitcaseChecked(previous => {
      const next = previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key];
      const owner = tripRef.current.uid;
      if (owner) {
        localStorage.setItem('dressflow_trip_' + owner, JSON.stringify({
          suitcase: tripRef.current.suitcase,
          checked: next,
          travelData: tripRef.current.travelData
        }));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!uid) return;
    const raw = localStorage.getItem('dressflow_trip_' + uid);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSuitcase(Array.isArray(parsed.suitcase) ? parsed.suitcase : []);
        setSuitcaseChecked(Array.isArray(parsed.checked) ? parsed.checked.map(String) : []);
        if (parsed.travelData && typeof parsed.travelData === 'object') {
          setTravelData(previous => ({ ...previous, ...parsed.travelData }));
        }
      } catch {
        setSuitcase([]);
        setSuitcaseChecked([]);
      }
      return;
    }
    const legacySuitcase = localStorage.getItem('suitcase');
    const legacyTravel = localStorage.getItem('travelData');
    let nextSuitcase = [];
    let nextTravel = null;
    if (legacySuitcase) {
      try { nextSuitcase = JSON.parse(legacySuitcase); } catch { nextSuitcase = []; }
    }
    if (legacyTravel) {
      try { nextTravel = JSON.parse(legacyTravel); } catch { nextTravel = null; }
    }
    setSuitcase(Array.isArray(nextSuitcase) ? nextSuitcase : []);
    setSuitcaseChecked([]);
    if (nextTravel) setTravelData(previous => ({ ...previous, ...nextTravel }));
    localStorage.setItem('dressflow_trip_' + uid, JSON.stringify({
      suitcase: Array.isArray(nextSuitcase) ? nextSuitcase : [],
      checked: [],
      travelData: nextTravel || travelData
    }));
    localStorage.removeItem('suitcase');
    localStorage.removeItem('travelData');
  }, [uid])

  const refreshSignedMedia = async () => {
    const currentItems = itemsRef.current;
    if (currentItems.length) {
      const signedItems = await Promise.all(currentItems.map(async (item) => {
        if (!item.image_path) return item;
        try {
          return { ...item, image_url: await createPrivateUrl('clothes-images', item.image_path) };
        } catch {
          return { ...item, image_url: null };
        }
      }));
      setItems(signedItems);
    }
    const path = avatarPathRef.current;
    if (path) setAvatarUrl(await createPrivateUrl('avatars', path).catch(() => null));
  };

  const handleImageError = async (item) => {
    if (!item?.id || !item.image_path || imageRetryRef.current.has(item.id)) return;
    imageRetryRef.current.add(item.id);
    try {
      const url = await createPrivateUrl('clothes-images', item.image_path);
      setItems(previous => previous.map(entry => entry.id === item.id ? { ...entry, image_url: url } : entry));
    } catch { /* The card falls back to its icon. */ }
  };

  useEffect(() => {
    if (!uid) return undefined;
    const refresh = () => { refreshSignedMedia().catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(refresh, 25 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [uid])

  useEffect(() => { 
    checkUserSession().catch((err) => toast.error(err.message || 'Erreur de session.'));
    CapApp.addListener('appUrlOpen', async data => {
      const url = new URL(data.url.replace('#', '?'));
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      const recoveryType = url.searchParams.get('type') === 'recovery';
      if (accessToken && refreshToken) {
        if (recoveryType) {
          passwordRecoveryRef.current = true;
          setView('reset-password');
        }
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        passwordRecoveryRef.current = true;
        setView('reset-password');
        return;
      }
      if (session?.user) {
        setEmail(session.user.email || '');
        if (passwordRecoveryRef.current) return;
        queueMicrotask(() => { syncProfile(session.user).catch((err) => toast.error(err.message || 'Erreur de profil.')); });
      } else if (event === 'SIGNED_OUT') {
        setUid(''); setItems([]); setAvatarUrl(null); setAvatarPath(null);
      }
    });

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (['dashboard', 'stylist', 'trip', 'settings'].includes(view)) { if (!weather && !weatherLoading) initWeather(null, null, null, false); } }, [view, items])

  const handleLogout = async () => {
    setLoading(true); try {
      await supabase.auth.signOut(); 
      localStorage.removeItem('dressflow_uid'); localStorage.removeItem('suitcase'); localStorage.removeItem('travelData');
      setUid(''); setName(''); setEmail(''); setItems([]); setAvatarUrl(null); setAvatarPath(null);
      setSuitcase([]); setCurrentOutfit(null); setWeather(null); 
      setTravelData({ destination: '', lat: null, lon: null, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 3), 'yyyy-MM-dd') });
      setView('splash');
      toast.success("Déconnecté ! 👋");
    } catch (err) { toast.error("Erreur") } finally { setLoading(false) }
  }
  
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw error;
      await supabase.auth.signOut();
      setUid(''); setName(''); setEmail(''); setItems([]); setAvatarUrl(null); setAvatarPath(null);
      setView('splash'); setShowDeleteModal(false);
      toast.success("Compte et données Dressflow supprimés.");
    } catch (err) {
      toast.error(err.message || "Impossible de supprimer le compte.");
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateSuitcase = async () => {
    if (travelData.lat == null || travelData.lon == null) {
      toast.error("Choisis une destination avant de générer la valise.");
      return;
    }
    const startDate = parseISO(travelData.startDate);
    const endDate = parseISO(travelData.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      toast.error("La date de retour doit être le même jour ou après le départ.");
      return;
    }
    setSuitcaseLoading(true);
    try {
      const duration = differenceInDays(endDate, startDate) + 1;
      const trip = { laundry: !!travelData.laundry, sport: !!travelData.sport, evening: !!travelData.evening };
      let destWeather = { temp: 18, code: 0, description: 'Météo estimée' };
      try {
        destWeather = await getTripWeather(travelData.lat, travelData.lon, travelData.startDate, travelData.endDate);
      } catch {
        try { destWeather = await getLocalWeather(travelData.lat, travelData.lon); } catch { /* on part sur 18° */ }
      }
      const list = generatePackingList(destWeather, duration, trip);
      if (list.length === 0) throw new Error("Impossible de calculer la valise.");
      setSuitcase(list);
      setSuitcaseChecked([]);
      setSuitcaseNote(describePacking(destWeather, duration, trip));
      persistTrip({ suitcase: list, checked: [] });
      toast.success("Valise prête.");
    } catch (err) {
      toast.error(err.message || "Impossible de préparer la valise.");
    } finally {
      setSuitcaseLoading(false);
    }
  }

  const handleGenerateOutfitRequest = async () => {
    setOutfitLoading(true);
    setStylistMode('ai');
    try {
      const currentWeather = weather || await getLocalWeather();
      const result = await generateOutfit(items, currentWeather, lockedOutfit, currentOutfit, { activity: selectedActivity });
      const resolved = {
        top: findItemById(items, result.top_id),
        bottom: findItemById(items, result.bottom_id),
        layer: findItemById(items, result.layer_id),
        feet: findItemById(items, result.feet_id),
        head: findItemById(items, result.head_id),
        color_harmony: result.color_harmony,
        explanation: result.explanation
      };
      setCurrentOutfit(resolved);
      toast.success("Tenue composée avec succès !");
    } catch (err) {
      toast.error(err.message || "Impossible de composer une tenue.");
    } finally {
      setOutfitLoading(false);
    }
  }

  const handleValidateOutfit = async () => {
    if (stylistMode === 'manual') {
      const chosenTop = items.find(item => item.id === manualOutfit.top);
      const chosenBottom = items.find(item => item.id === manualOutfit.bottom);
      if (!chosenTop) {
        toast.error("Sélectionne un haut ou une robe pour commencer.");
        return;
      }
      if (String(chosenTop.type).toLowerCase() === 'robe' && chosenBottom) {
        toast.error("Une robe forme déjà une tenue complète. Retire le bas sélectionné.");
        return;
      }
      if (String(chosenTop.type).toLowerCase() !== 'robe' && !chosenBottom) {
        toast.error("Ajoute un bas pour compléter la tenue.");
        return;
      }
    }
    const ids = (stylistMode === 'ai'
      ? [currentOutfit?.top?.id, currentOutfit?.bottom?.id, currentOutfit?.layer?.id, currentOutfit?.feet?.id, currentOutfit?.head?.id]
      : Object.values(manualOutfit)).filter(Boolean);
    if (ids.length === 0) {
      toast.error("Sélectionne au moins une pièce avant de valider.");
      return;
    }
    setLoading(true);
    try {
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch { /* Web preview has no native haptics. */ }
      const { error } = await supabase.from('clothes')
        .update({ last_worn_date: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      try { confetti({ particleCount: 110, spread: 75, origin: { y: 0.5 } }); } catch { /* Decorative only. */ }
      await fetchItems(uid);
      setView('dashboard');
      toast.success("Tenue marquée comme portée.");
    } catch (err) {
      toast.error(err.message || "Impossible d’enregistrer cette tenue.");
    } finally {
      setLoading(false);
    }
  }

  const handleCitySearch = (val) => {
    setCitySearch(val); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (val.length > 2) { searchTimeoutRef.current = setTimeout(async () => { const results = await searchCity(val); setCityResults(results) }, 500) } else setCityResults([])
  }

  const handleSelectCity = (city) => {
    if (cityModalMode === 'home') initWeather(city.latitude, city.longitude, city.name, true);
    else updateTravelData({ ...travelData, destination: city.name, lat: city.latitude, lon: city.longitude });
    setShowCityModal(false); setCitySearch(''); setCityResults([])
  }

  const handleAddDemoItems = async () => {
    if (!uid) {
      toast.error("Connecte-toi avant d'ajouter des vêtements.");
      return;
    }
    setLoading(true);
    const demoPieces = [
      {
        profile_id: uid,
        main_category: 'Mes Hauts',
        type: 'T-shirt',
        color: 'Blanc',
        season: 'Printemps, Été, Automne',
        activity: 'Quotidien',
        icon: '👕',
        image_url: null
      },
      {
        profile_id: uid,
        main_category: 'Mes Bas',
        type: 'Jean',
        color: 'Bleu',
        season: 'Printemps, Automne, Hiver',
        activity: 'Quotidien',
        icon: '👖',
        image_url: null
      },
      {
        profile_id: uid,
        main_category: 'Extérieur',
        type: 'Veste',
        color: 'Noir',
        season: 'Printemps, Automne',
        activity: 'Sortie',
        icon: '🧥',
        image_url: null
      },
      {
        profile_id: uid,
        main_category: 'Chaussures',
        type: 'Baskets',
        color: 'Blanc',
        season: 'Toutes saisons',
        activity: 'Sport',
        icon: '👟',
        image_url: null
      },
      {
        profile_id: uid,
        main_category: 'Mes Hauts',
        type: 'Pull',
        color: 'Gris',
        season: 'Automne, Hiver',
        activity: 'Travail',
        icon: '🧶',
        image_url: null
      }
    ];

    try {
      const { error } = await supabase.from('clothes').insert(demoPieces);
      if (error) throw error;
      await fetchItems(uid);
      toast.success("Dressing démo ajouté ! Découvre tes premières tenues ✨");
    } catch (err) {
      toast.error(err.message || "Impossible de charger les pièces démo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('clothes').delete().eq('id', selectedItem.id);
      if (error) throw error;
      if (selectedItem.image_path) {
        await supabase.storage.from('clothes-images').remove([selectedItem.image_path]);
      }
      await fetchItems(uid);
      setSelectedItem(null);
      toast.success("Vêtement supprimé");
    } catch (err) {
      toast.error(err.message || "Suppression impossible.");
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateItem = async () => {
    setLoading(true); const { error } = await supabase.from('clothes').update({
        main_category: editForm.main_category,
        type: editForm.type,
        color: editForm.color,
        pattern: editForm.pattern || 'Uni',
        season: Array.isArray(editForm.season) ? editForm.season.join(', ') : editForm.season,
        activity: Array.isArray(editForm.activity) ? editForm.activity.join(', ') : editForm.activity,
        icon: getIconForType(editForm.type)
      }).eq('id', editForm.id)
    if (error) toast.error(error.message); else { await fetchItems(uid); setIsEditing(false); setSelectedItem(null); toast.success("Modifié ! ✨"); } setLoading(false)
  }

  const handleRegister = async () => {
    if (!name.trim()) { toast.error("Prénom requis."); return; }
    if (!email.trim()) { toast.error("Adresse email requise."); return; }
    if (password.length < 8) { toast.error("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), gender } }
      });
      if (error) throw error;
      if (data.session && data.user) {
        await syncProfile(data.user);
        toast.success("Compte créé.");
      } else {
        setView('login');
        toast.success("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.");
      }
    } catch (err) {
      toast.error(err.message || "Création du compte impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { toast.error("Email et mot de passe requis."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      if (data.user) await syncProfile(data.user);
      toast.success("Connexion réussie.");
    } catch (err) {
      toast.error(err.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) { toast.error("Saisis d'abord ton adresse email."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
      if (error) throw error;
      toast.success("Lien envoyé si cette adresse existe.");
    } catch (err) {
      toast.error(err.message || "Envoi du lien impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (password.length < 8) { toast.error("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      passwordRecoveryRef.current = false;
      setPassword('');
      setConfirmPassword('');
      if (data.user) await syncProfile(data.user);
      setView('dashboard');
      toast.success("Mot de passe modifié.");
    } catch (err) {
      toast.error(err.message || "Modification impossible.");
    } finally {
      setLoading(false);
    }
  };

  const publishCutout = async (file, mainCategory) => {
    const seq = ++cutoutSeq.current
    setIsProcessingCutout(true)
    try {
      const { file: processed, removed, main_category, type, pattern, reason } = await removeBackground(file, mainCategory)
      if (seq !== cutoutSeq.current) return false
      if (!removed) {
        const why = String(reason || '').slice(0, 300)
        if (why === 'Aucun vêtement de cette catégorie') toast.error("Cette pièce n’est pas visible sur la photo.")
        else toast.error(`Détourage impossible : ${why || 'erreur inconnue'}`, { duration: 15000 })
        return false
      }
      setCutoutFile(processed)
      setTempFile(processed)
      setSelectedImage(URL.createObjectURL(processed))
      setUseCutout(true)
      const detected = await detectDominantColor(processed)
      if (seq !== cutoutSeq.current) return false
      setNewItem(prev => ({
        ...prev,
        main_category: main_category || mainCategory || prev.main_category,
        type: type || prev.type,
        icon: type ? getIconForType(type) : prev.icon,
        color: detected?.color || prev.color,
        pattern: pattern || detected?.pattern || prev.pattern
      }))
      return true
    } catch (error) {
      console.warn("Détourage silencieux échoué:", error)
      return false
    } finally {
      if (seq === cutoutSeq.current) setIsProcessingCutout(false)
    }
  }

  const handleBrushCommit = (file) => {
    setCutoutFile(file)
    setTempFile(file)
    setSelectedImage(URL.createObjectURL(file))
    setUseCutout(true)
  }

  const handleCategoryCutout = (main) => {
    if (!originalFile) {
      setNewItem(prev => ({ ...prev, main_category: main, type: '' }))
      return
    }
    publishCutout(originalFile, main)
  }

  const handleBulkCategory = async (index, main) => {
    const source = bulkItems[index]?.originalFile || bulkItems[index]?.file
    const fallbackType = CATEGORY_HIERARCHY[main]?.[0] || ''
    setBulkItems(prev => {
      const next = [...prev]
      if (!next[index]) return prev
      next[index] = {
        ...next[index],
        main_category: main,
        type: fallbackType,
        icon: getIconForType(fallbackType)
      }
      return next
    })
    if (!source) return
    try {
      const { file: cutF, removed, type, pattern } = await removeBackground(source, main)
      if (!removed) {
        toast.error("Cette pièce n’est pas visible sur la photo.")
        return
      }
      const detected = await detectDominantColor(cutF)
      const nextType = type || fallbackType
      setBulkItems(prev => {
        const next = [...prev]
        if (!next[index] || next[index].main_category !== main) return prev
        next[index] = {
          ...next[index],
          file: cutF,
          cutoutFile: cutF,
          useCutout: true,
          cutoutPreview: URL.createObjectURL(cutF),
          type: nextType,
          icon: getIconForType(nextType),
          color: detected?.color || next[index].color,
          pattern: pattern || detected?.pattern || next[index].pattern
        }
        return next
      })
    } catch (error) {
      console.warn("Recoupe impossible:", error)
    }
  }

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    if (files.some(file => !file.type.startsWith('image/'))) {
      toast.error("Sélectionne uniquement des images.");
      return;
    }

    const freeSlots = subscriptionTier === 'premium' ? files.length : Math.max(0, 50 - items.length);
    if (freeSlots === 0) {
      toast.error("Limite de 50 pièces atteinte.");
      return;
    }
    const acceptedFiles = files.slice(0, freeSlots);
    if (acceptedFiles.length < files.length) {
      toast(`Seulement ${acceptedFiles.length} pièce(s) ajoutée(s).`);
    }

    setLoading(true);
    try {
      if (acceptedFiles.length === 1) {
        const file = acceptedFiles[0];
        setOriginalFile(file);
        setTempFile(file);
        const origUrl = URL.createObjectURL(file);
        setOriginalImage(origUrl);
        setSelectedImage(origUrl);
        setUseCutout(false);
        setView('add-detail');
        publishCutout(file);
      } else {
        // Ajout groupé : initialisation immédiate
        const initialBulk = acceptedFiles.map(file => ({
          file,
          originalFile: file,
          cutoutFile: null,
          useCutout: false,
          preview: URL.createObjectURL(file),
          cutoutPreview: null,
          main_category: 'Haut',
          type: 'T-shirt',
          color: 'Blanc',
          pattern: 'Uni',
          season: [currentSeason()],
          activity: ['Quotidien'],
          icon: '👕'
        }));
        setBulkItems(initialBulk);
        setBulkProgress({ done: 0, total: acceptedFiles.length });
        setView('bulk-add');

        // Traitement séquentiel en arrière-plan pour ménager les ressources
        (async () => {
          for (let i = 0; i < acceptedFiles.length; i++) {
            const f = acceptedFiles[i];
            try {
              const { file: cutF, removed, main_category, type, pattern } = await removeBackground(f);
              const activeF = removed ? cutF : f;
              const detected = await detectDominantColor(activeF);
              setBulkItems(prev => {
                const next = [...prev];
                if (next[i]) {
                  next[i] = {
                    ...next[i],
                    file: activeF,
                    cutoutFile: removed ? cutF : null,
                    useCutout: removed,
                    cutoutPreview: removed ? URL.createObjectURL(cutF) : null,
                    main_category: main_category || next[i].main_category,
                    type: type || next[i].type,
                    icon: type ? getIconForType(type) : next[i].icon,
                    color: detected?.color || 'Blanc',
                    pattern: pattern || detected?.pattern || 'Uni'
                  };
                }
                return next;
              });
            } catch (err) {
              console.warn("Erreur sur item bulk:", err);
            }
            setBulkProgress({ done: i + 1, total: acceptedFiles.length });
          }
        })();
      }
    } finally {
      setLoading(false);
    }
  }

  const handleBulkAdd = async () => {
    if (!uid) {
      toast.error("Connecte-toi avant d’ajouter des vêtements.");
      return;
    }
    if (subscriptionTier === 'free' && items.length + bulkItems.length > 50) {
      toast.error("Cette sélection dépasse la limite de 50 pièces du plan gratuit.");
      return;
    }
    if (bulkItems.some(item => !item.main_category || !item.type || !item.color)) {
      toast.error("Vérifie la catégorie, le type et la couleur de chaque pièce.");
      return;
    }
    setLoading(true);
    let completed = 0;
    try {
      for (const item of bulkItems) {
        const fileToUpload = item.cutoutFile || item.originalFile || item.file;
        const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = uid + '/' + crypto.randomUUID() + '-' + safeName;
        const { error: uploadError } = await supabase.storage.from('clothes-images').upload(fileName, fileToUpload, { contentType: fileToUpload.type, upsert: false });
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from('clothes').insert([{
          profile_id: uid,
          main_category: item.main_category,
          type: item.type,
          color: item.color,
          pattern: item.pattern || 'Uni',
          season: Array.isArray(item.season) ? item.season.join(', ') : item.season,
          activity: Array.isArray(item.activity) ? item.activity.join(', ') : item.activity,
          icon: item.icon,
          image_url: fileName
        }]);
        if (insertError) {
          await supabase.storage.from('clothes-images').remove([fileName]);
          throw insertError;
        }
        completed += 1;
      }
      await fetchItems(uid); setView('dashboard'); setBulkItems([]);
      toast.success("Importation terminée !");
    } catch (err) {
      if (completed > 0) {
        await fetchItems(uid);
        setView('dashboard');
        setBulkItems([]);
        toast.error(completed + " pièce(s) ajoutée(s), mais l’import s’est arrêté : " + (err.message || 'erreur inconnue'));
      } else {
        toast.error(err.message || "Importation impossible.");
      }
    } finally { setLoading(false) }
  }

  const handleAddItem = async () => {
    if (!uid || !tempFile) {
      toast.error("Choisis une photo et vérifie les détails du vêtement.");
      return;
    }
    if (subscriptionTier === 'free' && items.length >= 50) {
      toast.error("Limite de 50 pièces du plan gratuit atteinte. L’illimité n’est pas encore disponible.");
      return;
    }
    if (!newItem.main_category || !newItem.type || !newItem.color) {
      toast.error("Renseigne la catégorie, le type et la couleur.");
      return;
    }
    setLoading(true);
    let uploadedPath = null;
    try {
      const fileToUpload = cutoutFile || originalFile || tempFile;
      const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = uid + '/' + crypto.randomUUID() + '-' + safeName;
      uploadedPath = fileName;
      const { error: uploadError } = await supabase.storage.from('clothes-images').upload(fileName, fileToUpload, { contentType: fileToUpload.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('clothes').insert([{
        profile_id: uid,
        ...newItem,
        pattern: newItem.pattern || 'Uni',
        season: Array.isArray(newItem.season) ? newItem.season.join(', ') : newItem.season,
        activity: Array.isArray(newItem.activity) ? newItem.activity.join(', ') : newItem.activity,
        image_url: fileName
      }]);
      if (insertError) throw insertError;
      await fetchItems(uid);
      setView('dashboard');
      setSelectedImage(null);
      setOriginalImage(null);
      setTempFile(null);
      setOriginalFile(null);
      setCutoutFile(null);
      toast.success("Ajouté avec succès !");
    } catch (err) {
      if (uploadedPath) await supabase.storage.from('clothes-images').remove([uploadedPath]).catch(() => {});
      toast.error(err.message || "Ajout impossible.");
    } finally { setLoading(false) }
  }

  const handleUpdateProfile = async () => {
    setLoading(true); try {
      let finalAvatarPath = avatarPath;
      if (tempAvatarFile) {
        const safeName = tempAvatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        finalAvatarPath = uid + '/avatar-' + crypto.randomUUID() + '-' + safeName;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(finalAvatarPath, tempAvatarFile, { contentType: tempAvatarFile.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error: updateError } = await supabase.from('profiles').update({ name: name.trim(), avatar_url: finalAvatarPath }).eq('id', uid);
      if (updateError) throw updateError;
      if (avatarPath && avatarPath !== finalAvatarPath) {
        await supabase.storage.from('avatars').remove([avatarPath]).catch(() => {});
      }
      setAvatarPath(finalAvatarPath);
      setAvatarUrl(finalAvatarPath ? await createPrivateUrl('avatars', finalAvatarPath) : null);
      setTempAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Profil mis à jour ! ✅");
    } catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  const manualItems = useMemo(() => ({
    head: items.filter(i => ['Bonnet', 'Casquette', 'Chapeau', 'Bob'].includes(i.type)),
    top: items.filter(i => ['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Top / Blouse', 'Blouse', 'Robe', 'Gilet'].includes(i.type)),
    layer: items.filter(i => ['Veste', 'Manteau', 'Cardigan', 'Blazer', 'Trench'].includes(i.type)),
    bottom: items.filter(i => ['Pantalon', 'Short', 'Jogging', 'Jean', 'Jupe', 'Legging', 'Chino'].includes(i.type)),
    feet: items.filter(i => ['Baskets', 'Basket', 'Bottes', 'Sandales', 'Talons', 'Ville', 'Chaussures'].includes(i.type)),
    bag: items.filter(i => ['Sac'].includes(i.type))
  }), [items])

  const isMainView = ['dashboard', 'stylist', 'trip', 'settings'].includes(view)

  return (
    <div className="app-root-wrapper" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toaster 
        position="top-center" 
        containerStyle={{
          top: 'max(env(safe-area-inset-top, 16px), 24px)'
        }}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#1f2937',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
            borderRadius: '16px',
            fontSize: '0.88rem',
            fontWeight: 600,
            border: '1px solid rgba(0,0,0,0.06)',
            padding: '12px 16px',
          }
        }}
      />
      <div className="bg-blobs"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
      <div className="app-container">
        <AnimatePresence initial={false}>
          
          {view === 'splash' && (
            <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="logo-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><RotatingClothes /><h1 className="title">Dress<span style={{ color: 'var(--primary)' }}>flow</span></h1><p className="subtitle">Ton dressing, une tenue pour aujourd’hui.</p></div>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '3rem' }}><motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('register')} className="btn-primary">Créer mon dressing</motion.button><motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('login')} className="btn-secondary">J'ai déjà un compte</motion.button></div>
            </motion.div>
          )}

          {view === 'register' && (
            <motion.div key="register" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}><div style={{ background: 'var(--primary)', color: 'white', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><UserCircle size={35} /></div><h2 className="title">Créer mon dressing</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div><label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 800 }}>PRÉNOM</label><input type="text" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" /></div>
                <div><label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 800 }}>EMAIL</label><input type="email" className="input-styled" placeholder="vous@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
                <div><label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 800 }}>MOT DE PASSE (8 CARACTÈRES MINIMUM)</label><input type="password" className="input-styled" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
                <div><label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 800 }}>CONFIRMER LE MOT DE PASSE</label><input type="password" className="input-styled" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></div>
                <div><label className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 800 }}>STYLE</label><div style={{ display: 'flex', gap: '1rem' }}><button type="button" onClick={() => setGender('female')} className={'btn-secondary ' + (gender === 'female' ? 'active' : '')} style={{ flex: 1 }}>👩 Femme</button><button type="button" onClick={() => setGender('male')} className={'btn-secondary ' + (gender === 'male' ? 'active' : '')} style={{ flex: 1 }}>👨 Homme</button></div></div>
                <button onClick={handleRegister} className="btn-primary" disabled={loading}>Créer mon compte</button>
              </div>
            </motion.div>
          )}

          {view === 'login' && (
            <motion.div key="login" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <h2 className="title" style={{ textAlign: 'center' }}>Bon retour ! 👋</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem 0' }}>
                <input type="email" placeholder="Adresse email" className="input-styled" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <input type="password" placeholder="Mot de passe" className="input-styled" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ marginTop: '0.5rem' }}>Se connecter</button>
              <button className="btn-secondary" onClick={handlePasswordReset} disabled={loading} style={{ marginTop: '0.75rem', width: '100%' }}>Mot de passe oublié ?</button>
              <button onClick={() => setView('splash')} className="btn-secondary" style={{ border: 'none', background: 'none' }}>Retour</button>
            </motion.div>
          )}

          {view === 'reset-password' && (
            <motion.div key="reset-password" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="glass-card my-auto" style={{ padding: '2.5rem' }}>
              <h2 className="title" style={{ textAlign: 'center' }}>Nouveau mot de passe</h2>
              <p className="subtitle" style={{ textAlign: 'center', margin: '1rem 0' }}>Choisis un mot de passe d'au moins 8 caractères.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.5rem 0' }}>
                <input type="password" placeholder="Nouveau mot de passe" className="input-styled" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <input type="password" placeholder="Confirmer le mot de passe" className="input-styled" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <button className="btn-primary" onClick={handlePasswordUpdate} disabled={loading}>Enregistrer le mot de passe</button>
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card my-auto" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ background: '#10b981', color: 'white', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Check size={35} /></div><h2 className="title">Bienvenue !</h2>
              <div className="glass-card" style={{ padding: '1.5rem', margin: '1.5rem 0', border: '2px dashed var(--primary)' }}><div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{formatUID(uid)}</div></div>
              <button onClick={() => setView('dashboard')} className="btn-primary">Mon dressing</button>
            </motion.div>
          )}

          {view === 'dashboard' && (
            <DashboardView 
              key="dashboard" 
              name={name}
              items={items} 
              loading={loading} 
              activeFilter={activeFilter} 
              setActiveFilter={setActiveFilter} 
              filteredItems={filteredItems} 
              onSelectItem={(item) => { setSelectedItem(item); setEditForm({ ...item }); setIsEditing(false); }} 
              onAddClick={() => setView('add-choice')} 
              onAddCategory={(cat, defaultType) => {
                setNewItem(prev => ({
                  ...prev,
                  main_category: cat,
                  type: defaultType,
                  icon: getIconForType(defaultType)
                }));
                setView('add-choice');
              }}
              onAddDemoItems={handleAddDemoItems}
              weather={weather} 
              weatherLoading={weatherLoading} 
              onWeatherClick={() => { setCityModalMode('home'); setShowCityModal(true); }} 
              onImageError={handleImageError} 
            />
          )}
          {view === 'stylist' && (
            <StylistView 
              key="stylist" 
              stylistMode={stylistMode} 
              setStylistMode={setStylistMode} 
              selectedActivity={selectedActivity}
              setSelectedActivity={setSelectedActivity}
              currentOutfit={currentOutfit} 
              setCurrentOutfit={setCurrentOutfit}
              outfitLoading={outfitLoading} 
              handleGenerateOutfitRequest={handleGenerateOutfitRequest} 
              handleValidateOutfit={handleValidateOutfit} 
              manualItems={manualItems} 
              manualOutfit={manualOutfit} 
              setManualOutfit={setManualOutfit} 
              loading={loading} 
              lockedOutfit={lockedOutfit} 
              setLockedOutfit={setLockedOutfit} 
              onImageError={handleImageError} 
            />
          )}
          {view === 'trip' && <TravelView key="trip" travelData={travelData} setTravelData={updateTravelData} suitcase={suitcase} suitcaseNote={suitcaseNote} suitcaseLoading={suitcaseLoading} handleGenerateSuitcase={handleGenerateSuitcase} suitcaseChecked={suitcaseChecked} onTogglePacked={toggleSuitcaseItem} setShowCityModal={setShowCityModal} setCityModalMode={setCityModalMode} />}
          {view === 'settings' && <SettingsView key="settings" profile={{id: uid, name, email, avatar_url: avatarUrl}} name={name} setName={setName} email={email} setEmail={setEmail} avatarPreview={avatarPreview} avatarInputRef={avatarInputRef} setTempAvatarFile={setTempAvatarFile} setAvatarPreview={setAvatarPreview} handleUpdateProfile={handleUpdateProfile} handleLogout={handleLogout} setShowDeleteModal={setShowDeleteModal} items={items} />}
          {['add-choice', 'bulk-add', 'add-detail'].includes(view) && (
            <AddClothingView 
              key="add" 
              view={view} 
              setView={setView} 
              fileInputRef={fileInputRef} 
              galleryInputRef={galleryInputRef} 
              handleFileChange={handleFileChange} 
              bulkItems={bulkItems} 
              setBulkItems={setBulkItems} 
              handleBulkAdd={handleBulkAdd} 
              loading={loading} 
              selectedImage={selectedImage} 
              originalImage={originalImage}
              useCutout={useCutout}
              setUseCutout={setUseCutout}
              isProcessingCutout={isProcessingCutout}
              bulkProgress={bulkProgress}
              newItem={newItem} 
              setNewItem={setNewItem} 
              handleAddItem={handleAddItem} 
              getIconForType={getIconForType}
              onCategoryCutout={handleCategoryCutout}
              onBulkCategory={handleBulkCategory}
              originalFile={originalFile}
              onBrushCommit={handleBrushCommit} 
            />
          )}

        </AnimatePresence>

        {isMainView && <BottomNav activeTab={view} onTabChange={setView} />}

        <CityModal show={showCityModal} onClose={() => setShowCityModal(false)} title={cityModalMode === 'home' ? "Localiser" : "Destination"} citySearch={citySearch} setCitySearch={handleCitySearch} cityResults={cityResults} onSelectCity={handleSelectCity} />
        
        <EditModal show={!!selectedItem} onClose={() => { setSelectedItem(null); setEditForm(null); setIsEditing(false); }} isEditing={isEditing} setIsEditing={setIsEditing} editForm={editForm || selectedItem || {}} setEditForm={setEditForm} handleUpdateItem={handleUpdateItem} handleDeleteItem={handleDeleteItem} loading={loading} />
        
        <DeleteModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} loading={loading} />
      </div>
    </div>
  )
}

export default App
