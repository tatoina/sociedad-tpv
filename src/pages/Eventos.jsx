// src/pages/Eventos.jsx
import React, { useState, useEffect } from 'react';
import { addEventRegistration, getUserEventRegistrations, getAllEventRegistrations, updateEventRegistration, deleteEventRegistration, deleteAllEventRegistrationsByType } from '../firebase';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 999,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    }}
  >
    ← Volver
  </button>
);

const EVENT_TYPES = [
  'RESERVAR MESA',
  'CUMPLEAÑOS MES',
  'FIESTAS DE ESTELLA',
  'FERIAS',
  'LOTERIA NAVIDAD',
  'COTILLON DE REYES'
];

export default function Eventos({ user, profile }) {
  const [eventType, setEventType] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [adultos, setAdultos] = useState(1);
  const [ninos, setNinos] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [comensales, setComensales] = useState(1);
  const [decimos, setDecimos] = useState(1);
  const [textoCena, setTextoCena] = useState('');
  const [fechaProximaCena, setFechaProximaCena] = useState('');
  const [loading, setLoading] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [otherRegistrations, setOtherRegistrations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const nav = useNavigate();

  const handleBackButton = () => {
    nav('/menu');
  };

  // Función para obtener el día de la semana en español
  const getDayOfWeek = (dateString) => {
    if (!dateString) return '';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const date = new Date(dateString + 'T00:00:00');
    return days[date.getDay()];
  };

  // Cargar todas las inscripciones y fecha de próxima cena
  useEffect(() => {
    if (user?.uid) {
      loadRegistrations();
      loadFechaProximaCena();
    }
  }, [user]);

  const loadRegistrations = async () => {
    try {
      const allData = await getAllEventRegistrations();
      
      // Separar mis inscripciones del resto
      const mine = allData.filter(reg => reg.uid === user.uid);
      const others = allData.filter(reg => reg.uid !== user.uid);
      
      setMyRegistrations(mine);
      setOtherRegistrations(others);
    } catch (err) {
      console.error('Error cargando inscripciones:', err);
    }
  };

  const loadFechaProximaCena = async () => {
    try {
      const { getEventConfig } = await import('../firebase');
      const config = await getEventConfig('CUMPLEAÑOS MES');
      if (config?.fechaCena) {
        setFechaProximaCena(config.fechaCena);
      }
    } catch (err) {
      console.error('Error cargando fecha de cena:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!eventType) {
      alert('Por favor selecciona un tipo de evento');
      return;
    }

    // Validar según el tipo de evento
    if (eventType === 'RESERVAR MESA') {
      if (!fecha || !comensales) {
        alert('Por favor completa todos los campos obligatorios');
        return;
      }
    } else if (eventType === 'CUMPLEAÑOS MES') {
      if (!adultos || Number(adultos) === 0) {
        alert('Por favor indica al menos 1 adulto');
        return;
      }
    } else if (eventType === 'LOTERIA NAVIDAD') {
      if (!decimos) {
        alert('Por favor indica el número de décimos');
        return;
      }
    } else if (eventType === 'FIESTAS DE ESTELLA') {
      if (!fecha) {
        alert('Por favor selecciona una fecha');
        return;
      }
    }

    setLoading(true);
    try {
      const registrationData = {
        uid: user.uid,
        userEmail: user.email,
        userName: profile?.name || user.email,
        eventType,
        fecha: ['LOTERIA NAVIDAD', 'CUMPLEAÑOS MES'].includes(eventType) ? null : fecha,
        hora: hora || null,
        adultos: ['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(eventType) ? Number(adultos) : 0,
        ninos: ['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(eventType) ? Number(ninos) : 0,
        comensales: eventType === 'RESERVAR MESA' ? Number(comensales) : 0,
        observaciones: eventType === 'RESERVAR MESA' ? observaciones : '',
        decimos: eventType === 'LOTERIA NAVIDAD' ? Number(decimos) : 0,
        diaSemana: eventType === 'FIESTAS DE ESTELLA' ? getDayOfWeek(fecha) : ''
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
      setObservaciones('');
      setComensales(1);
      setDecimos(1);
      setTextoCena('');
      
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
    setFecha(reg.fecha || '');
    setHora(reg.hora || '');
    setAdultos(reg.adultos || 1);
    setNinos(reg.ninos || 0);
    setObservaciones(reg.observaciones || '');
    setComensales(reg.comensales || 1);
    setDecimos(reg.decimos || 1);
    setTextoCena(reg.textoCena || '');
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
    setObservaciones('');
    setComensales(1);
    setDecimos(1);
    setTextoCena('');
  };

  const handleDeleteAllCumpleanos = async () => {
    const password = prompt('Introduce la contraseña para borrar todas las inscripciones:');
    
    if (password !== '1234') {
      alert('Contraseña incorrecta');
      return;
    }

    const fechaCena = prompt('¿Qué día es la próxima cena? (ej: Viernes 20 de Diciembre):');
    
    if (!fechaCena || fechaCena.trim() === '') {
      alert('Debes indicar cuándo será la cena');
      return;
    }

    if (!confirm('¿Estás seguro de borrar TODAS las inscripciones de CUMPLEAÑOS MES?')) {
      return;
    }

    try {
      const { setEventConfig } = await import('../firebase');
      
      // Guardar la fecha de la cena
      await setEventConfig('CUMPLEAÑOS MES', { fechaCena: fechaCena.trim() });
      
      // Borrar todas las inscripciones
      const count = await deleteAllEventRegistrationsByType('CUMPLEAÑOS MES');
      
      alert(`Se han eliminado ${count} inscripciones.\nPróxima cena: ${fechaCena}`);
      
      // Actualizar estado local
      setFechaProximaCena(fechaCena.trim());
      
      loadRegistrations();
    } catch (err) {
      console.error('Error borrando inscripciones:', err);
      alert('Error al borrar las inscripciones: ' + (err.message || err));
    }
  };

  if (!user) {
    return <div style={{ padding: 20 }}>No autenticado</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <BackButton onClick={handleBackButton} />
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

            {/* Campos específicos según el tipo de evento */}
            {eventType === 'RESERVAR MESA' && (
              <>
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
                    Hora (opcional)
                  </label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
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
                    Observaciones
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Indica cualquier preferencia o comentario..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: 15,
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                    Número de comensales *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={comensales}
                    onChange={(e) => setComensales(e.target.value)}
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
              </>
            )}

            {/* CUMPLEAÑOS MES: Solo comensales */}
            {eventType === 'CUMPLEAÑOS MES' && (
              <>
                {fechaProximaCena && (
                  <div style={{
                    padding: 16,
                    background: '#dbeafe',
                    borderRadius: 8,
                    border: '2px solid #3b82f6',
                    marginBottom: 16
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
                      📅 Próxima cena:
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1e3a8a' }}>
                      {fechaProximaCena}
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                      Adultos *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adultos}
                      onChange={(e) => setAdultos(e.target.value)}
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
              </>
            )}

            {/* FIESTAS DE ESTELLA: Fecha con día de la semana, Adultos y Niños */}
            {eventType === 'FIESTAS DE ESTELLA' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                    Fecha *
                  </label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        padding: '12px',
                        fontSize: 15,
                        border: '1px solid #d1d5db',
                        borderRadius: 8
                      }}
                    />
                    {fecha && (
                      <div style={{
                        padding: '12px 16px',
                        fontSize: 14,
                        fontWeight: 600,
                        background: '#f3f4f6',
                        borderRadius: 8,
                        color: '#374151',
                        minWidth: '100px',
                        textAlign: 'center'
                      }}>
                        {getDayOfWeek(fecha)}
                      </div>
                    )}
                  </div>
                </div>
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
              </>
            )}

            {/* FERIAS: Adultos y Niños */}
            {eventType === 'FERIAS' && (
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
            )}

            {/* LOTERIA NAVIDAD: Solo Décimos */}
            {eventType === 'LOTERIA NAVIDAD' && (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                  Número de décimos *
                </label>
                <input
                  type="number"
                  min="1"
                  value={decimos}
                  onChange={(e) => setDecimos(e.target.value)}
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
            )}

            {/* COTILLON DE REYES: Adultos y Niños */}
            {eventType === 'COTILLON DE REYES' && (
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
            )}

            {/* Botones - solo mostrar si hay evento seleccionado */}
            {eventType && (
              <>
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
                
                {/* Botón especial para borrar todas las inscripciones de CUMPLEAÑOS MES */}
                {eventType === 'CUMPLEAÑOS MES' && !editingId && (
                  <div style={{ marginTop: 16, padding: 16, background: '#fef3c7', borderRadius: 8, border: '2px solid #f59e0b' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#92400e', fontWeight: 600 }}>
                      ⚠️ Administración de inscripciones
                    </p>
                    <button
                      type="button"
                      onClick={handleDeleteAllCumpleanos}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        fontSize: 16,
                        fontWeight: 700,
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      🗑️ Borrar inscripciones de todos
                    </button>
                    <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#92400e' }}>
                      Requiere contraseña. Eliminará todas las inscripciones de este evento.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </form>
      </div>

      {/* MIS INSCRIPCIONES */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600, color: '#1976d2' }}>
          📝 Mis inscripciones ({myRegistrations.length})
        </h3>
        
        {myRegistrations.length === 0 ? (
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
            {myRegistrations.map(reg => (
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
                  
                  {/* RESERVAR MESA */}
                  {reg.eventType === 'RESERVAR MESA' && (
                    <>
                      <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                        📅 {reg.fecha} {reg.hora && `• 🕐 ${reg.hora}`}
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>
                        🍽️ {reg.comensales} comensal{reg.comensales !== 1 ? 'es' : ''}
                      </div>
                      {reg.observaciones && (
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                          💬 {reg.observaciones}
                        </div>
                      )}
                    </>
                  )}

                  {/* CUMPLEAÑOS MES */}
                  {reg.eventType === 'CUMPLEAÑOS MES' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* FIESTAS DE ESTELLA */}
                  {reg.eventType === 'FIESTAS DE ESTELLA' && (
                    <>
                      <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                        📅 {reg.fecha} {reg.diaSemana && `(${reg.diaSemana})`}
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>
                        👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                      </div>
                    </>
                  )}

                  {/* FERIAS */}
                  {reg.eventType === 'FERIAS' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* LOTERIA NAVIDAD */}
                  {reg.eventType === 'LOTERIA NAVIDAD' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      🎟️ {reg.decimos} décimo{reg.decimos !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* COTILLON DE REYES */}
                  {reg.eventType === 'COTILLON DE REYES' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                    </div>
                  )}
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

      {/* RESTO DE INSCRIPCIONES */}
      <div>
        <h3 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600, color: '#6b7280' }}>
          👥 Resto de inscripciones ({otherRegistrations.length})
        </h3>
        
        {otherRegistrations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            background: '#f9fafb',
            borderRadius: 12,
            color: '#6b7280'
          }}>
            No hay otras inscripciones todavía
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {otherRegistrations.map(reg => (
              <div
                key={reg.id}
                style={{
                  background: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '2px solid #f3f4f6'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#1976d2' }}>
                      {reg.eventType}
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#6b7280',
                      fontWeight: 600,
                      background: '#f3f4f6',
                      padding: '4px 12px',
                      borderRadius: 12
                    }}>
                      {reg.userName || reg.userEmail}
                    </div>
                  </div>
                  
                  {/* RESERVAR MESA */}
                  {reg.eventType === 'RESERVAR MESA' && (
                    <>
                      <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                        📅 {reg.fecha} {reg.hora && `• 🕐 ${reg.hora}`}
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>
                        🍽️ {reg.comensales} comensal{reg.comensales !== 1 ? 'es' : ''}
                      </div>
                      {reg.observaciones && (
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                          💬 {reg.observaciones}
                        </div>
                      )}
                    </>
                  )}

                  {/* CUMPLEAÑOS MES */}
                  {reg.eventType === 'CUMPLEAÑOS MES' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* FIESTAS DE ESTELLA */}
                  {reg.eventType === 'FIESTAS DE ESTELLA' && (
                    <>
                      <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                        📅 {reg.fecha} {reg.diaSemana && `(${reg.diaSemana})`}
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>
                        👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                      </div>
                    </>
                  )}

                  {/* FERIAS */}
                  {reg.eventType === 'FERIAS' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* LOTERIA NAVIDAD */}
                  {reg.eventType === 'LOTERIA NAVIDAD' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      🎟️ {reg.decimos} décimo{reg.decimos !== 1 ? 's' : ''}
                    </div>
                  )}

                  {/* COTILLON DE REYES */}
                  {reg.eventType === 'COTILLON DE REYES' && (
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
