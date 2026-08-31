// src/pages/Menu.jsx
import React from "react";
import { Link } from "react-router-dom";
import { APP_VERSION } from "../App";

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Móvil";
  return "PC";
};

export default function Menu({ user, profile }) {
  const MenuItem = ({ to, symbol, label, subtitle, isAdmin = false }) => (
    <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 18px',
          background: '#FFFFFF',
          borderRadius: 4,
          borderLeft: `3px solid ${isAdmin ? '#5C4228' : '#8B6340'}`,
          boxShadow: '0 1px 3px rgba(44,31,20,0.07)',
          transition: 'all 0.18s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(3px)';
          e.currentTarget.style.boxShadow = '0 3px 10px rgba(44,31,20,0.13)';
          e.currentTarget.style.borderLeftColor = isAdmin ? '#3E2B16' : '#5C4228';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(44,31,20,0.07)';
          e.currentTarget.style.borderLeftColor = isAdmin ? '#5C4228' : '#8B6340';
        }}
      >
        <div style={{
          width: 42, height: 42, flexShrink: 0,
          background: isAdmin ? '#F5EFE8' : '#FBF7F3',
          borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22
        }}>
          {symbol}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 17,
            fontWeight: 700,
            color: '#2C1F14',
            lineHeight: 1.2
          }}>
            {label}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: '#8A7E72', marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <span style={{ color: '#8B6340', fontSize: 20, fontWeight: 300, lineHeight: 1 }}>›</span>
      </div>
    </Link>
  );

  return (
    <div style={{
      padding: '28px 20px',
      maxWidth: 520,
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Cabecera sección */}
      <div style={{ marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid #E8DDD5' }}>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26,
          fontWeight: 700,
          color: '#2C1F14',
          margin: '0 0 4px'
        }}>
          Menú Principal
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: '#8A7E72' }}>
          {profile?.name ? `Bienvenido, ${profile.name}` : 'Bienvenido'}
        </p>
      </div>

      {/* Elementos de menú */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!profile?.isAdmin ? (
          <>
            <MenuItem to="/eventos"         symbol="🍽️"  label="Eventos"         subtitle="Inscríbete a los próximos eventos" />
            <MenuItem to="/listados-eventos" symbol="📋"  label="Listados"        subtitle="Consulta asistentes por evento" />
          </>
        ) : (
          <>
            <MenuItem to="/listados-eventos" symbol="📋"  label="Listados de Eventos" subtitle="Consulta y gestiona asistentes" isAdmin />
            <MenuItem to="/productos"        symbol="🧾"  label="Productos"           subtitle="Gestión del catálogo" isAdmin />
            <MenuItem to="/socios"           symbol="👤"  label="Socios"              subtitle="Gestión de miembros" isAdmin />
            <MenuItem to="/configuracion"    symbol="⚙"  label="Configuración"       subtitle="Ajustes generales" isAdmin />
          </>
        )}
      </div>

      {/* Versión */}
      <div style={{
        marginTop: 'auto',
        paddingTop: 32,
        paddingBottom: 16,
        fontSize: 11,
        color: '#B5A898',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        {getDeviceType()} · v{APP_VERSION}
      </div>
    </div>
  );
}