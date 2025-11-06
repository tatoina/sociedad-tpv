import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import TPV from "./pages/Tpv";
import Listados from "./pages/Listados";
import Productos from "./pages/Productos";
import Socios from "./pages/Socios";
import { auth, fetchUserDoc, logout } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { usePWAInstall } from "./hooks/usePWAInstall";

export default function App() {
  const [user, setUser] = useState(null); // firebase user
  const [profile, setProfile] = useState(null); // user doc from firestore
  const [loadingAuth, setLoadingAuth] = useState(true);
  const nav = useNavigate();
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoadingAuth(true);
      if (u) {
        setUser(u);
        try {
          const doc = await fetchUserDoc(u.uid);
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

  if (loadingAuth) return <div>Comprobando autenticación...</div>;

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      alert('¡App instalada correctamente!');
    }
  };

  return (
    <div>
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
      
      <header style={{ display: "flex", justifyContent: "space-between", padding: 8 }}>
        <div>
          {user ? <strong>{user.email}</strong> : <span>No autenticado</span>}
          {profile?.name ? <span> — {profile.name}</span> : null}
          {isInstalled && <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>📱 PWA</span>}
        </div>
        <div>
          {user ? <button onClick={handleLogout}>Cerrar sesión</button> : null}
        </div>
      </header>

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

        {/* Página de gestión de productos para admin */}
        <Route path="/productos" element={user && profile?.isAdmin ? <Productos user={user} profile={profile} /> : <Navigate to={user ? "/menu" : "/login"} replace />} />

        {/* Página de gestión de socios para admin */}
        <Route path="/socios" element={user && profile?.isAdmin ? <Socios user={user} profile={profile} /> : <Navigate to={user ? "/menu" : "/login"} replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}