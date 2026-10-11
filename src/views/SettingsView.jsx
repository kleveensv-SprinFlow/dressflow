import React from 'react';
import { motion } from 'framer-motion';
import { UserCircle, Mail, Save, LogOut, Camera } from 'lucide-react';

const SettingsView = ({
  profile,
  name,
  setName,
  email,
  setEmail,
  avatarPreview,
  avatarInputRef,
  setTempAvatarFile,
  setAvatarPreview,
  handleUpdateProfile,
  handleLogout,
  setShowDeleteModal,
  subscriptionTier,
  items,
  aiGensRemaining
}) => {
  return (
    <div className="dashboard-container" style={{ paddingBottom: '120px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="title">Mon Profil</h1>
        <p className="subtitle">Ton compte et tes préférences</p>
      </header>

      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.5rem' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '35px', overflow: 'hidden', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            {(avatarPreview || profile?.avatar_url) ? <img src={avatarPreview || profile.avatar_url} alt="Avatar du profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserCircle size={50} />}
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => avatarInputRef.current.click()} style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '35px', height: '35px', borderRadius: '12px', background: 'white', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><Camera size={18} /></motion.button>
          <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { setTempAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); } }} />
        </div>
        <h2 style={{ fontWeight: 800 }}>{profile?.name || 'Utilisateur'}</h2>
        
        {profile?.email && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 15px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, marginTop: '1rem' }}>
            <Mail size={14} /> Adresse associée ({profile.email})
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.9rem' }}>USAGE · {subscriptionTier === 'premium' ? 'PREMIUM' : 'GRATUIT'}</h3>
          {subscriptionTier !== 'premium' && (
            <p className="subtitle" style={{ fontSize: '0.78rem', lineHeight: 1.45, marginTop: 0 }}>L’illimité n’est pas encore en vente. Ces plafonds restent ceux du plan gratuit.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}><span>Garde-robe</span><span>{items.length} / {subscriptionTier === 'premium' ? '∞' : '50'}</span></div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                <div style={{ width: `${Math.min((items.length / (subscriptionTier === 'premium' ? items.length : 50)) * 100, 100)}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}><span>Compositions restantes</span><span>{subscriptionTier === 'premium' ? '∞' : aiGensRemaining}</span></div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
                <div style={{ width: `${subscriptionTier === 'premium' ? 100 : (aiGensRemaining / 5) * 100}%`, height: '100%', background: '#7c3aed', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.4 }}>INFORMATIONS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group"><label>Nom d'affichage</label><div style={{ position: 'relative' }}><input type="text" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} /></div></div>
            {!profile?.email && (
              <div className="input-group"><label>Lier un email (Sécurité)</label><div style={{ position: 'relative' }}><Mail size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} /><input type="email" className="input-styled" style={{ paddingLeft: '3rem' }} placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
            )}
            <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleUpdateProfile}><Save size={20} /> Enregistrer les modifs</motion.button>
          </div>
        </div>

        <p className="subtitle" style={{ fontSize: '0.78rem', lineHeight: 1.5, marginTop: '0.5rem' }}>Tes photos restent privées, liées à ton compte.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ color: '#ef4444' }} onClick={handleLogout}><LogOut size={20} /> Déconnexion</motion.button>
          <button onClick={() => setShowDeleteModal(true)} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: '#ef4444', opacity: 0.5, textDecoration: 'underline' }}>Supprimer mon compte définitivement</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
