// src/pages/Listados.jsx
import React, { useState, useEffect } from 'react';
import { getAllEventRegistrations } from '../firebase';

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

  useEffect(() => {
    if (user?.uid) {
      loadRegistrations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      const filtered = allRegistrations.filter(reg => reg.eventType === selectedEvent);
      setFilteredRegistrations(filtered);
    } else {
      setFilteredRegistrations([]);
    }
  }, [selectedEvent, allRegistrations]);

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

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          Cargando datos...
        </div>
      )}

      {!loading && selectedEvent && totals && (
        <>
          {/* Para FERIAS: primero la lista, luego totales */}
          {selectedEvent === 'FERIAS' ? (
            <>
              {/* Lista de inscritos */}
              <div style={{
                background: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: 32
              }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600, color: '#374151' }}>
                  👥 Lista de inscritos ({filteredRegistrations.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredRegistrations.map((reg, index) => (
                    <div
                      key={reg.id}
                      style={{
                        background: '#f9fafb',
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>
                          {index + 1}. {reg.userName || reg.userEmail}
                        </div>
                        <div style={{ fontSize: 14, color: '#6b7280' }}>
                          {reg.fecha && (
                            <span>📅 {reg.fecha} {reg.diaSemana && `(${reg.diaSemana})`} • </span>
                          )}
                          👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div style={{
                        fontSize: 12,
                        color: '#9ca3af',
                        textAlign: 'right',
                        minWidth: '100px'
                      }}>
                        {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleDateString('es-ES') : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen de totales */}
              <div style={{
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
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
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Para otros eventos: primero totales, luego lista */}
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

              {/* Lista de inscritos */}
              <div style={{
                background: '#fff',
                padding: 24,
                borderRadius: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600, color: '#374151' }}>
                  👥 Lista de inscritos ({filteredRegistrations.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredRegistrations.map((reg, index) => (
                    <div
                      key={reg.id}
                      style={{
                        background: '#f9fafb',
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>
                          {index + 1}. {reg.userName || reg.userEmail}
                        </div>
                        
                        {/* RESERVAR MESA */}
                        {selectedEvent === 'RESERVAR MESA' && (
                          <div style={{ fontSize: 14, color: '#6b7280' }}>
                            📅 {reg.fecha} {reg.hora && `• 🕐 ${reg.hora}`} • 🍽️ {reg.comensales} comensal{reg.comensales !== 1 ? 'es' : ''}
                            {reg.observaciones && ` • 💬 ${reg.observaciones}`}
                          </div>
                        )}

                        {/* CUMPLEAÑOS MES, FIESTAS DE ESTELLA, COTILLON DE REYES */}
                        {['CUMPLEAÑOS MES', 'FIESTAS DE ESTELLA', 'COTILLON DE REYES'].includes(selectedEvent) && (
                          <div style={{ fontSize: 14, color: '#6b7280' }}>
                            {selectedEvent === 'FIESTAS DE ESTELLA' && reg.fecha && (
                              <span>📅 {reg.fecha} {reg.diaSemana && `(${reg.diaSemana})`} • </span>
                            )}
                            👥 {reg.adultos} adulto{reg.adultos !== 1 ? 's' : ''} • 👶 {reg.ninos} niño{reg.ninos !== 1 ? 's' : ''}
                          </div>
                        )}

                        {/* LOTERIA NAVIDAD */}
                        {selectedEvent === 'LOTERIA NAVIDAD' && (
                          <div style={{ fontSize: 14, color: '#6b7280' }}>
                            🎟️ {reg.decimos} décimo{reg.decimos !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      <div style={{
                        fontSize: 12,
                        color: '#9ca3af',
                        textAlign: 'right',
                        minWidth: '100px'
                      }}>
                        {reg.createdAt?.toDate ? new Date(reg.createdAt.toDate()).toLocaleDateString('es-ES') : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
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
