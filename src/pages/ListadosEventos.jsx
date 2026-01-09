// src/pages/Listados.jsx
import React, { useState, useEffect } from 'react';
import { getAllEventRegistrations, deleteAllEventRegistrationsByType, getTemporaryEvents, deleteTemporaryEvent } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

// Hook para detectar tamaño de pantalla
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
};

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

export default function Listados({ user }) {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiestaDay, setSelectedFiestaDay] = useState('VIERNES DE GIGANTES');
  const [selectedTipoComida, setSelectedTipoComida] = useState('COMIDA');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showModalFechaCena, setShowModalFechaCena] = useState(false);
  const [nuevaFechaCena, setNuevaFechaCena] = useState('');
  const [nuevoTipoComida, setNuevoTipoComida] = useState('CENA');
  
  // Estados para eventos temporales
  const [temporaryEvents, setTemporaryEvents] = useState([]);
  const [showDeleteTempEventModal, setShowDeleteTempEventModal] = useState(false);
  const [tempEventToDelete, setTempEventToDelete] = useState(null);
  const [tempEventPassword, setTempEventPassword] = useState('');
  
  const nav = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user?.uid) {
      loadRegistrations();
      loadTemporaryEvents();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      let filtered = allRegistrations.filter(reg => reg.eventType === selectedEvent);
      
      // Filtrar por día seleccionado si es FIESTAS DE ESTELLA (excepto LISTA TOTAL)
      if (selectedEvent === 'FIESTAS DE ESTELLA' && selectedFiestaDay && selectedFiestaDay !== 'LISTA TOTAL') {
        // Convertir el día seleccionado para comparar
        let dayToMatch = '';
        if (selectedFiestaDay === 'VIERNES DE GIGANTES') {
          dayToMatch = 'Viernes';
        } else {
          // Convertir "SÁBADO" a "Sábado", "DOMINGO" a "Domingo", etc.
          dayToMatch = selectedFiestaDay.charAt(0).toUpperCase() + selectedFiestaDay.slice(1).toLowerCase();
        }
        filtered = filtered.filter(reg => reg.diaSemana === dayToMatch);
      }
      
      // Si es LISTA TOTAL, ordenar por día de la semana
      if (selectedEvent === 'FIESTAS DE ESTELLA' && selectedFiestaDay === 'LISTA TOTAL') {
        const dayOrder = ['Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves'];
        filtered = filtered.sort((a, b) => {
          const dayA = dayOrder.indexOf(a.diaSemana || '');
          const dayB = dayOrder.indexOf(b.diaSemana || '');
          return dayA - dayB;
        });
      }
      
      // Filtrar por tipo de comida si es FIESTAS DE ESTELLA (excepto LISTA TOTAL)
      if (selectedEvent === 'FIESTAS DE ESTELLA' && selectedTipoComida && selectedFiestaDay !== 'LISTA TOTAL') {
        filtered = filtered.filter(reg => reg.tipoComida === selectedTipoComida);
      }
      
      setFilteredRegistrations(filtered);
    } else {
      setFilteredRegistrations([]);
    }
  }, [selectedEvent, allRegistrations, selectedFiestaDay, selectedTipoComida]);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const data = await getAllEventRegistrations();
      setAllRegistrations(data);
    } catch (err) {
      console.error('Error cargando inscripciones:', err);
    } finally {
      setLoading(false);
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

  const handleDeleteTempEvent = (event) => {
    setTempEventToDelete(event);
    setTempEventPassword('');
    setShowDeleteTempEventModal(true);
  };

  const confirmDeleteTempEvent = async () => {
    if (tempEventPassword !== '123456') {
      alert('❌ Contraseña incorrecta');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres borrar el evento "${tempEventToDelete.titulo}"?\n\nEsto eliminará todas las inscripciones asociadas.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteTemporaryEvent(tempEventToDelete.id);
      alert(`✅ Evento "${tempEventToDelete.titulo}" eliminado correctamente.\n${result.registrationsDeleted} inscripciones eliminadas.`);
      
      // Recargar datos
      await loadTemporaryEvents();
      await loadRegistrations();
      
      // Si el evento eliminado era el seleccionado, limpiar selección
      if (selectedEvent === `TEMP_${tempEventToDelete.id}`) {
        setSelectedEvent('');
      }
      
      setShowDeleteTempEventModal(false);
      setTempEventToDelete(null);
      setTempEventPassword('');
    } catch (err) {
      console.error('Error eliminando evento temporal:', err);
      alert('❌ Error al eliminar el evento');
    } finally {
      setLoading(false);
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

  const calculateTotals = () => {
    if (!filteredRegistrations.length) return null;

    let totalAdultos = 0;
    let totalNinos = 0;
    let totalComensales = 0;
    let totalDecimos = 0;
    let totalInscripciones = filteredRegistrations.length;
    
    // Para FIESTAS DE ESTELLA: desglose por tipo de comida
    let totalesComida = {
      adultos: 0,
      ninos: 0,
      total: 0
    };
    let totalesCena = {
      adultos: 0,
      ninos: 0,
      total: 0
    };

    filteredRegistrations.forEach(reg => {
      totalAdultos += reg.adultos || 0;
      totalNinos += reg.ninos || 0;
      totalComensales += reg.comensales || 0;
      totalDecimos += reg.decimos || 0;
      
      // Desglose por tipo de comida para FIESTAS DE ESTELLA y eventos temporales
      if ((selectedEvent === 'FIESTAS DE ESTELLA' || selectedEvent.startsWith('TEMP_')) && reg.tipoComida) {
        const adultos = reg.adultos || 0;
        const ninos = reg.ninos || 0;
        if (reg.tipoComida === 'COMIDA') {
          totalesComida.adultos += adultos;
          totalesComida.ninos += ninos;
          totalesComida.total += adultos + ninos;
        } else if (reg.tipoComida === 'CENA') {
          totalesCena.adultos += adultos;
          totalesCena.ninos += ninos;
          totalesCena.total += adultos + ninos;
        }
      }
    });

    const totalGeneral = totalAdultos + totalNinos;

    return {
      totalInscripciones,
      totalAdultos,
      totalNinos,
      totalGeneral,
      totalComensales,
      totalDecimos,
      totalesComida,
      totalesCena
    };
  };

  // Función especial para CUMPLEAÑOS MES (pide contraseña, luego fecha y envía emails)
  const handleBorrarCumpleanosMes = () => {
    // Mostrar modal de contraseña
    setPassword('');
    setShowPasswordModal(true);
  };

  const confirmarPasswordCumpleanosMes = () => {
    // Verificar contraseña
    if (password !== '123456') {
      alert('❌ Contraseña incorrecta');
      setShowPasswordModal(false);
      setPassword('');
      return;
    }

    // Cerrar modal de contraseña
    setShowPasswordModal(false);
    setPassword('');

    // Confirmar acción
    if (!confirm('¿Estás seguro de borrar TODAS las inscripciones de CUMPLEAÑOS MES?')) {
      return;
    }
    
    // Mostrar modal para seleccionar fecha y tipo de comida
    setNuevaFechaCena('');
    setNuevoTipoComida('CENA');
    setShowModalFechaCena(true);
  };

  const confirmarBorradoCumpleanosConFecha = async () => {
    if (!nuevaFechaCena) {
      alert('Debes seleccionar una fecha para la ' + nuevoTipoComida.toLowerCase());
      return;
    }

    if (!confirm('¿Estás seguro de borrar TODAS las inscripciones de CUMPLEAÑOS MES?')) {
      return;
    }

    setLoading(true);
    try {
      const { setEventConfig } = await import('../firebase');
      
      // Guardar la fecha y tipo de comida
      await setEventConfig('CUMPLEAÑOS MES', { fechaCena: nuevaFechaCena, tipoComida: nuevoTipoComida });
      
      // Borrar todas las inscripciones
      const count = await deleteAllEventRegistrationsByType('CUMPLEAÑOS MES');
      
      // Cerrar modal
      setShowModalFechaCena(false);
      setNuevaFechaCena('');
      setNuevoTipoComida('CENA');
      
      const formatearFecha = (fecha) => {
        const [year, month, day] = fecha.split('-');
        return `${day}/${month}/${year}`;
      };

      alert(`Se han eliminado ${count} inscripciones.\nPróximo ${nuevoTipoComida.toLowerCase()}: ${formatearFecha(nuevaFechaCena)}`);
      
      // Enviar notificaciones por email (en segundo plano)
      try {
        const { getGlobalConfig } = await import('../firebase');
        const config = await getGlobalConfig();
        
        if (config.emailsEnabled !== false) {
          const notificarFechaCena = httpsCallable(functions, 'notificarFechaCena');
          notificarFechaCena({
            eventType: 'CUMPLEAÑOS MES',
            fechaCena: nuevaFechaCena,
            tipoComida: nuevoTipoComida
          })
            .then(result => {
              console.log('Resultado envío de emails:', result.data);
              alert(`✅ ${result.data.message}`);
            })
            .catch(err => {
              console.error('Error enviando emails:', err);
              alert(`⚠️ Error al enviar algunos emails: ${err.message}`);
            });
        } else {
          console.log('⚠️ Emails desactivados - no se enviaron notificaciones');
        }
      } catch (err) {
        console.error('Error verificando configuración de emails:', err);
      }
      
      loadRegistrations();
    } catch (err) {
      console.error('Error borrando inscripciones:', err);
      alert('Error al borrar las inscripciones: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Función para otros eventos (pide contraseña)
  const handleDeleteAllRegistrations = () => {
    if (!selectedEvent) return;

    // Mostrar modal de contraseña
    setPassword('');
    setShowPasswordModal(true);
  };

  const confirmDeleteWithPassword = async () => {
    if (!password) {
      alert('⚠️ Debes introducir la contraseña');
      return;
    }

    // Cerrar modal
    setShowPasswordModal(false);

    // Confirmar acción
    const confirmDelete = window.confirm(
      `⚠️ ATENCIÓN: Se van a borrar TODAS las ${filteredRegistrations.length} inscripciones de ${selectedEvent}.\n\n¿Estás seguro de continuar?`
    );
    
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const functions = getFunctions();
      const borrarInscripcionesEvento = httpsCallable(functions, 'borrarInscripcionesEvento');
      
      const result = await borrarInscripcionesEvento({
        eventType: selectedEvent,
        password: password
      });

      if (result.data.success) {
        alert(`✅ ${result.data.message}`);
        // Recargar datos
        await loadRegistrations();
      }
    } catch (error) {
      console.error('Error al borrar inscripciones:', error);
      if (error.code === 'functions/permission-denied') {
        alert('❌ Contraseña incorrecta');
      } else {
        alert('❌ Error al borrar inscripciones: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  if (!user) {
    return <div style={{ padding: 20 }}>No autenticado</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700, color: '#111827' }}>
        📊 Listados de Eventos
      </h2>

      {/* Selector de evento */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 32
      }}>
        <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 16 }}>
          Selecciona un evento:
        </label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: 16,
            border: '2px solid #d1d5db',
            borderRadius: 8,
            background: '#fff',
            fontWeight: 600
          }}
        >
          <option value="">-- Selecciona un evento --</option>
          {EVENT_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
          {temporaryEvents.length > 0 && (
            <>
              <option value="" disabled style={{ borderTop: '2px solid #ccc', marginTop: '4px' }}>──────────────</option>
              <option value="" disabled style={{ fontWeight: 'bold' }}>EVENTOS TEMPORALES:</option>
              {temporaryEvents.map(event => (
                <option key={event.id} value={`TEMP_${event.id}`}>
                  {event.titulo} - {event.fecha} ({event.tipoComida})
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Botón de borrar evento temporal */}
      {selectedEvent && selectedEvent.startsWith('TEMP_') && (
        <div style={{
          background: '#fee2e2',
          padding: 20,
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: 32,
          border: '2px solid #fca5a5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                ⚠️ Evento Temporal
              </div>
              <div style={{ fontSize: 14, color: '#7f1d1d' }}>
                Este evento puede ser eliminado una vez finalizado
              </div>
            </div>
            <button
              onClick={() => {
                const event = temporaryEvents.find(e => `TEMP_${e.id}` === selectedEvent);
                if (event) handleDeleteTempEvent(event);
              }}
              style={{
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.3)';
              }}
            >
              🗑️ Borrar Evento
            </button>
          </div>
        </div>
      )}

      {/* Selector de día para FIESTAS DE ESTELLA */}
      {selectedEvent === 'FIESTAS DE ESTELLA' && (
        <div style={{
          background: '#fff',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: 32
        }}>
          <label style={{ display: 'block', marginBottom: 16, fontWeight: 600, fontSize: 16, color: '#374151' }}>
            Selecciona el día:
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12
          }}>
            {['VIERNES DE GIGANTES', 'SÁBADO', 'DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'LISTA TOTAL'].map(day => (
              <label
                key={day}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  background: selectedFiestaDay === day 
                    ? (day === 'LISTA TOTAL' 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                        : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)') 
                    : '#f9fafb',
                  color: selectedFiestaDay === day ? '#fff' : '#374151',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: day === 'LISTA TOTAL' ? 700 : 600,
                  fontSize: 14,
                  border: `2px solid ${selectedFiestaDay === day ? (day === 'LISTA TOTAL' ? '#10b981' : '#1976d2') : '#e5e7eb'}`,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedFiestaDay !== day) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = day === 'LISTA TOTAL' ? '#10b981' : '#1976d2';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFiestaDay !== day) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }
                }}
              >
                <input
                  type="radio"
                  name="fiestaDay"
                  value={day}
                  checked={selectedFiestaDay === day}
                  onChange={(e) => setSelectedFiestaDay(e.target.value)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                {day}
              </label>
            ))}
          </div>

          {/* Selector de tipo de comida debajo de los días */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 12,
              color: '#1f2937',
              textAlign: 'center'
            }}>
              Filtrar por tipo:
            </div>
            <div style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setSelectedTipoComida('')}
                style={{
                  padding: '12px 24px',
                  background: !selectedTipoComida
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#f3f4f6',
                  color: !selectedTipoComida ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: !selectedTipoComida
                    ? '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                    : 'none',
                  transition: 'all 0.2s'
                }}
              >
                📋 TODOS
              </button>
              <button
                onClick={() => setSelectedTipoComida('COMIDA')}
                style={{
                  padding: '12px 24px',
                  background: selectedTipoComida === 'COMIDA' 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : '#f3f4f6',
                  color: selectedTipoComida === 'COMIDA' ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: selectedTipoComida === 'COMIDA' 
                    ? '0 4px 6px -1px rgba(245, 158, 11, 0.3)'
                    : 'none',
                  transition: 'all 0.2s'
                }}
              >
                🌞 COMIDA
              </button>
              <button
                onClick={() => setSelectedTipoComida('CENA')}
                style={{
                  padding: '12px 24px',
                  background: selectedTipoComida === 'CENA'
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : '#f3f4f6',
                  color: selectedTipoComida === 'CENA' ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: selectedTipoComida === 'CENA'
                    ? '0 4px 6px -1px rgba(99, 102, 241, 0.3)'
                    : 'none',
                  transition: 'all 0.2s'
                }}
              >
                🌙 CENA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de totales para FIESTAS DE ESTELLA (ocultar cuando es LISTA TOTAL o cuando hay día seleccionado) */}
      {selectedEvent === 'FIESTAS DE ESTELLA' && totals && !selectedFiestaDay && (
        <div style={{ marginTop: 20 }}>
          {/* Totales generales */}
          <div style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: '#fff',
              padding: isMobile ? 12 : 20,
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              textAlign: 'center',
              minWidth: isMobile ? 90 : 150,
              flex: isMobile ? '1' : 'none'
            }}>
              <div style={{ fontSize: isMobile ? 10 : 13, opacity: 0.9, marginBottom: 6, fontWeight: 600 }}>
                👥 Adultos
              </div>
              <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700 }}>{totals.totalAdultos}</div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              color: '#fff',
              padding: isMobile ? 12 : 20,
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
              textAlign: 'center',
              minWidth: isMobile ? 90 : 150,
              flex: isMobile ? '1' : 'none'
            }}>
              <div style={{ fontSize: isMobile ? 10 : 13, opacity: 0.9, marginBottom: 6, fontWeight: 600 }}>
                👶 Niños
              </div>
              <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700 }}>{totals.totalNinos}</div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              padding: isMobile ? 12 : 20,
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              textAlign: 'center',
              border: '3px solid rgba(255,255,255,0.3)',
              minWidth: isMobile ? 90 : 150,
              flex: isMobile ? '1' : 'none'
            }}>
              <div style={{ fontSize: isMobile ? 10 : 13, opacity: 0.9, marginBottom: 6, fontWeight: 700 }}>
                TOTAL
              </div>
              <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700 }}>{totals.totalGeneral}</div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          Cargando datos...
        </div>
      )}

      {!loading && selectedEvent && totals && (
        <>
          {/* Resumen de totales - Oculto para RESERVAR MESA, CUMPLEAÑOS MES, FIESTAS DE ESTELLA, FERIAS, LOTERIA NAVIDAD, COTILLON DE REYES y eventos temporales */}
          {selectedEvent !== 'RESERVAR MESA' && selectedEvent !== 'CUMPLEAÑOS MES' && selectedEvent !== 'FIESTAS DE ESTELLA' && selectedEvent !== 'FERIAS' && selectedEvent !== 'LOTERIA NAVIDAD' && selectedEvent !== 'COTILLON DE REYES' && !selectedEvent.startsWith('TEMP_') && (
          <div style={{
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            marginBottom: 32,
            color: '#fff'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 22, fontWeight: 700 }}>
              📈 Resumen: {getEventDisplayName(selectedEvent)}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              {(selectedEvent !== 'LOTERIA NAVIDAD' && selectedEvent !== 'RESERVAR MESA') && (
                <>
                  <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: 16,
                    borderRadius: 12,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                      {totals.totalAdultos}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      👥 Adultos
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: 16,
                    borderRadius: 12,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                      {totals.totalNinos}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      👶 Niños
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: 16,
                    borderRadius: 12,
                    textAlign: 'center',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                      {totals.totalGeneral}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>
                      TOTAL PERSONAS
                    </div>
                  </div>
                </>
              )}

              {selectedEvent === 'RESERVAR MESA' && (
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: 16,
                  borderRadius: 12,
                  textAlign: 'center',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}>
                  <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                    {totals.totalComensales}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>
                    🍽️ TOTAL COMENSALES
                  </div>
                </div>
              )}

              {selectedEvent === 'LOTERIA NAVIDAD' && (
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: 16,
                  borderRadius: 12,
                  textAlign: 'center',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}>
                  <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                    {totals.totalDecimos}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>
                    🎟️ TOTAL DÉCIMOS
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Lista de inscritos - Tabla o Cards según dispositivo */}
          <div style={{
            background: '#fff',
            padding: isMobile ? 16 : 24,
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflowX: 'auto'
          }}>
            {/* Título con botón de borrar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12
            }}>
              {selectedEvent !== 'RESERVAR MESA' && selectedEvent !== 'CUMPLEAÑOS MES' && selectedEvent !== 'FERIAS' && selectedEvent !== 'LOTERIA NAVIDAD' && selectedEvent !== 'COTILLON DE REYES' ? (
                <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 600, color: '#374151' }}>
                  👥 Lista de inscritos
                </h3>
              ) : (
                <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 24, fontWeight: 700, color: '#111827' }}>
                  📋 {selectedEvent}
                </h3>
              )}

              {/* Botón BORRAR INSCRIPCIONES - Solo visible si hay registros */}
              {selectedEvent && filteredRegistrations.length > 0 && (
                <button
                  onClick={selectedEvent === 'CUMPLEAÑOS MES' ? handleBorrarCumpleanosMes : handleDeleteAllRegistrations}
                  disabled={loading}
                  style={{
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: isMobile ? '8px 16px' : '10px 20px',
                    borderRadius: '8px',
                    fontSize: isMobile ? 12 : 14,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                    }
                  }}
                >
                  🗑️ {loading ? 'BORRANDO...' : 'BORRAR INSCRIPCIONES'}
                </button>
              )}
            </div>

            {/* Vista MÓVIL - Tabla compacta para RESERVAR MESA y CUMPLEAÑOS MES, Cards para otros */}
            {isMobile ? (
              selectedEvent === 'RESERVAR MESA' ? (
                /* Tabla compacta para RESERVAR MESA en móvil */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 10
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: '#fff'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>#</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Usuario</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Fecha Insc.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Fecha Evento</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Hora</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Comensales</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg, index) => (
                        <tr
                          key={reg.id}
                          style={{
                            background: index % 2 === 0 ? '#f9fafb' : '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: '#1976d2', textAlign: 'center', fontSize: 10 }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 500, color: '#111827', fontSize: 9 }}>
                            {reg.userName?.split(' ')[0] || reg.userEmail?.split('@')[0]}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#6b7280', fontSize: 8 }}>
                            {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).replace(',', '') : '-'}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#374151', fontSize: 9 }}>
                            {reg.fecha ? (() => {
                              const [year, month, day] = reg.fecha.split('-');
                              return `${day}/${month}/${year.slice(-2)}`;
                            })() : '-'}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#374151', fontSize: 9 }}>
                            {reg.hora || '-'}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#1976d2', fontSize: 10 }}>
                            {reg.comensales || 0}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#6b7280', fontSize: 8, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {reg.observaciones || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedEvent === 'CUMPLEAÑOS MES' ? (
                /* Tabla compacta para CUMPLEAÑOS MES en móvil */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 10
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: '#fff'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>#</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Usuario</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Fecha Insc.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Adultos</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Niños</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Total</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg, index) => (
                        <tr
                          key={reg.id}
                          style={{
                            background: index % 2 === 0 ? '#f9fafb' : '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: '#1976d2', textAlign: 'center', fontSize: 10 }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 500, color: '#111827', fontSize: 9 }}>
                            {reg.userName?.split(' ')[0] || reg.userEmail?.split('@')[0]}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#6b7280', fontSize: 8 }}>
                            {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).replace(',', '') : '-'}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#1976d2', fontSize: 10 }}>
                            {reg.adultos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#7c3aed', fontSize: 10 }}>
                            {reg.ninos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#059669', fontSize: 10 }}>
                            {(reg.adultos || 0) + (reg.ninos || 0)}
                          </td>
                          <td style={{ 
                            padding: '6px 4px', 
                            textAlign: 'center', 
                            fontWeight: 700,
                            color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#2563eb',
                            fontSize: 8
                          }}>
                            {reg.tipoComida === 'COMIDA' ? '🌞' : '🌙'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedEvent === 'FERIAS' ? (
                /* Tabla compacta para FERIAS en móvil */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 10
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: '#fff'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>#</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Usuario</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Fecha Insc.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Adultos</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Niños</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg, index) => (
                        <tr
                          key={reg.id}
                          style={{
                            background: index % 2 === 0 ? '#f9fafb' : '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: '#1976d2', textAlign: 'center', fontSize: 10 }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 500, color: '#111827', fontSize: 9 }}>
                            {reg.userName?.split(' ')[0] || reg.userEmail?.split('@')[0]}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#6b7280', fontSize: 8 }}>
                            {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).replace(',', '') : '-'}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#1976d2', fontSize: 10 }}>
                            {reg.adultos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#7c3aed', fontSize: 10 }}>
                            {reg.ninos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#059669', fontSize: 10 }}>
                            {(reg.adultos || 0) + (reg.ninos || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedEvent === 'FERIAS' ? (
                /* Tabla compacta para FERIAS en móvil */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 10
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: '#fff'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>#</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Usuario</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Fecha Insc.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Adultos</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Niños</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg, index) => (
                        <tr
                          key={reg.id}
                          style={{
                            background: index % 2 === 0 ? '#f9fafb' : '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: '#1976d2', textAlign: 'center', fontSize: 10 }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 500, color: '#111827', fontSize: 9 }}>
                            {reg.userName?.split(' ')[0] || reg.userEmail?.split('@')[0]}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#6b7280', fontSize: 8 }}>
                            {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).replace(',', '') : '-'}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#1976d2', fontSize: 10 }}>
                            {reg.adultos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#7c3aed', fontSize: 10 }}>
                            {reg.ninos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#059669', fontSize: 10 }}>
                            {(reg.adultos || 0) + (reg.ninos || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedEvent === 'FIESTAS DE ESTELLA' ? (
                /* Vista móvil para FIESTAS DE ESTELLA */
                selectedFiestaDay ? (
                  /* Detalle de personas cuando hay un día seleccionado */
                  <div style={{ overflowX: 'auto', marginTop: 20 }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 10,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      overflow: 'hidden'
                    }}>
                      <thead>
                        <tr style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          color: '#fff' 
                        }}>
                          <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>#</th>
                          <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Usuario</th>
                          <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Adultos</th>
                          <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Niños</th>
                          <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Tipo</th>
                          <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRegistrations.map((reg, index) => (
                          <tr
                            key={reg.id}
                            style={{
                              background: index % 2 === 0 ? '#f9fafb' : '#fff',
                              borderBottom: '1px solid #e5e7eb'
                            }}
                          >
                            <td style={{ padding: '6px 4px', fontWeight: 600, color: '#1976d2', textAlign: 'center', fontSize: 10 }}>
                              {index + 1}
                            </td>
                            <td style={{ padding: '6px 4px', fontWeight: 500, color: '#111827', fontSize: 9 }}>
                              {reg.userName?.split(' ')[0] || reg.userEmail?.split('@')[0]}
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#1976d2', fontSize: 10 }}>
                              {reg.adultos || 0}
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#7c3aed', fontSize: 10 }}>
                              {reg.ninos || 0}
                            </td>
                            <td style={{ 
                              padding: '6px 4px', 
                              textAlign: 'center', 
                              fontWeight: 700,
                              color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#4f46e5',
                              fontSize: 8
                            }}>
                              {reg.tipoComida === 'COMIDA' ? '🌞' : '🌙'}
                            </td>
                            <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#059669', fontSize: 10 }}>
                              {(reg.adultos || 0) + (reg.ninos || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Tabla resumen por día cuando está en TODOS */
                  (() => {
                    // Agrupar registros por día de semana y tipo de comida
                    const groupedByDay = filteredRegistrations.reduce((acc, reg) => {
                      const day = reg.diaSemana || 'Sin día';
                      const tipo = reg.tipoComida || 'Sin tipo';
                      const key = `${day}|||${tipo}`; // Usamos ||| como separador
                      
                      if (!acc[key]) {
                        acc[key] = { day, tipo, adultos: 0, ninos: 0, total: 0 };
                      }
                      acc[key].adultos += (reg.adultos || 0);
                      acc[key].ninos += (reg.ninos || 0);
                      acc[key].total += (reg.adultos || 0) + (reg.ninos || 0);
                      return acc;
                    }, {});

                    return (
                      <div style={{ overflowX: 'auto', marginTop: 20 }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 10,
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          overflow: 'hidden'
                        }}>
                          <thead>
                            <tr style={{ 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                              color: '#fff' 
                            }}>
                              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, fontSize: 11 }}>Día</th>
                              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>Tipo</th>
                              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>Adultos</th>
                              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>Niños</th>
                              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(groupedByDay).map(([key, data], index) => (
                              <tr
                                key={key}
                                style={{
                                  background: index % 2 === 0 ? '#f9fafb' : '#fff',
                                  borderBottom: '1px solid #e5e7eb'
                                }}
                              >
                                <td style={{ 
                                  padding: '10px 8px', 
                                  fontWeight: 700, 
                                  color: '#374151',
                                  fontSize: 10,
                                  textTransform: 'uppercase'
                                }}>
                                  {data.day}
                                </td>
                                <td style={{ 
                                  padding: '10px 8px', 
                                  textAlign: 'center', 
                                  fontWeight: 700,
                                  color: data.tipo === 'COMIDA' ? '#d97706' : '#4f46e5',
                                  fontSize: 9
                                }}>
                                  {data.tipo === 'COMIDA' ? '🌞' : '🌙'}
                                </td>
                                <td style={{ 
                                  padding: '10px 8px', 
                                  textAlign: 'center', 
                                  fontWeight: 700, 
                                  color: '#1976d2',
                                  fontSize: 14
                                }}>
                                  {data.adultos}
                                </td>
                                <td style={{ 
                                  padding: '10px 8px', 
                                  textAlign: 'center', 
                                  fontWeight: 700, 
                                  color: '#7c3aed',
                                  fontSize: 14
                                }}>
                                  {data.ninos}
                                </td>
                                <td style={{ 
                                  padding: '10px 8px', 
                                  textAlign: 'center', 
                                  fontWeight: 700, 
                                  color: '#059669',
                                  fontSize: 14
                                }}>
                                  {data.total}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )
              ) : selectedEvent === 'LOTERIA NAVIDAD' ? (
                /* Tabla compacta para LOTERIA NAVIDAD en móvil */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 10
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: '#fff'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>#</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Usuario</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Fecha Insc.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Décimos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg, index) => (
                        <tr
                          key={reg.id}
                          style={{
                            background: index % 2 === 0 ? '#f9fafb' : '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: '#1976d2', textAlign: 'center', fontSize: 10 }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 500, color: '#111827', fontSize: 9 }}>
                            {reg.userName?.split(' ')[0] || reg.userEmail?.split('@')[0]}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#6b7280', fontSize: 8 }}>
                            {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).replace(',', '') : '-'}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#059669', fontSize: 10 }}>
                            {reg.decimos || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedEvent === 'COTILLON DE REYES' ? (
                /* Tabla compacta para COTILLON DE REYES en móvil */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 10
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: '#fff'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>#</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Usuario</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, fontSize: 9 }}>Fecha Insc.</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Adultos</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Niños</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: 9 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg, index) => (
                        <tr
                          key={reg.id}
                          style={{
                            background: index % 2 === 0 ? '#f9fafb' : '#fff',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <td style={{ padding: '6px 4px', fontWeight: 600, color: '#1976d2', textAlign: 'center', fontSize: 10 }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: '6px 4px', fontWeight: 500, color: '#111827', fontSize: 9 }}>
                            {reg.userName?.split(' ')[0] || reg.userEmail?.split('@')[0]}
                          </td>
                          <td style={{ padding: '6px 4px', color: '#6b7280', fontSize: 8 }}>
                            {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).replace(',', '') : '-'}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#1976d2', fontSize: 10 }}>
                            {reg.adultos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 600, color: '#7c3aed', fontSize: 10 }}>
                            {reg.ninos || 0}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#059669', fontSize: 10 }}>
                            {(reg.adultos || 0) + (reg.ninos || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Cards para otros eventos en móvil */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {filteredRegistrations.map((reg, index) => (
                    <div
                      key={reg.id}
                      style={{
                        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                        border: '2px solid #e5e7eb',
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      {/* Número y Usuario */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 12,
                        paddingBottom: 12,
                        borderBottom: '2px solid #1976d2'
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                          color: '#fff',
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>
                            {reg.userName || reg.userEmail}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                            {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Datos específicos para eventos temporales */}
                      {selectedEvent.startsWith('TEMP_') && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 12,
                          marginTop: 12
                        }}>
                          <div style={{
                            background: '#ede9fe',
                            padding: 12,
                            borderRadius: 8,
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Adultos</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#8b5cf6' }}>
                              {reg.adultos || 0}
                            </div>
                          </div>
                          <div style={{
                            background: '#fce7f3',
                            padding: 12,
                            borderRadius: 8,
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Niños</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#ec4899' }}>
                              {reg.ninos || 0}
                            </div>
                          </div>
                          <div style={{
                            background: '#d1fae5',
                            padding: 12,
                            borderRadius: 8,
                            textAlign: 'center',
                            border: '2px solid #10b981'
                          }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>Total</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
                              {(reg.adultos || 0) + (reg.ninos || 0)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : selectedEvent === 'FIESTAS DE ESTELLA' ? (
              /* Vista PC para FIESTAS DE ESTELLA */
              selectedFiestaDay && selectedFiestaDay !== 'LISTA TOTAL' ? (
                /* Detalle de personas cuando hay un día seleccionado - Separar por tipo de comida */
                (() => {
                  // Si hay filtro de tipo, usar filteredRegistrations, si no, separar ambos tipos
                  const comidaRegs = selectedTipoComida === 'COMIDA' 
                    ? filteredRegistrations 
                    : (selectedTipoComida === 'CENA' 
                        ? [] 
                        : filteredRegistrations.filter(reg => reg.tipoComida === 'COMIDA'));
                  
                  const cenaRegs = selectedTipoComida === 'CENA' 
                    ? filteredRegistrations 
                    : (selectedTipoComida === 'COMIDA' 
                        ? [] 
                        : filteredRegistrations.filter(reg => reg.tipoComida === 'CENA'));
                  
                  const hasComida = comidaRegs.length > 0;
                  const hasCena = cenaRegs.length > 0;

                  const renderTable = (regs, tipo) => {
                    const totalesAdultos = regs.reduce((sum, reg) => sum + (reg.adultos || 0), 0);
                    const totalesNinos = regs.reduce((sum, reg) => sum + (reg.ninos || 0), 0);
                    const totalesGeneral = totalesAdultos + totalesNinos;

                    return (
                      <div key={tipo} style={{ marginBottom: 32 }}>
                        {/* Título de la tabla */}
                        <div style={{
                          background: tipo === 'COMIDA' 
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          color: '#fff',
                          padding: '16px 24px',
                          borderRadius: '12px 12px 0 0',
                          fontWeight: 700,
                          fontSize: 18,
                          textAlign: 'center',
                          boxShadow: tipo === 'COMIDA'
                            ? '0 4px 12px rgba(245, 158, 11, 0.3)'
                            : '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}>
                          {tipo === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                        </div>

                        {/* Totales encima de cada tabla */}
                        <div style={{
                          display: 'flex',
                          gap: 12,
                          marginBottom: 0,
                          justifyContent: 'center',
                          padding: '16px',
                          background: tipo === 'COMIDA' ? '#fef3c7' : '#e0e7ff'
                        }}>
                          <div style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: '#fff',
                            padding: 16,
                            borderRadius: 10,
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                            textAlign: 'center',
                            minWidth: 120
                          }}>
                            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6, fontWeight: 600 }}>
                              👥 Adultos
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{totalesAdultos}</div>
                          </div>

                          <div style={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                            color: '#fff',
                            padding: 16,
                            borderRadius: 10,
                            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                            textAlign: 'center',
                            minWidth: 120
                          }}>
                            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6, fontWeight: 600 }}>
                              👶 Niños
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{totalesNinos}</div>
                          </div>

                          <div style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            padding: 16,
                            borderRadius: 10,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            textAlign: 'center',
                            border: '3px solid rgba(255,255,255,0.3)',
                            minWidth: 120
                          }}>
                            <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6, fontWeight: 700 }}>
                              TOTAL
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700 }}>{totalesGeneral}</div>
                          </div>
                        </div>

                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 14,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          borderRadius: '0 0 12px 12px',
                          overflow: 'hidden'
                        }}>
                          <thead>
                            <tr style={{ 
                              background: tipo === 'COMIDA' ? '#fef3c7' : '#e0e7ff',
                              color: '#1f2937'
                            }}>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>#</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Usuario</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha Inscripción</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Día</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Adultos</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Niños</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regs.map((reg, index) => (
                              <tr
                                key={reg.id}
                                style={{
                                  background: index % 2 === 0 ? '#f9fafb' : '#fff',
                                  borderBottom: '1px solid #e5e7eb'
                                }}
                              >
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1976d2' }}>{index + 1}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                                  {reg.userName || reg.userEmail}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                                  {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#374151' }}>{reg.fecha || '-'}</td>
                                <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600 }}>{reg.diaSemana || '-'}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#1976d2' }}>
                                  {reg.adultos || 0}
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#7c3aed' }}>
                                  {reg.ninos || 0}
                                </td>
                                <td style={{ 
                                  padding: '12px 16px', 
                                  textAlign: 'center', 
                                  fontWeight: 700, 
                                  color: '#059669',
                                  fontSize: 15
                                }}>
                                  {(reg.adultos || 0) + (reg.ninos || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  };

                  return (
                    <div>
                      {hasComida && renderTable(comidaRegs, 'COMIDA')}
                      {hasCena && renderTable(cenaRegs, 'CENA')}
                    </div>
                  );
                })()
              ) : selectedFiestaDay === 'LISTA TOTAL' ? (
                /* Detalle de todas las personas cuando se selecciona LISTA TOTAL */
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14
                }}>
                  <thead>
                    <tr style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: '#fff' 
                    }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderRadius: '8px 0 0 0' }}>#</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Usuario</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha Inscripción</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Día</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Adultos</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Niños</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Tipo</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg, index) => (
                      <tr
                        key={reg.id}
                        style={{
                          background: index % 2 === 0 ? '#f9fafb' : '#fff',
                          borderBottom: '1px solid #e5e7eb'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1976d2' }}>{index + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                          {reg.userName || reg.userEmail}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                          {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#374151' }}>{reg.fecha || '-'}</td>
                        <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600 }}>{reg.diaSemana || '-'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#1976d2' }}>
                          {reg.adultos || 0}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#7c3aed' }}>
                          {reg.ninos || 0}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center', 
                          fontWeight: 700,
                          color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#4f46e5',
                          fontSize: 13
                        }}>
                          {reg.tipoComida === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center', 
                          fontWeight: 700, 
                          color: '#059669',
                          fontSize: 15
                        }}>
                          {(reg.adultos || 0) + (reg.ninos || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Tabla resumen por día cuando está en TODOS */
                (() => {
                  // Agrupar registros por día de semana
                  const groupedByDay = filteredRegistrations.reduce((acc, reg) => {
                    const day = reg.diaSemana || 'Sin día';
                    if (!acc[day]) {
                      acc[day] = { adultos: 0, ninos: 0, total: 0 };
                    }
                    acc[day].adultos += (reg.adultos || 0);
                    acc[day].ninos += (reg.ninos || 0);
                    acc[day].total += (reg.adultos || 0) + (reg.ninos || 0);
                    return acc;
                  }, {});

                  return (
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 14
                    }}>
                      <thead>
                        <tr style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          color: '#fff' 
                        }}>
                          <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 700, fontSize: 16, borderRadius: '8px 0 0 0' }}>Día</th>
                          <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 700, fontSize: 16 }}>Adultos</th>
                          <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 700, fontSize: 16 }}>Niños</th>
                          <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 700, fontSize: 16, borderRadius: '0 8px 0 0' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(groupedByDay).map(([day, counts], index) => (
                          <tr
                            key={day}
                            style={{
                              background: index % 2 === 0 ? '#f9fafb' : '#fff',
                              borderBottom: '1px solid #e5e7eb'
                            }}
                          >
                            <td style={{ 
                              padding: '16px 20px', 
                              fontWeight: 700, 
                              color: '#374151',
                              fontSize: 15,
                              textTransform: 'uppercase'
                            }}>
                              {day}
                            </td>
                            <td style={{ 
                              padding: '16px 20px', 
                              textAlign: 'center', 
                              fontWeight: 700, 
                              color: '#1976d2',
                              fontSize: 20
                            }}>
                              {counts.adultos}
                            </td>
                            <td style={{ 
                              padding: '16px 20px', 
                              textAlign: 'center', 
                              fontWeight: 700, 
                              color: '#7c3aed',
                              fontSize: 20
                            }}>
                              {counts.ninos}
                            </td>
                            <td style={{ 
                              padding: '16px 20px', 
                              textAlign: 'center', 
                              fontWeight: 700, 
                              color: '#059669',
                              fontSize: 22
                            }}>
                              {counts.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()
              )
            ) : (
              /* Vista PC - Tabla normal para otros eventos */
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14
              }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: '#fff'
                  }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderRadius: '8px 0 0 0' }}>#</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Usuario</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha Inscripción</th>
                    
                    {/* Columnas específicas por evento */}
                    {selectedEvent === 'RESERVAR MESA' && (
                      <>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Hora</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Comensales</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Observaciones</th>
                      </>
                    )}

                    {['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(selectedEvent) && (
                      <>
                        {selectedEvent === 'FIESTAS DE ESTELLA' && (
                          <>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Fecha</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Día</th>
                          </>
                        )}
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Adultos</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Niños</th>
                        {selectedEvent === 'CUMPLEAÑOS MES' && (
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Tipo</th>
                        )}
                        {selectedEvent === 'FIESTAS DE ESTELLA' && (
                          <>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Tipo</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Total</th>
                          </>
                        )}
                        {!['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA'].includes(selectedEvent) && (
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}></th>
                        )}
                      </>
                    )}

                    {selectedEvent === 'LOTERIA NAVIDAD' && (
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Décimos</th>
                    )}

                    {/* Columnas para eventos temporales */}
                    {selectedEvent.startsWith('TEMP_') && (
                      <>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Adultos</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Niños</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg, index) => (
                    <tr
                      key={reg.id}
                      style={{
                        background: index % 2 === 0 ? '#f9fafb' : '#fff',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1976d2' }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>
                        {reg.userName || reg.userEmail}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                        {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>

                      {/* Datos específicos: RESERVAR MESA */}
                      {selectedEvent === 'RESERVAR MESA' && (
                        <>
                          <td style={{ padding: '12px 16px', color: '#374151' }}>{reg.fecha || '-'}</td>
                          <td style={{ padding: '12px 16px', color: '#374151' }}>{reg.hora || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#1976d2' }}>
                            {reg.comensales || 0}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 13 }}>
                            {reg.observaciones || '-'}
                          </td>
                        </>
                      )}

                      {/* Datos específicos: CUMPLEAÑOS MES, FIESTAS DE ESTELLA, FERIAS, COTILLON DE REYES */}
                      {['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'FERIAS', 'COTILLON DE REYES'].includes(selectedEvent) && (
                        <>
                          {selectedEvent === 'FIESTAS DE ESTELLA' && (
                            <>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>{reg.fecha || '-'}</td>
                              <td style={{ padding: '12px 16px', color: '#374151' }}>{reg.diaSemana || '-'}</td>
                            </>
                          )}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#1976d2' }}>
                            {reg.adultos || 0}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#7c3aed' }}>
                            {reg.ninos || 0}
                          </td>
                          {selectedEvent === 'CUMPLEAÑOS MES' && (
                            <td style={{ 
                              padding: '12px 16px', 
                              textAlign: 'center', 
                              fontWeight: 700,
                              color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#2563eb',
                              fontSize: 13
                            }}>
                              {reg.tipoComida === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                            </td>
                          )}
                          {selectedEvent === 'FIESTAS DE ESTELLA' && (
                            <td style={{ 
                              padding: '12px 16px', 
                              textAlign: 'center', 
                              fontWeight: 700,
                              color: reg.tipoComida === 'COMIDA' ? '#d97706' : '#2563eb',
                              fontSize: 13
                            }}>
                              {reg.tipoComida === 'COMIDA' ? '🌞 COMIDA' : '🌙 CENA'}
                            </td>
                          )}
                        </>
                      )}

                      {/* Datos específicos: LOTERIA NAVIDAD */}
                      {selectedEvent === 'LOTERIA NAVIDAD' && (
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#059669' }}>
                          {reg.decimos || 0}
                        </td>
                      )}

                      {/* Datos específicos: Eventos temporales (TEMP_) */}
                      {selectedEvent.startsWith('TEMP_') && (
                        <>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#8b5cf6' }}>
                            {reg.adultos || 0}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#ec4899' }}>
                            {reg.ninos || 0}
                          </td>
                          <td style={{ 
                            padding: '12px 16px', 
                            textAlign: 'center', 
                            fontWeight: 700, 
                            color: '#10b981',
                            fontSize: 15
                          }}>
                            {(reg.adultos || 0) + (reg.ninos || 0)}
                          </td>
                        </>
                      )}

                      {/* Columna Total por fila para FIESTAS DE ESTELLA */}
                      {selectedEvent === 'FIESTAS DE ESTELLA' && (
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center', 
                          fontWeight: 700, 
                          color: '#059669',
                          fontSize: 15
                        }}>
                          {(reg.adultos || 0) + (reg.ninos || 0)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Resumen de totales debajo de la tabla para FERIAS */}
          {selectedEvent === 'FERIAS' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginTop: 24
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👥 Adultos
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalAdultos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👶 Niños
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalNinos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                border: '3px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 700 }}>
                  TOTAL PERSONAS
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalGeneral}</div>
              </div>
            </div>
          )}

          {/* Resumen de totales debajo de la tabla solo para CUMPLEAÑOS MES */}
          {selectedEvent === 'CUMPLEAÑOS MES' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginTop: 24
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👥 Adultos
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalAdultos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👶 Niños
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalNinos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                border: '3px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 700 }}>
                  TOTAL PERSONAS
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalGeneral}</div>
              </div>
            </div>
          )}

          {/* Resumen de totales debajo de la tabla para COTILLON DE REYES */}
          {selectedEvent === 'COTILLON DE REYES' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginTop: 24
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👥 Adultos
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalAdultos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👶 Niños
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalNinos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                border: '3px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 700 }}>
                  TOTAL PERSONAS
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalGeneral}</div>
              </div>
            </div>
          )}

          {/* Resumen de totales debajo de la tabla para eventos temporales */}
          {selectedEvent.startsWith('TEMP_') && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginTop: 24
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👥 Adultos
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalAdultos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  👶 Niños
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalNinos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                border: '3px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 700 }}>
                  TOTAL PERSONAS
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalGeneral}</div>
              </div>
            </div>
          )}

          {/* Resumen de totales debajo de la tabla para LOTERIA NAVIDAD */}
          {selectedEvent === 'LOTERIA NAVIDAD' && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 24
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                padding: 32,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                textAlign: 'center',
                border: '3px solid rgba(255,255,255,0.3)',
                minWidth: 250
              }}>
                <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 12, fontWeight: 700 }}>
                  🎟️ TOTAL DÉCIMOS
                </div>
                <div style={{ fontSize: 48, fontWeight: 700 }}>{totals.totalDecimos}</div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && selectedEvent && !totals && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#f9fafb',
          borderRadius: 16,
          color: '#6b7280'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            No hay inscripciones para este evento
          </div>
        </div>
      )}

      {!loading && !selectedEvent && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#f9fafb',
          borderRadius: 16,
          color: '#6b7280'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            Selecciona un evento para ver el listado
          </div>
        </div>
      )}

      {/* Modal de contraseña */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            maxWidth: 400,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700, color: '#111827' }}>
              🔒 Introduce la contraseña
            </h3>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmDeleteWithPassword();
                if (e.key === 'Escape') {
                  setShowPasswordModal(false);
                  setPassword('');
                }
              }}
              placeholder="Contraseña"
              autoFocus
              style={{
                width: '100%',
                padding: 12,
                fontSize: 16,
                border: '2px solid #d1d5db',
                borderRadius: 8,
                marginBottom: 20,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={selectedEvent === 'CUMPLEAÑOS MES' ? confirmarPasswordCumpleanosMes : confirmDeleteWithPassword}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de fecha para CUMPLEAÑOS MES */}
      {showModalFechaCena && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            maxWidth: 400,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700, color: '#111827' }}>
              📅 Configurar próximo evento
            </h3>
            <p style={{ marginBottom: 20, color: '#6b7280', fontSize: 14 }}>
              Selecciona el tipo y fecha del próximo evento de CUMPLEAÑOS MES. Se borrarán todas las inscripciones actuales y se enviará un email a todos los socios.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                Tipo de evento *
              </label>
              <select
                value={nuevoTipoComida}
                onChange={(e) => setNuevoTipoComida(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: 16,
                  border: '2px solid #d1d5db',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#fff'
                }}
              >
                <option value="CENA">CENA</option>
                <option value="COMIDA">COMIDA</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                Fecha del evento *
              </label>
              <input
                type="date"
                value={nuevaFechaCena}
                onChange={(e) => setNuevaFechaCena(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmarBorradoCumpleanosConFecha();
                  if (e.key === 'Escape') {
                    setShowModalFechaCena(false);
                    setNuevaFechaCena('');
                    setNuevoTipoComida('CENA');
                  }
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: 12,
                  fontSize: 16,
                  border: '2px solid #d1d5db',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowModalFechaCena(false);
                  setNuevaFechaCena('');
                  setNuevoTipoComida('CENA');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBorradoCumpleanosConFecha}
                disabled={!nuevaFechaCena}
                style={{
                  padding: '10px 20px',
                  background: nuevaFechaCena ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#d1d5db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: nuevaFechaCena ? 'pointer' : 'not-allowed'
                }}
              >
                Confirmar y Enviar Emails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de borrar evento temporal */}
      {showDeleteTempEventModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            maxWidth: 400,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700, color: '#dc2626' }}>
              🔒 Borrar evento temporal
            </h3>
            <p style={{ marginBottom: 20, color: '#6b7280', fontSize: 14 }}>
              Vas a borrar el evento <strong>"{tempEventToDelete?.titulo}"</strong>.
              <br /><br />
              Introduce la contraseña para confirmar:
            </p>
            <input
              type="password"
              value={tempEventPassword}
              onChange={(e) => setTempEventPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmDeleteTempEvent();
                if (e.key === 'Escape') {
                  setShowDeleteTempEventModal(false);
                  setTempEventPassword('');
                  setTempEventToDelete(null);
                }
              }}
              placeholder="Ingrese contraseña"
              autoFocus
              style={{
                width: '100%',
                padding: 12,
                fontSize: 16,
                border: '2px solid #d1d5db',
                borderRadius: 8,
                marginBottom: 20,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteTempEventModal(false);
                  setTempEventPassword('');
                  setTempEventToDelete(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTempEvent}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: loading ? '#d1d5db' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Borrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
