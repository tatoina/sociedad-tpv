// src/pages/Listados.jsx
import React, { useState, useEffect } from 'react';
import { getAllEventRegistrations } from '../firebase';
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

export default function Listados({ user }) {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiestaDay, setSelectedFiestaDay] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      loadRegistrations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      let filtered = allRegistrations.filter(reg => reg.eventType === selectedEvent);
      
      // Filtrar por día seleccionado si es FIESTAS DE ESTELLA
      if (selectedEvent === 'FIESTAS DE ESTELLA' && selectedFiestaDay) {
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
      
      setFilteredRegistrations(filtered);
    } else {
      setFilteredRegistrations([]);
    }
  }, [selectedEvent, allRegistrations, selectedFiestaDay]);

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

  const calculateTotals = () => {
    if (!filteredRegistrations.length) return null;

    let totalAdultos = 0;
    let totalNinos = 0;
    let totalComensales = 0;
    let totalDecimos = 0;
    let totalInscripciones = filteredRegistrations.length;

    filteredRegistrations.forEach(reg => {
      totalAdultos += reg.adultos || 0;
      totalNinos += reg.ninos || 0;
      totalComensales += reg.comensales || 0;
      totalDecimos += reg.decimos || 0;
    });

    const totalGeneral = totalAdultos + totalNinos;

    return {
      totalInscripciones,
      totalAdultos,
      totalNinos,
      totalGeneral,
      totalComensales,
      totalDecimos
    };
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
        </select>
      </div>

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
            {['VIERNES DE GIGANTES', 'SÁBADO', 'DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES'].map(day => (
              <label
                key={day}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  background: selectedFiestaDay === day ? 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' : '#f9fafb',
                  color: selectedFiestaDay === day ? '#fff' : '#374151',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  border: `2px solid ${selectedFiestaDay === day ? '#1976d2' : '#e5e7eb'}`,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedFiestaDay !== day) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#1976d2';
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
          {selectedFiestaDay && (
            <button
              onClick={() => setSelectedFiestaDay('')}
              style={{
                marginTop: 16,
                padding: '10px 20px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              Ver todos los días
            </button>
          )}

          {/* Resumen de totales para FIESTAS DE ESTELLA */}
          {selectedFiestaDay && totals && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 16,
              marginTop: 24
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                padding: 20,
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6, fontWeight: 600 }}>
                  Inscritos
                </div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalInscripciones}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: '#fff',
                padding: 20,
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6, fontWeight: 600 }}>
                  👥 Adultos
                </div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalAdultos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                color: '#fff',
                padding: 20,
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6, fontWeight: 600 }}>
                  👶 Niños
                </div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalNinos}</div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                padding: 20,
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
                border: '3px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6, fontWeight: 700 }}>
                  TOTAL
                </div>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalGeneral}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          Cargando datos...
        </div>
      )}

      {!loading && selectedEvent && totals && (
        <>
          {/* Resumen de totales - Oculto para RESERVAR MESA, CUMPLEAÑOS MES, FIESTAS DE ESTELLA, LOTERIA NAVIDAD y COTILLON DE REYES */}
          {selectedEvent !== 'RESERVAR MESA' && selectedEvent !== 'CUMPLEAÑOS MES' && selectedEvent !== 'FIESTAS DE ESTELLA' && selectedEvent !== 'LOTERIA NAVIDAD' && selectedEvent !== 'COTILLON DE REYES' && (
          <div style={{
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            marginBottom: 32,
            color: '#fff'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 22, fontWeight: 700 }}>
              📈 Resumen: {selectedEvent}
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                padding: 16,
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                  {totals.totalInscripciones}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  Inscripciones
                </div>
              </div>

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

          {/* Lista de inscritos - Tabla */}
          <div style={{
            background: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflowX: 'auto'
          }}>
            {selectedEvent !== 'RESERVAR MESA' && selectedEvent !== 'CUMPLEAÑOS MES' && selectedEvent !== 'LOTERIA NAVIDAD' && selectedEvent !== 'COTILLON DE REYES' && (
            <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600, color: '#374151' }}>
              👥 Lista de inscritos ({filteredRegistrations.length})
            </h3>
            )}

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
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: selectedEvent === 'FIESTAS DE ESTELLA' ? '0' : '0 8px 0 0' }}>Niños</th>
                      {selectedEvent === 'FIESTAS DE ESTELLA' && (
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Total</th>
                      )}
                    </>
                  )}

                  {selectedEvent === 'LOTERIA NAVIDAD' && (
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Décimos</th>
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
                      </>
                    )}

                    {/* Datos específicos: LOTERIA NAVIDAD */}
                    {selectedEvent === 'LOTERIA NAVIDAD' && (
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#059669' }}>
                        {reg.decimos || 0}
                      </td>
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
          </div>

          {/* Resumen de totales debajo de la tabla solo para CUMPLEAÑOS MES */}
          {selectedEvent === 'CUMPLEAÑOS MES' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginTop: 24
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  Inscritos
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalInscripciones}</div>
              </div>

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
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>
                  Inscritos
                </div>
                <div style={{ fontSize: 40, fontWeight: 700 }}>{totals.totalInscripciones}</div>
              </div>

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
    </div>
  );
}
