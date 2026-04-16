// src/pages/Menu.jsx
import React from "react";
import { Link } from "react-router-dom";
import { APP_VERSION } from "../App";

// Detectar tipo de dispositivo
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "📱 Tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "📱 Móvil";
  }
  return "💻 PC";
};

export default function Menu({ user, profile }) {
  const MenuItem = ({ to, icon, label, isAdmin = false }) => (
    <Link to={to} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          border: 'none',
          background: isAdmin 
            ? 'linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)'
            : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          fontSize: '40px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(25, 118, 210, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
        }}
      >
        {icon}
      </button>
      <span style={{ 
        fontSize: '12px', 
        fontWeight: '600', 
        color: '#374151',
        textAlign: 'center'
      }}>
        {label}
      </span>
    </Link>
  );

  return (
    <div style={{
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <h2 style={{
        marginBottom: 40,
        fontSize: 22,
        fontWeight: 700,
        color: '#111827',
        textAlign: 'center'
      }}>
        Menú Principal
      </h2>
      
      {!profile?.isAdmin ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, justifyItems: 'center' }}>
          <MenuItem to="/tpv" icon="🛍️" label="TPV" />
          <MenuItem to="/eventos" icon="📅" label="Eventos" />
          <MenuItem to="/listados-eventos" icon="📊" label="Listados Eventos" />
          <MenuItem to="/juntas" icon="🏑" label="Juntas" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, justifyItems: 'center' }}>
          <MenuItem to="/juntas" icon="🏑" label="Juntas" isAdmin={false} />
          <MenuItem to="/listados-tpv" icon="💰" label="Listados TPV" isAdmin />
          <MenuItem to="/listados-eventos" icon="📊" label="Listados Eventos" isAdmin />
          <MenuItem to="/productos" icon="📦" label="Productos" isAdmin />
          <MenuItem to="/socios" icon="👥" label="Socios" isAdmin />
          <MenuItem to="/configuracion" icon="⚙️" label="Configuración" isAdmin />
        </div>
      )}
      
      <div style={{
        marginTop: 'auto',
        paddingTop: 40,
        paddingBottom: 20,
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>{getDeviceType()}</span>
        <span>•</span>
        <span>v{APP_VERSION}</span>
      </div>
    </div>
  );
}