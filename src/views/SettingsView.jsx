import React from 'react';
import { motion } from 'framer-motion';
import { UserCircle, Mail, Save, LogOut, Camera, Sparkles, Shirt, RotateCw, CheckCircle2 } from 'lucide-react';

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
  items = []
}) => {
  const totalItems = items.length;
  const wornItems = items.filter(item => item.last_worn_date != null);
  const rotationRate = totalItems > 0 ? Math.round((wornItems.length / totalItems) * 100) : 0;

  return (
    <div className="dashboard-container" style={{ paddingBottom: '120px' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 className="title" style={{ fontSize: '1.8rem', letterSpacing: '-0.5px' }}>Mon Profil</h1>
        <p className="subtitle">Ton compte et les statistiques de ton dressing</p>
      </header>

      {/* CARTE PROFIL */}
      <div className="glass-card" style={{ padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.2rem' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '35px', overflow: 'hidden', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            {(avatarPreview || profile?.avatar_url) ? (
              <img src={avatarPreview || profile.avatar_url} alt="Avatar du profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserCircle size={50} />
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => avatarInputRef.current.click()}
            style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '35px', height: '35px', borderRadius: '12px', background: 'white', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <Camera size={18} />
          </motion.button>
          <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { setTempAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); } }} />
        </div>
        <h2 style={{ fontWeight: 800, fontSize: '1.25rem' }}>{profile?.name || 'Utilisateur'}</h2>
        
        {profile?.email && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 15px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, marginTop: '0.8rem' }}>
            <Mail size={14} /> {profile.email}
          </div>
        )}
      </div>

      {/* STATISTIQUES DU DRESSING (REMPLACE LES QUOTAS ARTIFICIELS) */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
          Statistiques de ton dressing
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', marginBottom: '4px' }}>
              <Shirt size={16} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>Total garde-robe</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {totalItems}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', marginBottom: '4px' }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>Pièces portées</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)' }}>
              {wornItems.length}
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <RotateCw size={14} color="var(--primary)" /> Taux de rotation du dressing
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)' }}>
              {rotationRate}%
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${rotationRate}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
          </div>
          <p className="subtitle" style={{ fontSize: '0.72rem', marginTop: '6px', marginBottom: 0 }}>
            L’algorithme priorise les pièces qui n’ont pas encore été portées pour varier tes tenues.
          </p>
        </div>
      </div>

      {/* INFORMATIONS PERSONNELLES */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '1.2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
          Informations du compte
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Nom d'affichage</label>
            <input type="text" className="input-styled" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {!profile?.email && (
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Lier un email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                <input type="email" className="input-styled" style={{ paddingLeft: '3rem' }} placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          )}
          <motion.button whileTap={{ scale: 0.95 }} className="btn-primary" onClick={handleUpdateProfile}>
            <Save size={18} /> Enregistrer les modifications
          </motion.button>
        </div>
      </div>

      {/* DÉCONNEXION & SUPPRESSION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <motion.button whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ color: '#ef4444' }} onClick={handleLogout}>
          <LogOut size={18} /> Déconnexion
        </motion.button>
        <button
          onClick={() => setShowDeleteModal(true)}
          style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: '#ef4444', opacity: 0.6, textDecoration: 'underline', cursor: 'pointer', padding: '8px' }}
        >
          Supprimer mon compte définitivement
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
