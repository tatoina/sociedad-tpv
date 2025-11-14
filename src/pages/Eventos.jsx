// src/pages/Eventos.jsx
import React, { useState, useEffect } from 'react';
import { addEventRegistration, getUserEventRegistrations, updateEventRegistration, deleteEventRegistration } from '../firebase';

const EVENT_TYPES = [
  'RESERVAR MESA',
  'FERIAS',
  'FIESTAS DE ESTELLA',
  'COTILLON DE REYES',
  'VIRGEN DEL PUY'
];

export default function Eventos({ user, profile }) {
  const [eventType, setEventType] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [adultos, setAdultos] = useState(1);
  const [ninos, setNinos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Cargar inscripciones del usuario
  useEffect(() => {
    if (user?.uid) {
      loadRegistrations();
    }
  }, [user]);

  const loadRegistrations = async () => {
    try {
      const data = await getUserEventRegistrations(user.uid);
      setRegistrations(data);
    } catch (err) {
      console.error('Error cargando inscripciones:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!eventType || !fecha || !hora) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        uid: user.uid,
        userEmail: user.email,
        userName: profile?.name || user.email,
        eventType,
        fecha,
        hora,
        adultos: Number(adultos),
        ninos: Number(ninos)
      };

      if (editingId) {
        await updateEventRegistration(editingId, registrationData);
        alert('Inscripción actualizada correctamente');
        setEditingId(null);
      } else {
        await addEventRegistration(registrationData);
        alert('Inscripción registrada correctamente');
      }

      // Limpiar formulario
      setEventType('');
      setFecha('');
      setHora('');
      setAdultos(1);
      setNinos(0);
      
      // Recargar lista
      loadRegistrations();
    } catch (err) {
      console.error('Error guardando inscripción:', err);
      alert('Error al guardar la inscripción: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reg) => {
    setEditingId(reg.id);
    setEventType(reg.eventType);
    setFecha(reg.fecha);
    setHora(reg.hora);
    setAdultos(reg.adultos);
    setNinos(reg.ninos);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta inscripción?')) return;
    
    try {
      await deleteEventRegistration(id);
      alert('Inscripción eliminada');
      loadRegistrations();
    } catch (err) {
      console.error('Error eliminando inscripción:', err);
      alert('Error al eliminar: ' + (err.message || err));
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEventType('');
    setFecha('');
    setHora('');
    setAdultos(1);
    setNinos(0);
  };

  if (!user) {
    return <div style={{ padding: 20 }}>No autenticado</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700, color: '#111827' }}>
        📅 Eventos
      </h2>

      {/* Formulario de inscripción */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 32
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, fontWeight: 600 }}>
          {editingId ? '✏️ Editar inscripción' : '➕ Nueva inscripción'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tipo de evento */}
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Tipo de evento *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: 15,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#fff'
                }}
              >
                <option value="">-- Selecciona un evento --</option>
                {EVENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Fecha y Hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                  Fecha *
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: 15,
                    border: '1px solid #d1d5db',
                    borderRadius: 8
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                  Hora *
                </label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: 15,
                    border: '1px solid #d1d5db',
                    borderRadius: 8
                  }}
                />
              </div>
            </div>

            {/* Adultos y Niños */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                  Adultos
                </label>
                <input
                  type="number"
                  min="0"
                  value={adultos}
                  onChange={(e) => setAdultos(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: 15,
                    border: '1px solid #d1d5db',
                    borderRadius: 8
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                  Niños
                </label>
                <input
                  type="number"
                  min="0"
                  value={ninos}
                  onChange={(e) => setNinos(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: 15,
                    border: '1px solid #d1d5db',
                    borderRadius: 8
                  }}
                />
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Inscribirse')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '14px 24px',
                    fontSize: 16,
                    fontWeight: 600,
                    background: '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Lista de inscripciones */}
      <div>
        <h3 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>
          Mis inscripciones ({registrations.length})
        </h3>
        
        {registrations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            background: '#f9fafb',
            borderRadius: 12,
            color: '#6b7280'
          }}>
            No tienes inscripciones todavía
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {registrations.map(reg => (
              <div
                key={reg.id}
                style={{
                  background: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1976d2', marginBottom: 4 }}>
                    {reg.eventType}
                  </div>
                  <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                    📅 {reg.fecha} • 🕐 {reg.hora}
                  </div>
                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                    👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleEdit(reg)}
                    style={{
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      background: '#f59e0b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(reg.id)}
                    style={{
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
