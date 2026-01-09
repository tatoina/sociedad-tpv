// src/pages/Configuracion.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlobalConfig, setGlobalConfig } from '../firebase';

export default function Configuracion({ user, profile }) {
  const [emailsEnabled, setEmailsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  // Bloquear acceso a no admin
  if (!profile?.isAdmin) {
    return (
      <div style={{padding: 20, textAlign: 'center'}}>
        <h2>Acceso no permitido</h2>
        <p>Solo los administradores pueden acceder a esta página.</p>
        <button className="btn-primary" onClick={() => nav('/menu')}>Volver al Menú</button>
      </div>
    );
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getGlobalConfig();
      setEmailsEnabled(config.emailsEnabled !== false); // Por defecto true
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmails = async () => {
    setSaving(true);
    try {
      const newValue = !emailsEnabled;
      await setGlobalConfig({ emailsEnabled: newValue });
      setEmailsEnabled(newValue);
      alert(`✅ Envío de emails ${newValue ? 'ACTIVADO' : 'DESACTIVADO'}`);
    } catch (err) {
      console.error('Error guardando configuración:', err);
      alert('❌ Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{padding: 20, textAlign: 'center'}}>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <button
        onClick={() => nav('/menu')}
        style={{
          marginBottom: 20,
          padding: '8px 16px',
          background: '#6b7280',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600
        }}
      >
        ← Volver al Menú
      </button>

      <h2 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700, color: '#111827' }}>
        ⚙️ Configuración
      </h2>

      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, fontWeight: 600 }}>
          📧 Notificaciones por Email
        </h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          background: emailsEnabled ? '#dbeafe' : '#fee2e2',
          borderRadius: 12,
          border: `2px solid ${emailsEnabled ? '#3b82f6' : '#ef4444'}`
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
              Envío de Emails
            </div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              {emailsEnabled 
                ? '✅ Los emails se están enviando normalmente' 
                : '❌ Los emails están desactivados (modo pruebas)'}
            </div>
          </div>

          <button
            onClick={handleToggleEmails}
            disabled={saving}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 700,
              background: emailsEnabled 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
              opacity: saving ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {saving ? 'Guardando...' : (emailsEnabled ? 'DESACTIVAR' : 'ACTIVAR')}
          </button>
        </div>

        <div style={{
          marginTop: 16,
          padding: 16,
          background: '#f9fafb',
          borderRadius: 8,
          fontSize: 13,
          color: '#6b7280'
        }}>
          <strong>Nota:</strong> Cuando los emails están desactivados:
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>No se enviarán notificaciones de reservas de mesa</li>
            <li>No se enviarán notificaciones de fechas de cenas/comidas</li>
            <li>Útil para realizar pruebas sin enviar emails a los socios</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
