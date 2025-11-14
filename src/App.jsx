import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import TPV from "./pages/Tpv";
import Listados from "./pages/Listados";
import Productos from "./pages/Productos";
import Socios from "./pages/Socios";
import Perfil from "./pages/Perfil";
import { auth, fetchUserDoc, logout, uploadUserPhoto } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { usePWAInstall } from "./hooks/usePWAInstall";

// Temas de colores disponibles
const THEMES = [
  { name: 'Azul Clásico', primary: '#1976d2', secondary: '#1565c0', bg: '#ffffff', text: '#000000', headerBg: '#f5f5f5' },
  { name: 'Oscuro', primary: '#212121', secondary: '#424242', bg: '#121212', text: '#ffffff', headerBg: '#1e1e1e' },
  { name: 'Verde Natura', primary: '#2e7d32', secondary: '#1b5e20', bg: '#f1f8e9', text: '#000000', headerBg: '#dcedc8' },
  { name: 'Púrpura', primary: '#7b1fa2', secondary: '#4a148c', bg: '#ffffff', text: '#000000', headerBg: '#f3e5f5' },
  { name: 'Naranja Energía', primary: '#ef6c00', secondary: '#e65100', bg: '#fff3e0', text: '#000000', headerBg: '#ffe0b2' },
  { name: 'Rojo Pasión', primary: '#c62828', secondary: '#b71c1c', bg: '#ffffff', text: '#000000', headerBg: '#ffebee' },
  { name: 'Gris Moderno', primary: '#546e7a', secondary: '#37474f', bg: '#eceff1', text: '#000000', headerBg: '#cfd8dc' },
  { name: 'Turquesa', primary: '#00838f', secondary: '#006064', bg: '#e0f7fa', text: '#000000', headerBg: '#b2ebf2' },
];

export default function App() {
  const [user, setUser] = useState(null); // firebase user
  const [profile, setProfile] = useState(null); // user doc from firestore
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    return saved ? JSON.parse(saved) : THEMES[0];
  });
  const [showCamera, setShowCamera] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const nav = useNavigate();
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoadingAuth(true);
      if (u) {
        setUser(u);
        try {
          const doc = await fetchUserDoc(u.uid);
          console.log("Profile loaded:", doc);
          console.log("PhotoURL:", doc?.photoURL);
          setProfile(doc);
        } catch (err) {
          console.error("fetchUserDoc error:", err);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      nav("/login");
    } catch (err) {
      console.error("Logout error:", err);
      alert("Error cerrando sesión: " + (err.message || err));
    }
  };

  const reloadProfile = async () => {
    if (user) {
      try {
        const doc = await fetchUserDoc(user.uid);
        setProfile(doc);
      } catch (err) {
        console.error("Error reloading profile:", err);
      }
    }
  };

  // Verificar si el perfil está completo
  const isProfileComplete = (prof) => {
    return prof && prof.name && prof.lastName && prof.phone && prof.birthDate;
  };

  // Enviar sugerencia
  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) {
      alert('Por favor, escribe tu sugerencia');
      return;
    }
    
    setSendingSuggestion(true);
    try {
      const userName = profile?.name || user?.email || 'Usuario anónimo';
      const userEmail = user?.email || 'sin email';
      const subject = `Sugerencia TPV App - ${userName}`;
      const body = `Usuario: ${userName}\nEmail: ${userEmail}\n\nSugerencia:\n${suggestionText}`;
      
      // Crear mailto link
      const mailtoLink = `mailto:inavicba@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      
      // Cerrar modal y limpiar
      setShowSuggestionModal(false);
      setSuggestionText('');
      alert('Se abrirá tu cliente de correo para enviar la sugerencia');
    } catch (err) {
      console.error('Error al enviar sugerencia:', err);
      alert('Error al abrir el cliente de correo');
    } finally {
      setSendingSuggestion(false);
    }
  };

  const changeTheme = () => {
    const currentIndex = THEMES.findIndex(t => t.name === theme.name);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    const newTheme = THEMES[nextIndex];
    setTheme(newTheme);
    localStorage.setItem('app-theme', JSON.stringify(newTheme));
  };

  const handleTakePhoto = async (file) => {
    if (!user || !file) return;
    
    setUploadingPhoto(true);
    try {
      const photoURL = await uploadUserPhoto(user.uid, file);
      // Actualizar perfil local
      setProfile(prev => ({ ...prev, photoURL }));
      setShowCamera(false);
      alert('Foto actualizada correctamente');
    } catch (err) {
      console.error("Error subiendo foto:", err);
      alert("Error subiendo foto: " + (err.message || err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // El return condicional se mueve después de los hooks

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      alert('¡App instalada correctamente!');
    }
  };

  // Aplicar variables CSS globales basadas en el tema
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-bg', theme.primary);
    document.documentElement.style.setProperty('--primary-color', '#ffffff');
    document.documentElement.style.setProperty('--secondary-bg', theme.secondary);
    document.documentElement.style.setProperty('--app-bg', theme.bg);
    document.documentElement.style.setProperty('--app-text', theme.text);
    document.documentElement.style.setProperty('--header-bg', theme.headerBg);
    document.documentElement.style.setProperty('--ghost-border', theme.text === '#ffffff' ? '#555' : '#ccc');
    // Color para cards - más claro u oscuro según el fondo
    const cardBg = theme.bg === '#ffffff' ? '#f9f9f9' : (theme.bg === '#121212' ? '#1e1e1e' : theme.bg);
    document.documentElement.style.setProperty('--card-bg', cardBg);
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
  }, [theme]);

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && !e.target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  if (loadingAuth) {
    return <div>Comprobando autenticación...</div>;
  }
  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh' }}>
      {/* Banner de instalación PWA */}
      {isInstallable && !isInstalled && (
        <div style={{ 
          background: '#1976d2', 
          color: '#fff', 
          padding: '12px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span>📱 Instala la app en tu dispositivo</span>
          <button 
            onClick={handleInstall}
            style={{ 
              background: '#fff', 
              color: '#1976d2', 
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Instalar
          </button>
        </div>
      )}
      
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: '12px 20px',
        background: theme.headerBg,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: `1px solid ${theme.primary}20`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user ? (
            <>
              {/* Avatar / Foto con menú desplegable */}
              <div style={{ position: 'relative' }} data-user-menu>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => e.target.files?.[0] && handleTakePhoto(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="camera-input"
                  disabled={uploadingPhoto}
                />
                <div 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{ 
                    cursor: uploadingPhoto ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    position: 'relative',
                    padding: '6px 12px',
                    borderRadius: '24px',
                    transition: 'background 0.2s ease',
                    background: showUserMenu ? theme.primary + '15' : 'transparent'
                  }}
                  title="Menú de usuario"
                  onMouseEnter={(e) => {
                    if (!showUserMenu) e.currentTarget.style.background = theme.primary + '10';
                  }}
                  onMouseLeave={(e) => {
                    if (!showUserMenu) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {profile?.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt="Foto usuario" 
                      style={{ 
                        width: 44, 
                        height: 44, 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: `2px solid ${theme.primary}`,
                        opacity: uploadingPhoto ? 0.5 : 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }} 
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: 44, 
                        height: 44, 
                        borderRadius: '50%', 
                        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        opacity: uploadingPhoto ? 0.5 : 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {(profile?.name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      left: 12,
                      width: 44,
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      fontSize: '20px'
                    }}>
                      ⏳
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ 
                      color: theme.text, 
                      fontSize: 15,
                      fontWeight: 600
                    }}>
                      {profile?.name || user.email?.split('@')[0]}
                    </strong>
                    <span style={{ 
                      fontSize: 18,
                      color: theme.text,
                      opacity: 0.5,
                      transition: 'transform 0.2s ease',
                      transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Menú desplegable */}
                {showUserMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '60px',
                    left: 0,
                    background: theme.bg,
                    border: `1px solid ${theme.primary}30`,
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    minWidth: '220px',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}>
                    {!profile?.isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          nav('/tpv');
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'transparent',
                          color: theme.text,
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          borderBottom: `1px solid ${theme.primary}20`
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = theme.primary + '20'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        🛒 TPV
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        nav('/listados');
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: theme.text,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderBottom: `1px solid ${theme.primary}20`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.primary + '20'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      📊 Listados
                    </button>
                    <button
                      onClick={() => {
                        document.getElementById('camera-input').click();
                        setShowUserMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: theme.text,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderBottom: `1px solid ${theme.primary}20`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.primary + '20'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      📸 Cambiar foto de perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        alert('Se enviará un correo para cambiar la contraseña');
                        // TODO: Implementar solicitud de cambio de contraseña
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: theme.text,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderBottom: `1px solid ${theme.primary}20`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.primary + '20'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      🔑 Cambiar contraseña
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        nav('/perfil');
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: theme.text,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderBottom: `1px solid ${theme.primary}20`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.primary + '20'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      👤 Ver perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowSuggestionModal(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: theme.text,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderBottom: `1px solid ${theme.primary}20`
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.primary + '20'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      💡 Sugerencias para la app
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        color: '#d32f2f',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: '600'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#d32f2f20'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      🚪 Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            
            </>
          ) : (
            <span style={{ color: theme.text }}>No autenticado</span>
          )}
        </div>
        
        {/* Botón ESTILO - tres puntos de colores */}
        {user && (
          <button 
            onClick={changeTheme}
            style={{
              background: theme.bg,
              border: `1px solid ${theme.primary}30`,
              borderRadius: '20px',
              width: 40,
              height: 40,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            title={`Cambiar tema (actual: ${theme.name})`}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4285F4'
            }}></div>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#EA4335'
            }}></div>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#FBBC04'
            }}></div>
          </button>
        )}
      </header>

      {/* Modal de sugerencias */}
      {showSuggestionModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 16
          }}
          onClick={() => setShowSuggestionModal(false)}
        >
          <div 
            style={{
              background: theme.bg,
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: theme.text }}>
              💡 Enviar sugerencia
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 14, color: theme.text, opacity: 0.7 }}>
              Cuéntanos qué mejoras te gustaría ver en la app
            </p>
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Escribe tu sugerencia aquí..."
              style={{
                width: '100%',
                minHeight: 120,
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${theme.primary}30`,
                fontSize: 14,
                resize: 'vertical',
                background: theme.bg,
                color: theme.text,
                fontFamily: 'inherit'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleSendSuggestion}
                disabled={sendingSuggestion || !suggestionText.trim()}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {sendingSuggestion ? 'Enviando...' : '📧 Enviar sugerencia'}
              </button>
              <button
                onClick={() => {
                  setShowSuggestionModal(false);
                  setSuggestionText('');
                }}
                className="btn-ghost"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Navigate to={user ? "/menu" : "/login"} replace />} />
          <Route path="/login" element={user ? <Navigate to="/menu" replace /> : <Login />} />
          
          {/* Página de perfil - siempre accesible si está autenticado */}
          <Route path="/perfil" element={user ? <Perfil user={user} profile={profile} onProfileUpdate={reloadProfile} /> : <Navigate to="/login" replace />} />
          
          {/* Menú - redirige a perfil si no está completo */}
          <Route 
            path="/menu" 
            element={
              user ? (
                !isProfileComplete(profile) ? <Navigate to="/perfil" replace /> : <Menu user={user} profile={profile} />
              ) : <Navigate to="/login" replace />
            } 
          />

          {/* TPV solo para no-admin - redirige a perfil si no está completo */}
          <Route
            path="/tpv"
            element={
              user && !profile?.isAdmin ? (
                !isProfileComplete(profile) ? <Navigate to="/perfil" replace /> : <TPV user={user} profile={profile} />
              ) : <Navigate to={user ? "/menu" : "/login"} replace />
            }
          />

          {/* Listados - redirige a perfil si no está completo */}
          <Route 
            path="/listados" 
            element={
              user ? (
                !isProfileComplete(profile) ? <Navigate to="/perfil" replace /> : <Listados user={user} profile={profile} />
              ) : <Navigate to="/login" replace />
            } 
          />

          {/* Páginas de gestión para admin - redirige a perfil si no está completo */}
          <Route 
            path="/productos" 
            element={
              user && profile?.isAdmin ? (
                !isProfileComplete(profile) ? <Navigate to="/perfil" replace /> : <Productos user={user} profile={profile} />
              ) : <Navigate to={user ? "/menu" : "/login"} replace />
            } 
          />

          {/* Página de gestión de socios para admin - redirige a perfil si no está completo */}
          <Route 
            path="/socios" 
            element={
              user && profile?.isAdmin ? (
                !isProfileComplete(profile) ? <Navigate to="/perfil" replace /> : <Socios user={user} profile={profile} />
              ) : <Navigate to={user ? "/menu" : "/login"} replace />
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}