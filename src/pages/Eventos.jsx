// src/pages/Eventos.jsx
import React, { useState, useEffect } from 'react';
import { addEventRegistration, getUserEventRegistrations, getAllEventRegistrations, updateEventRegistration, deleteEventRegistration, deleteAllEventRegistrationsByType, getGlobalConfig, addTemporaryEvent, getTemporaryEvents, getAllSocios } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';



export default function Eventos({ user, profile }) {
  const [eventType, setEventType] = useState('');
  const [fecha, setFecha] = useState('');
  const [adultos, setAdultos] = useState(1);
  const [ninos, setNinos] = useState(0);
  const [tipoComida, setTipoComida] = useState('COMIDA');
  const [loading, setLoading] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [otherRegistrations, setOtherRegistrations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState({});
  
  // Estados para eventos temporales
  const [temporaryEvents, setTemporaryEvents] = useState([]);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [newEventTitulo, setNewEventTitulo] = useState('');
  const [newEventFecha, setNewEventFecha] = useState('');
  const [newEventTipoComida, setNewEventTipoComida] = useState('COMIDA');
  const [newEventFijo, setNewEventFijo] = useState(false);

  // Estados para "apuntar a otro de mi parte"
  const [showApuntarOtroModal, setShowApuntarOtroModal] = useState(false);
  const [apuntarUsuarios, setApuntarUsuarios] = useState([]);
  const [apuntarSelectedUserId, setApuntarSelectedUserId] = useState('');
  
  const nav = useNavigate();

  // Bloquear acceso a admin
  if (profile?.isAdmin) {
    return (
      <div style={{padding: 20, textAlign: 'center'}}>
        <h2>Acceso no permitido</h2>
        <p>Los administradores no pueden inscribirse a eventos.</p>
        <button className="btn-primary" onClick={() => nav('/menu')}>Volver al Menú</button>
      </div>
    );
  }

  // Función para obtener el día de la semana en español
  const getDayOfWeek = (dateString) => {
    if (!dateString) return '';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const date = new Date(dateString + 'T00:00:00');
    return days[date.getDay()];
  };

  // Función para verificar si una fecha ya pasó
  const isFechaPassada = (fechaStr) => {
    if (!fechaStr) return true;
    
    let fechaCena;
    
    // Intentar parsear el formato YYYY-MM-DD
    if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      fechaCena = new Date(fechaStr + 'T00:00:00');
    } else {
      // Intentar parsear el formato DD/MM/YYYY
      const partes = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (partes) {
        const dia = parseInt(partes[1], 10);
        const mes = parseInt(partes[2], 10) - 1; // Mes es 0-indexed
        const año = parseInt(partes[3], 10);
        fechaCena = new Date(año, mes, dia);
      } else {
        return false;
      }
    }
    
    // Comparar solo las fechas (sin horas)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaCena.setHours(0, 0, 0, 0);
    
    return fechaCena < hoy;
  };

  // Función para formatear fecha YYYY-MM-DD a formato legible
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '';
    
    // Si ya está en formato legible, devolverla tal cual
    if (fechaStr.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
      return fechaStr;
    }
    
    // Si está en formato YYYY-MM-DD, convertir
    if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(fechaStr + 'T00:00:00');
      const dia = date.getDate();
      const mes = date.getMonth() + 1;
      const año = date.getFullYear();
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diaSemana = dias[date.getDay()];
      return `${diaSemana} ${dia}/${mes}/${año}`;
    }
    
    return fechaStr;
  };

  // Establecer fecha y tipo de comida para eventos temporales
  useEffect(() => {
    if (eventType.startsWith('TEMP_') && !editingId) {
      const tempEventId = eventType.replace('TEMP_', '');
      const tempEvent = temporaryEvents.find(e => e.id === tempEventId);
      if (tempEvent) {
        setFecha(tempEvent.fecha);
        setTipoComida(tempEvent.tipoComida);
      }
    }
  }, [eventType, temporaryEvents]);

  // Cargar todas las inscripciones
  useEffect(() => {
    if (user?.uid) {
      loadRegistrations();
      loadTemporaryEvents();
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

  const loadTemporaryEvents = async () => {
    try {
      const events = await getTemporaryEvents();
      setTemporaryEvents(events);
    } catch (err) {
      console.error('Error cargando eventos temporales:', err);
    }
  };

  const handleCreateTemporaryEvent = async () => {
    if (!newEventTitulo || !newEventFecha) {
      alert('Por favor completa el título y la fecha del evento');
      return;
    }

    setLoading(true);
    try {
      const result = await addTemporaryEvent({
        titulo: newEventTitulo,
        fecha: newEventFecha,
        tipoComida: newEventTipoComida,
        fijo: newEventFijo
      });
      
      alert(`Evento "${newEventTitulo}" creado correctamente`);
      
      // Enviar notificación por email en segundo plano
      (async () => {
        try {
          const config = await getGlobalConfig();
          
          if (config.emailsEnabled !== false) {
            console.log('📧 Enviando notificación de nuevo evento temporal...', {
              eventId: result.id,
              titulo: newEventTitulo,
              fecha: newEventFecha,
              tipoComida: newEventTipoComida
            });
            
            const notificarEvento = httpsCallable(functions, 'notificarNuevoEventoTemporal');
            const emailResult = await notificarEvento({
              eventId: result.id,
              titulo: newEventTitulo,
              fecha: newEventFecha,
              tipoComida: newEventTipoComida
            });
            
            console.log('✅ Notificación de nuevo evento enviada:', emailResult.data);
          } else {
            console.log('⚠️ Emails desactivados - no se envió notificación');
          }
        } catch (emailError) {
          console.error('❌ Error enviando notificación (no afecta la creación del evento):', emailError);
        }
      })();
      
      // Limpiar campos
      setNewEventTitulo('');
      setNewEventFecha('');
      setNewEventTipoComida('COMIDA');
      setNewEventFijo(false);
      setShowCreateEventModal(false);
      
      // Recargar eventos temporales
      await loadTemporaryEvents();
    } catch (err) {
      console.error('Error creando evento temporal:', err);
      alert('Error al crear el evento');
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeChange = (value) => {
    if (value === 'CREAR_EVENTO') {
      setShowCreateEventModal(true);
      setEventType('');
    } else {
      setEventType(value);
    }
  };

  const getEventDisplayName = (eventType) => {
    if (eventType.startsWith('TEMP_')) {
      const tempEventId = eventType.replace('TEMP_', '');
      const tempEvent = temporaryEvents.find(e => e.id === tempEventId);
      return tempEvent ? tempEvent.titulo : eventType;
    }
    return eventType;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!eventType) {
      alert('Por favor selecciona un tipo de evento');
      return;
    }

    // Validar evento temporal
    if (eventType.startsWith('TEMP_')) {
      if (!adultos || Number(adultos) === 0) {
        alert('Por favor indica al menos 1 adulto');
        return;
      }
    }

    setLoading(true);
    try {
      // Verificar si el usuario ya tiene una inscripción en este evento
      if (!editingId) {
        const existingRegistration = myRegistrations.find(
          reg => reg.eventType === eventType && 
                 reg.fecha === fecha && 
                 reg.tipoComida === tipoComida
        );
        if (existingRegistration) {
          alert('⚠️ Ya tienes una inscripción para este día y tipo de comida.\n\nPuedes editarla o borrarla desde la lista de "Mis Inscripciones" más abajo.');
          setLoading(false);
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          return;
        }
      }
      
      const registrationData = {
        uid: user.uid,
        userEmail: user.email,
        userName: profile?.name || user.email,
        userAlias: profile?.alias || '',
        eventType,
        fecha,
        adultos: Number(adultos),
        ninos: Number(ninos),
        tipoComida
      };

      if (editingId) {
        await updateEventRegistration(editingId, registrationData);
        alert('Inscripción actualizada correctamente');
        setEditingId(null);
      } else {
        await addEventRegistration(registrationData);
        alert('Inscripción registrada correctamente');
        
        // Enviar notificación por email en segundo plano (sin esperar)
        (async () => {
          try {
            // Verificar si los emails están activados
            const config = await getGlobalConfig();
            
            if (config.emailsEnabled !== false) {
              const userName = profile?.nombre || profile?.name || user?.email?.split('@')[0] || 'Usuario';
              const userEmail = user?.email || '';
              
              const notificarInscripcion = httpsCallable(functions, 'notificarInscripcionEventoGeneral');
                const result = await notificarInscripcion({
                  eventType,
                  userName,
                  userEmail,
                  adultos: adultos || 0,
                  ninos: ninos || 0,
                  fecha: fecha || ''
                });
                console.log('✅ Notificación de inscripción enviada:', result.data);
            } else {
              console.log('⚠️ Emails desactivados - no se envió notificación');
            }
          } catch (emailError) {
            console.error('❌ Error enviando notificación:', emailError);
            console.error('Detalles:', emailError.message, emailError.code);
          }
        })();
      }

      // Limpiar formulario
      setEventType('');
      setFecha('');
      setAdultos(1);
      setNinos(0);
      setTipoComida('COMIDA');
      
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
    setAdultos(reg.adultos || 1);
    setNinos(reg.ninos || 0);
    setTipoComida(reg.tipoComida || 'COMIDA');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenApuntarOtro = async () => {
    try {
      const users = await getAllSocios();
      // Excluir al propio usuario
      setApuntarUsuarios(users.filter(u => u.id !== user.uid));
      setApuntarSelectedUserId('');
      setShowApuntarOtroModal(true);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      alert('Error al cargar usuarios');
    }
  };

  const handleConfirmApuntarOtro = async () => {
    if (!apuntarSelectedUserId) { alert('Selecciona un usuario'); return; }
    const selectedUser = apuntarUsuarios.find(u => u.id === apuntarSelectedUserId);
    if (!selectedUser) return;

    setShowApuntarOtroModal(false);
    setLoading(true);
    try {
      const apuntadorAlias = profile?.alias || profile?.name || user.email;
      const registrationData = {
        uid: selectedUser.id,
        userEmail: selectedUser.email || '',
        userName: selectedUser.name || selectedUser.email || '',
        userAlias: selectedUser.alias || '',
        eventType,
        fecha,
        adultos: Number(adultos),
        ninos: Number(ninos),
        tipoComida,
        apuntadoPor: apuntadorAlias
      };
      await addEventRegistration(registrationData);
      alert(`✅ ${selectedUser.alias || selectedUser.name} apuntado correctamente de tu parte`);
      loadRegistrations();
    } catch (err) {
      console.error('Error apuntando usuario:', err);
      alert('Error al apuntar al usuario');
    } finally {
      setLoading(false);
    }
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
    setAdultos(1);
    setNinos(0);
    setTipoComida('COMIDA');
  };

  if (!user) {
    return <div style={{ padding: 20 }}>No autenticado</div>;
  }

  // Estilos comunes para inputs del formulario
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid #D4C9BC',
    borderRadius: 4,
    boxSizing: 'border-box',
    fontFamily: "'Lato', sans-serif",
    background: '#FFFFFF',
    color: '#2C1F14'
  };

  const selectStyle = {
    ...inputStyle,
    background: '#FFFFFF'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    color: '#8A7E72',
    textTransform: 'uppercase',
    letterSpacing: '0.6px'
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #E8DDD5' }}>
        <h2 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: '#2C1F14' }}>
          Eventos
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8A7E72' }}>Gestiona tus inscripciones</p>
      </div>

      {/* Formulario de inscripción */}
      <div style={{
        background: '#FFFFFF',
        padding: 22,
        borderRadius: 4,
        border: '1px solid #E8DDD5',
        boxShadow: '0 1px 4px rgba(44,31,20,0.07)',
        marginBottom: 28
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 18, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 19, fontWeight: 700, color: '#2C1F14', borderBottom: '1px solid #F0E8E0', paddingBottom: 12 }}>
          {editingId ? 'Editar inscripción' : 'Nueva inscripción'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tipo de evento */}
            <div>
              <label style={labelStyle}>Tipo de evento *</label>
              <select
                value={eventType}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                required
                style={selectStyle}
              >
                <option value="">-- Selecciona un evento --</option>
                {temporaryEvents.map(event => (
                  <option key={event.id} value={`TEMP_${event.id}`}>
                    {event.fijo ? '📌 ' : ''}{event.titulo} - {formatearFecha(event.fecha)} ({event.tipoComida})
                  </option>
                ))}
                <option value="" disabled style={{ borderTop: '2px solid #ccc', marginTop: '4px' }}>──────────────</option>
                <option value="CREAR_EVENTO" style={{ fontWeight: 'bold', color: '#8B6340' }}>
                  ➕ CREAR EVENTO
                </option>
              </select>
            </div>

            {/* Campos específicos según el tipo de evento */}

            {/* EVENTOS TEMPORALES: Fecha, Adultos y Niños */}
            {eventType.startsWith('TEMP_') && (
              <>
                {/* Mostrar tipo de evento (solo información, no editable) */}
                <div style={{
                  background: '#F5EFE8',
                  padding: 14,
                  borderRadius: 4,
                  border: '1px solid #D4C9BC',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 700, 
                    color: '#2C1F14',
                    fontFamily: "'Playfair Display', Georgia, serif"
                  }}>
                    {tipoComida === 'COMIDA' ? 'Comida' : 'Cena'}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#8A7E72',
                    marginTop: 4
                  }}>
                    Tipo de evento establecido
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    disabled
                    style={{
                      ...inputStyle,
                      background: '#F5EFE8',
                      cursor: 'not-allowed',
                      color: '#8A7E72'
                    }}
                  />
                  <div style={{ fontSize: 12, color: '#8A7E72', marginTop: 4 }}>
                    La fecha está establecida por el evento
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                      Adultos *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adultos}
                      onChange={(e) => setAdultos(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                      Niños
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ninos}
                      onChange={(e) => setNinos(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Botones - solo mostrar si hay evento seleccionado */}
            {eventType && (
              <>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '13px 24px',
                      fontSize: 15,
                      fontWeight: 700,
                      background: '#8B6340',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      letterSpacing: '0.3px'
                    }}
                  >
                    {loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Inscribirse')}
                  </button>
                  {!editingId && (
                    <button
                      type="button"
                      onClick={handleOpenApuntarOtro}
                      disabled={loading}
                      style={{
                        padding: '13px 16px',
                        fontSize: 14,
                        fontWeight: 700,
                        background: '#5C4228',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.3px'
                      }}
                    >
                      👤 Apuntar a otro de mi parte
                    </button>
                  )}
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      style={{
                        padding: '13px 24px',
                        fontSize: 15,
                        fontWeight: 600,
                        background: 'transparent',
                        color: '#8A7E72',
                        border: '1px solid #D4C9BC',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </form>
      </div>

      {/* MIS INSCRIPCIONES */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ marginBottom: 16, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#2C1F14', borderBottom: '1px solid #E8DDD5', paddingBottom: 10 }}>
          Mis inscripciones <span style={{ fontSize: 14, fontFamily: "'Lato', sans-serif", fontWeight: 400, color: '#8A7E72' }}>({myRegistrations.length})</span>
        </h3>
        
        {myRegistrations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            background: '#F5EFE8',
            borderRadius: 4,
            border: '1px solid #E8DDD5',
            color: '#8A7E72'
          }}>
            No tienes inscripciones todavía
          </div>
        ) : (() => {
          // Agrupar por tipo de evento
          const groupedByEvent = myRegistrations.reduce((acc, reg) => {
            if (!acc[reg.eventType]) {
              acc[reg.eventType] = [];
            }
            acc[reg.eventType].push(reg);
            return acc;
          }, {});

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(groupedByEvent).map(([eventType, registrations]) => {
                const isExpanded = expandedEvents[eventType];
                
                return (
                  <div key={eventType} style={{
                    background: '#FFFFFF',
                    borderRadius: 4,
                    border: '1px solid #E8DDD5',
                    boxShadow: '0 1px 3px rgba(44,31,20,0.06)',
                    overflow: 'hidden'
                  }}>
                    {/* Header colapsable */}
                    <div
                      onClick={() => setExpandedEvents(prev => ({
                        ...prev,
                        [eventType]: !prev[eventType]
                      }))}
                      style={{
                        padding: '14px 16px',
                        background: '#2C1F14',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 16, opacity: 0.6 }}>{isExpanded ? '▾' : '▸'}</span>
                        <div>
                          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 16 }}>{getEventDisplayName(eventType)}</div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {registrations.length} inscripción{registrations.length !== 1 ? 'es' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido expandible */}
                    {isExpanded && (
                      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {registrations.map(reg => (
                          <div
                            key={reg.id}
                            style={{
                              background: '#FAF8F5',
                              padding: '14px 16px',
                              borderRadius: 4,
                              borderLeft: '2px solid #D4C9BC',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 16
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              {/* Datos de la inscripción */}
                              <div style={{ fontSize: 13, color: '#8A7E72', marginBottom: 3 }}>
                                {reg.fecha}
                              </div>
                              <div style={{ fontSize: 14, color: '#8A7E72' }}>
                                {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} · {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                              </div>
                              {reg.tipoComida && (
                                <div style={{ 
                                  fontSize: 13, 
                                  fontWeight: 700, 
                                  color: '#8B6340',
                                  marginTop: 6
                                }}>
                                  {reg.tipoComida === 'COMIDA' ? 'Comida' : 'Cena'}
                                </div>
                              )}

                              {/* Apuntado por */}
                              {reg.apuntadoPor && (
                                <div style={{ fontSize: 12, color: '#8A7E72', marginTop: 6, fontStyle: 'italic' }}>
                                  Apuntado por {reg.apuntadoPor}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleEdit(reg)}
                                style={{
                                  padding: '7px 14px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  background: 'transparent',
                                  color: '#8B6340',
                                  border: '1px solid #D4C9BC',
                                  borderRadius: 4,
                                  cursor: 'pointer'
                                }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(reg.id)}
                                style={{
                                  padding: '7px 14px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  background: '#c0392b',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 4,
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
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Modal para crear evento temporal */}
      {showCreateEventModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 4,
            padding: 24,
            maxWidth: 500,
            width: '90%',
            border: '1px solid #E8DDD5',
            boxShadow: '0 8px 32px rgba(44,31,20,0.18)'
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: 20,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 20, 
              fontWeight: 700,
              color: '#2C1F14',
              borderBottom: '1px solid #F0E8E0',
              paddingBottom: 12
            }}>
              Crear Nuevo Evento
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Título del evento *</label>
              <input
                type="text"
                value={newEventTitulo}
                onChange={(e) => setNewEventTitulo(e.target.value)}
                placeholder="Ej: Cena de San Valentín"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Fecha *</label>
              <input
                type="date"
                value={newEventFecha}
                onChange={(e) => setNewEventFecha(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Tipo *</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setNewEventTipoComida('COMIDA')}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    background: newEventTipoComida === 'COMIDA' ? '#8B6340' : '#F5EFE8',
                    color: newEventTipoComida === 'COMIDA' ? '#fff' : '#8A7E72',
                    border: newEventTipoComida === 'COMIDA' ? '2px solid #5C4228' : '1px solid #D4C9BC',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.3px'
                  }}
                >
                  COMIDA
                </button>
                <button
                  type="button"
                  onClick={() => setNewEventTipoComida('CENA')}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    background: newEventTipoComida === 'CENA' ? '#2C1F14' : '#F5EFE8',
                    color: newEventTipoComida === 'CENA' ? '#fff' : '#8A7E72',
                    border: newEventTipoComida === 'CENA' ? '2px solid #1A1210' : '1px solid #D4C9BC',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.3px'
                  }}
                >
                  CENA
                </button>
              </div>
            </div>

            {/* Toggle evento fijo */}
            <div
              onClick={() => setNewEventFijo(!newEventFijo)}
              style={{
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                border: `1px solid ${newEventFijo ? '#8B6340' : '#D4C9BC'}`,
                background: newEventFijo ? '#F5EFE8' : '#FAF8F5',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: newEventFijo ? '#8B6340' : '#D4C9BC',
                position: 'relative',
                transition: 'background 0.2s ease',
                flexShrink: 0
              }}>
                <div style={{
                  position: 'absolute',
                  top: 3,
                  left: newEventFijo ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: newEventFijo ? '#5C4228' : '#2C1F14' }}>
                  {newEventFijo ? '📌 Evento fijo' : '🕐 Evento temporal'}
                </div>
                <div style={{ fontSize: 12, color: '#8A7E72', marginTop: 2 }}>
                  {newEventFijo
                    ? 'El evento permanece siempre. Solo se pueden borrar sus inscritos.'
                    : 'El evento puede eliminarse cuando finalice.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateEventModal(false);
                  setNewEventTitulo('');
                  setNewEventFecha('');
                  setNewEventTipoComida('COMIDA');
                  setNewEventFijo(false);
                  setNewEventTipoComida('COMIDA');
                }}
                style={{
                  padding: '9px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'transparent',
                  color: '#8A7E72',
                  border: '1px solid #D4C9BC',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTemporaryEvent}
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: loading ? '#C8BBA8' : '#8B6340',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creando...' : 'Crear Evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apuntar a otro de mi parte */}
      {showApuntarOtroModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#FFFFFF', padding: 28, borderRadius: 4,
            border: '1px solid #E8DDD5',
            boxShadow: '0 8px 32px rgba(44,31,20,0.16)', maxWidth: 420,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 19, fontWeight: 700, color: '#2C1F14', borderBottom: '1px solid #F0E8E0', paddingBottom: 10 }}>
              Apuntar a otro socio
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#8A7E72' }}>
              La inscripción quedará a nombre del usuario seleccionado, con una nota indicando que la hiciste tú.
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 11, color: '#8A7E72', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Usuario</label>
              <select
                value={apuntarSelectedUserId}
                onChange={(e) => setApuntarSelectedUserId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '1px solid #D4C9BC', borderRadius: 4, background: '#FFFFFF', boxSizing: 'border-box', fontFamily: "'Lato', sans-serif", color: '#2C1F14' }}
              >
                <option value="">-- Selecciona un usuario --</option>
                {apuntarUsuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.alias || u.name || u.email}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setShowApuntarOtroModal(false)}
                style={{ padding: '9px 20px', background: 'transparent', color: '#8A7E72', border: '1px solid #D4C9BC', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApuntarOtro}
                style={{ padding: '9px 20px', background: '#8B6340', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px' }}
              >
                Apuntar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
