// src/pages/Eventos.jsx
import React, { useState, useEffect } from 'react';
import { addEventRegistration, getUserEventRegistrations, getAllEventRegistrations, updateEventRegistration, deleteEventRegistration, deleteAllEventRegistrationsByType, getGlobalConfig, addTemporaryEvent, getTemporaryEvents, getAllSocios } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

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
  const [tipoComida, setTipoComida] = useState('COMIDA');
  const [tipoEventoConfig, setTipoEventoConfig] = useState('CENA');
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

  // Establecer fecha por defecto para FIESTAS DE ESTELLA (agosto del año actual)
  useEffect(() => {
    if (eventType === 'FIESTAS DE ESTELLA' && !editingId && !fecha) {
      const currentYear = new Date().getFullYear();
      const defaultDate = `${currentYear}-08-01`; // 1 de agosto del año actual
      setFecha(defaultDate);
    }
    
    // Establecer fecha y tipo de comida para eventos temporales
    if (eventType.startsWith('TEMP_') && !editingId) {
      const tempEventId = eventType.replace('TEMP_', '');
      const tempEvent = temporaryEvents.find(e => e.id === tempEventId);
      if (tempEvent) {
        setFecha(tempEvent.fecha);
        setTipoComida(tempEvent.tipoComida);
      }
    }
  }, [eventType, temporaryEvents]);

  // Cargar todas las inscripciones y fecha de próxima cena
  useEffect(() => {
    if (user?.uid) {
      loadRegistrations();
      loadFechaProximaCena();
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

  const loadFechaProximaCena = async () => {
    try {
      const { getEventConfig } = await import('../firebase');
      const config = await getEventConfig('CUMPLEAÑOS MES');
      if (config?.fechaCena) {
        setFechaProximaCena(config.fechaCena);
      }
      if (config?.tipoComida) {
        setTipoEventoConfig(config.tipoComida);
      }
    } catch (err) {
      console.error('Error cargando fecha de cena:', err);
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
        tipoComida: newEventTipoComida
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
    } else if (eventType.startsWith('TEMP_')) {
      // Validación para eventos temporales
      if (!adultos || Number(adultos) === 0) {
        alert('Por favor indica al menos 1 adulto');
        return;
      }
    }

    setLoading(true);
    try {
      // Verificar si el usuario ya tiene una inscripción en este evento (excepto RESERVAR MESA)
      if (!editingId && eventType !== 'RESERVAR MESA') {
        // Para FIESTAS DE ESTELLA y eventos temporales: solo bloquear si existe inscripción del mismo día Y tipo de comida
        if (eventType === 'FIESTAS DE ESTELLA' || eventType.startsWith('TEMP_')) {
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
        } else {
          // Para otros eventos: bloquear si ya existe cualquier inscripción
          const existingRegistration = myRegistrations.find(reg => reg.eventType === eventType);
          if (existingRegistration) {
            alert('⚠️ Ya tienes una inscripción en este evento.\n\nPuedes editarla o borrarla desde la lista de "Mis Inscripciones" más abajo.');
            setLoading(false);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            return;
          }
        }
      }
      
      const registrationData = {
        uid: user.uid,
        userEmail: user.email,
        userName: profile?.name || user.email,
        userAlias: profile?.alias || '',
        eventType,
        fecha: ['LOTERIA NAVIDAD', 'CUMPLEAÑOS MES'].includes(eventType) ? null : fecha,
        hora: hora || null,
        adultos: ['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(eventType) || eventType.startsWith('TEMP_') ? Number(adultos) : 0,
        ninos: ['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(eventType) || eventType.startsWith('TEMP_') ? Number(ninos) : 0,
        comensales: eventType === 'RESERVAR MESA' ? Number(comensales) : 0,
        observaciones: eventType === 'RESERVAR MESA' ? observaciones : '',
        decimos: eventType === 'LOTERIA NAVIDAD' ? Number(decimos) : 0,
        diaSemana: eventType === 'FIESTAS DE ESTELLA' ? getDayOfWeek(fecha) : '',
        tipoComida: eventType === 'CUMPLEAÑOS MES' ? tipoEventoConfig : (eventType === 'FIESTAS DE ESTELLA' || eventType.startsWith('TEMP_') ? tipoComida : '')
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
              
              if (eventType === 'RESERVAR MESA') {
                console.log('📧 Enviando notificación de reserva de mesa...', {
                  userName,
                  userEmail,
                  fecha,
                  hora,
                  comensales,
                  observaciones
                });
                
                const notificarReserva = httpsCallable(functions, 'notificarReservaMesa');
                const result = await notificarReserva({
                  userName,
                  userEmail,
                  fecha,
                  hora,
                  comensales,
                  observaciones
                });
                
                console.log('✅ Notificación de reserva enviada:', result.data);
              } else {
                // Para otros eventos (CUMPLEAÑOS MES, FIESTAS DE ESTELLA, eventos temporales, etc.)
                console.log('📧 Enviando notificación de inscripción a evento...', {
                  eventType,
                  userName,
                  userEmail
                });
                
                const notificarInscripcion = httpsCallable(functions, 'notificarInscripcionEventoGeneral');
                const result = await notificarInscripcion({
                  eventType,
                  userName,
                  userEmail,
                  adultos: adultos || 0,
                  ninos: ninos || 0,
                  decimos: decimos || 0,
                  fecha: fecha || '',
                  diaSemana: getDayOfWeek(fecha) || ''
                });
                
                console.log('✅ Notificación de inscripción enviada:', result.data);
              }
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
      setHora('');
      setAdultos(1);
      setNinos(0);
      setObservaciones('');
      setComensales(1);
      setDecimos(1);
      setTextoCena('');
      setTipoComida('CENA');
      
      // Recargar lista y configuración
      loadRegistrations();
      if (eventType === 'CUMPLEAÑOS MES') {
        loadFechaProximaCena();
      }
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
    setTipoComida(reg.tipoComida || 'CENA');
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
        fecha: ['LOTERIA NAVIDAD', 'CUMPLEAÑOS MES'].includes(eventType) ? null : fecha,
        hora: hora || null,
        adultos: ['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(eventType) || eventType.startsWith('TEMP_') ? Number(adultos) : 0,
        ninos: ['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(eventType) || eventType.startsWith('TEMP_') ? Number(ninos) : 0,
        comensales: eventType === 'RESERVAR MESA' ? Number(comensales) : 0,
        observaciones: eventType === 'RESERVAR MESA' ? observaciones : '',
        decimos: eventType === 'LOTERIA NAVIDAD' ? Number(decimos) : 0,
        diaSemana: eventType === 'FIESTAS DE ESTELLA' ? getDayOfWeek(fecha) : '',
        tipoComida: eventType === 'CUMPLEAÑOS MES' ? tipoEventoConfig : (eventType === 'FIESTAS DE ESTELLA' || eventType.startsWith('TEMP_') ? tipoComida : ''),
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
    setHora('');
    setAdultos(1);
    setNinos(0);
    setObservaciones('');
    setComensales(1);
    setDecimos(1);
    setTextoCena('');
    setTipoComida('CENA');
  };

  if (!user) {
    return <div style={{ padding: 20 }}>No autenticado</div>;
  }

  // Estilos comunes para inputs del formulario
  const inputStyle = {
    width: '100%',
    padding: '12px',
    fontSize: 15,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    boxSizing: 'border-box'
  };

  const selectStyle = {
    ...inputStyle,
    background: '#fff'
  };

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
                onChange={(e) => handleEventTypeChange(e.target.value)}
                required
                style={selectStyle}
              >
                <option value="">-- Selecciona un evento --</option>
                {EVENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
                <option value="" disabled style={{ borderTop: '2px solid #ccc', marginTop: '4px' }}>──────────────</option>
                {temporaryEvents.map(event => (
                  <option key={event.id} value={`TEMP_${event.id}`}>
                    {event.titulo} - {formatearFecha(event.fecha)} ({event.tipoComida})
                  </option>
                ))}
                <option value="" disabled style={{ borderTop: '2px solid #ccc', marginTop: '4px' }}>──────────────</option>
                <option value="CREAR_EVENTO" style={{ fontWeight: 'bold', color: '#059669' }}>
                  ➕ CREAR EVENTO
                </option>
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
                    style={inputStyle}
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
                    style={inputStyle}
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
                      ...inputStyle,
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
                    onBlur={(e) => {
                      if (e.target.value === '' || Number(e.target.value) < 1) {
                        setComensales('');
                      }
                    }}
                    required
                    style={inputStyle}
                  />
                </div>
              </>
            )}

            {/* CUMPLEAÑOS MES: Solo comensales */}
            {eventType === 'CUMPLEAÑOS MES' && (
              <>
                <div style={{
                  padding: 16,
                  background: fechaProximaCena && !isFechaPassada(fechaProximaCena) ? '#dbeafe' : '#fee2e2',
                  borderRadius: 8,
                  border: fechaProximaCena && !isFechaPassada(fechaProximaCena) ? '2px solid #3b82f6' : '2px solid #ef4444',
                  marginBottom: 16
                }}>
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 700, 
                    color: fechaProximaCena && !isFechaPassada(fechaProximaCena) ? '#1e40af' : '#991b1b', 
                    marginBottom: 8 
                  }}>
                    📅 PRÓXIMO EVENTO:
                  </div>
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 700,
                    color: tipoEventoConfig === 'COMIDA' ? '#d97706' : '#2563eb',
                    marginBottom: 6
                  }}>
                    {tipoEventoConfig === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                  </div>
                  <div style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: fechaProximaCena && !isFechaPassada(fechaProximaCena) ? '#1e3a8a' : '#7f1d1d' 
                  }}>
                    {fechaProximaCena && !isFechaPassada(fechaProximaCena) 
                      ? formatearFecha(fechaProximaCena)
                      : (fechaProximaCena && isFechaPassada(fechaProximaCena) 
                          ? `SIGUIENTE EVENTO AUN SIN PLANIFICAR` 
                          : 'NO HAY FECHA ESTABLECIDA')}
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
                      onBlur={(e) => {
                        if (e.target.value === '' || Number(e.target.value) < 0) {
                          setAdultos('');
                        }
                      }}
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
                      onBlur={(e) => {
                        if (e.target.value === '' || Number(e.target.value) < 0) {
                          setNinos('');
                        }
                      }}
                      style={inputStyle}
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
                        borderRadius: 8,
                        boxSizing: 'border-box'
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
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                      Adultos
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adultos}
                      onChange={(e) => setAdultos(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value === '' || Number(e.target.value) < 0) {
                          setAdultos('');
                        }
                      }}
                      style={inputStyle}
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
                      style={inputStyle}
                    />
                  </div>
                </div>
                {/* Selector de Comida/Cena */}
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
                    Tipo de evento *
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setTipoComida('COMIDA')}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        fontSize: 15,
                        fontWeight: 700,
                        background: tipoComida === 'COMIDA' 
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                          : '#e5e7eb',
                        color: tipoComida === 'COMIDA' ? '#fff' : '#6b7280',
                        border: tipoComida === 'COMIDA' ? '3px solid #b45309' : '2px solid #d1d5db',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: tipoComida === 'COMIDA' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                      }}
                    >
                      🌞 COMIDA
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoComida('CENA')}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        fontSize: 15,
                        fontWeight: 700,
                        background: tipoComida === 'CENA' 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                          : '#e5e7eb',
                        color: tipoComida === 'CENA' ? '#fff' : '#6b7280',
                        border: tipoComida === 'CENA' ? '3px solid #1d4ed8' : '2px solid #d1d5db',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: tipoComida === 'CENA' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                      }}
                    >
                      🌙 CENA
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* FERIAS: Adultos y Niños */}
            {eventType === 'FERIAS' && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                    Adultos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adultos}
                    onChange={(e) => setAdultos(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value === '' || Number(e.target.value) < 0) {
                        setAdultos('');
                      }
                    }}
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
                    onBlur={(e) => {
                      if (e.target.value === '' || Number(e.target.value) < 0) {
                        setNinos('');
                      }
                    }}
                    style={inputStyle}
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
                  onBlur={(e) => {
                    if (e.target.value === '' || Number(e.target.value) < 1) {
                      setDecimos('');
                    }
                  }}
                  required
                  style={inputStyle}
                />
              </div>
            )}

            {/* COTILLON DE REYES: Adultos y Niños */}
            {eventType === 'COTILLON DE REYES' && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                    Adultos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adultos}
                    onChange={(e) => setAdultos(e.target.value)}
                    onBlur={(e) => {
                      if (e.target.value === '' || Number(e.target.value) < 0) {
                        setAdultos('');
                      }
                    }}
                    style={inputStyle}
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
                    onBlur={(e) => {
                      if (e.target.value === '' || Number(e.target.value) < 0) {
                        setNinos('');
                      }
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* EVENTOS TEMPORALES: Fecha, Adultos y Niños */}
            {eventType.startsWith('TEMP_') && (
              <>
                {/* Mostrar tipo de evento (solo información, no editable) */}
                <div style={{
                  background: tipoComida === 'COMIDA' 
                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                    : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  padding: 16,
                  borderRadius: 12,
                  border: tipoComida === 'COMIDA' ? '2px solid #f59e0b' : '2px solid #3b82f6',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: tipoComida === 'COMIDA' ? '#92400e' : '#1e3a8a' 
                  }}>
                    {tipoComida === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: tipoComida === 'COMIDA' ? '#78350f' : '#1e40af',
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
                      background: '#f3f4f6',
                      cursor: 'not-allowed',
                      color: '#6b7280'
                    }}
                  />
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
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
                  {!editingId && eventType !== 'RESERVAR MESA' && eventType !== 'LOTERIA NAVIDAD' && (
                    <button
                      type="button"
                      onClick={handleOpenApuntarOtro}
                      disabled={loading}
                      style={{
                        padding: '14px 20px',
                        fontSize: 15,
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        whiteSpace: 'nowrap'
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
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                  }}>
                    {/* Header colapsable */}
                    <div
                      onClick={() => setExpandedEvents(prev => ({
                        ...prev,
                        [eventType]: !prev[eventType]
                      }))}
                      style={{
                        padding: 16,
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>{isExpanded ? '▼' : '▶'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{getEventDisplayName(eventType)}</div>
                          <div style={{ fontSize: 13, opacity: 0.9 }}>
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
                              background: '#f9fafb',
                              padding: 16,
                              borderRadius: 8,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 16
                            }}
                          >
                            <div style={{ flex: 1 }}>
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
                                <>
                                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                                    👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                                  </div>
                                  {reg.tipoComida && (
                                    <div style={{ 
                                      fontSize: 13, 
                                      fontWeight: 700, 
                                      color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#2563eb',
                                      marginTop: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      {reg.tipoComida === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                                    </div>
                                  )}
                                </>
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
                                  {reg.tipoComida && (
                                    <div style={{ 
                                      fontSize: 13, 
                                      fontWeight: 700, 
                                      color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#2563eb',
                                      marginTop: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      {reg.tipoComida === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                                    </div>
                                  )}
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

                              {/* EVENTOS TEMPORALES */}
                              {reg.eventType.startsWith('TEMP_') && (
                                <>
                                  <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                                    📅 {reg.fecha}
                                  </div>
                                  <div style={{ fontSize: 14, color: '#6b7280' }}>
                                    👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                                  </div>
                                  {reg.tipoComida && (
                                    <div style={{ 
                                      fontSize: 13, 
                                      fontWeight: 700, 
                                      color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#2563eb',
                                      marginTop: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}>
                                      {reg.tipoComida === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Apuntado por */}
                              {reg.apuntadoPor && (
                                <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 6, fontStyle: 'italic' }}>
                                  👤 Apuntado por {reg.apuntadoPor}
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
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: 20, 
              fontSize: 20, 
              fontWeight: 700,
              color: '#059669'
            }}>
              ➕ Crear Nuevo Evento
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Título del evento *
              </label>
              <input
                type="text"
                value={newEventTitulo}
                onChange={(e) => setNewEventTitulo(e.target.value)}
                placeholder="Ej: Cena de San Valentín"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                Fecha *
              </label>
              <input
                type="date"
                value={newEventFecha}
                onChange={(e) => setNewEventFecha(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
                Tipo *
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setNewEventTipoComida('COMIDA')}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    fontSize: 15,
                    fontWeight: 700,
                    background: newEventTipoComida === 'COMIDA' 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                      : '#e5e7eb',
                    color: newEventTipoComida === 'COMIDA' ? '#fff' : '#6b7280',
                    border: newEventTipoComida === 'COMIDA' ? '3px solid #b45309' : '2px solid #d1d5db',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: newEventTipoComida === 'COMIDA' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                  }}
                >
                  🌞 COMIDA
                </button>
                <button
                  type="button"
                  onClick={() => setNewEventTipoComida('CENA')}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    fontSize: 15,
                    fontWeight: 700,
                    background: newEventTipoComida === 'CENA' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : '#e5e7eb',
                    color: newEventTipoComida === 'CENA' ? '#fff' : '#6b7280',
                    border: newEventTipoComida === 'CENA' ? '3px solid #1d4ed8' : '2px solid #d1d5db',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: newEventTipoComida === 'CENA' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  🌙 CENA
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateEventModal(false);
                  setNewEventTitulo('');
                  setNewEventFecha('');
                  setNewEventTipoComida('COMIDA');
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTemporaryEvent}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
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
            background: '#fff', padding: 32, borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxWidth: 420,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: '#111827' }}>
              👤 Apuntar a otro de mi parte
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#6b7280' }}>
              La inscripción quedará a nombre del usuario seleccionado, con una nota indicando que la hiciste tú.
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>Usuario</label>
              <select
                value={apuntarSelectedUserId}
                onChange={(e) => setApuntarSelectedUserId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 15, border: '2px solid #d1d5db', borderRadius: 8, background: '#fff', boxSizing: 'border-box' }}
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
                style={{ padding: '10px 20px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmApuntarOtro}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                ✅ Apuntar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
