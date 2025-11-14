// src/pages/Menu.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Menu({ user, profile }) {
  const MenuItem = ({ to, icon, label, isAdmin = false }) => (
    <Link to={to} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <button
        style={{
          width: '140px',
          height: '140px',
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
          gap: 8,
          fontSize: '48px'
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
        fontSize: '16px', 
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
        fontSize: 28,
        fontWeight: 700,
        color: '#111827',
        textAlign: 'center'
      }}>
        Menú Principal
      </h2>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        alignItems: 'center'
      }}>
        {!profile?.isAdmin && <MenuItem to="/tpv" icon="🛒" label="TPV" />}
        <MenuItem to="/listados" icon="📊" label="Listados" />
        <MenuItem to="/eventos" icon="📅" label="Eventos" />
        {profile?.isAdmin && <MenuItem to="/productos" icon="📦" label="Productos" isAdmin />}
        {profile?.isAdmin && <MenuItem to="/socios" icon="👥" label="Socios" isAdmin />}
      </div>
    </div>
  );
}