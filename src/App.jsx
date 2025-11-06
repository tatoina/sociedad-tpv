import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import TPV from "./pages/Tpv";
import Listados from "./pages/Listados";
import Productos from "./pages/Productos";
import Socios from "./pages/Socios";
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
        padding: 8,
        background: theme.headerBg,
        borderBottom: `2px solid ${theme.primary}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            <>
              {/* Avatar / Foto - Click para tomar selfie */}
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => e.target.files?.[0] && handleTakePhoto(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="camera-input"
                  disabled={uploadingPhoto}
                />
                <label 
                  htmlFor="camera-input"
                  style={{ 
                    cursor: uploadingPhoto ? 'wait' : 'pointer',
                    display: 'block',
                    position: 'relative'
                  }}
                  title="Clic para tomar/cambiar foto"
                >
                  {profile?.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt="Foto usuario" 
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: `3px solid ${theme.primary}`,
                        opacity: uploadingPhoto ? 0.5 : 1
                      }} 
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: theme.primary,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: `3px solid ${theme.primary}`,
                        opacity: uploadingPhoto ? 0.5 : 1
                      }}
                    >
                      {(profile?.name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      fontSize: '20px'
                    }}>
                      ⏳
                    </div>
                  )}
                </label>
              </div>

              <strong style={{ color: theme.text }}>{user.email}</strong>
              {profile?.name && <span style={{ color: theme.text, opacity: 0.7 }}>— {profile.name}</span>}
              {isInstalled && <span style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>📱 PWA</span>}
              
              {/* Botón ESTILO */}
              <button 
                onClick={changeTheme}
                style={{
                  background: theme.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginLeft: '4px'
                }}
                title={`Tema actual: ${theme.name}`}
              >
                🎨 ESTILO
              </button>

              {/* Botón Logout */}
              <button 
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.primary}`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '13px',
                  color: theme.primary
                }}
                title="Cerrar sesión"
              >
                🔑
              </button>
            </>
          ) : (
            <span style={{ color: theme.text }}>No autenticado</span>
          )}
        </div>
        <div></div>
      </header>

      <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Navigate to={user ? "/menu" : "/login"} replace />} />
          <Route path="/login" element={user ? <Navigate to="/menu" replace /> : <Login />} />
          <Route path="/menu" element={user ? <Menu user={user} profile={profile} /> : <Navigate to="/login" replace />} />

          {/* TPV solo para no-admin */}
          <Route
            path="/tpv"
            element={user && !profile?.isAdmin ? <TPV user={user} profile={profile} /> : <Navigate to={user ? "/menu" : "/login"} replace />}
          />

          <Route path="/listados" element={user ? <Listados user={user} profile={profile} /> : <Navigate to="/login" replace />} />

          {/* Páginas de gestión para admin */}
          <Route path="/productos" element={user && profile?.isAdmin ? <Productos user={user} profile={profile} /> : <Navigate to={user ? "/menu" : "/login"} replace />} />

          {/* Página de gestión de socios para admin */}
          <Route path="/socios" element={user && profile?.isAdmin ? <Socios user={user} profile={profile} /> : <Navigate to={user ? "/menu" : "/login"} replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}