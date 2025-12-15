// src/pages/ListadosTPV.jsx
import React, { useState, useEffect } from 'react';
import { queryExpenses, getAllSocios, deleteExpense } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function ListadosTPV({ user, profile }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socios, setSocios] = useState([]);
  const [selectedSocio, setSelectedSocio] = useState('todos');
  const [showTickets, setShowTickets] = useState(false);
  const [searchTicket, setSearchTicket] = useState('');
  
  // Inicializar con el mes anterior
  const getLastMonthDates = () => {
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      from: formatDate(firstDayLastMonth),
      to: formatDate(lastDayLastMonth)
    };
  };
  
  const lastMonth = getLastMonthDates();
  const [dateFrom, setDateFrom] = useState(lastMonth.from);
  const [dateTo, setDateTo] = useState(lastMonth.to);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      loadExpenses();
      if (profile?.isAdmin) {
        loadSocios();
      }
    }
  }, [user, profile]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, dateFrom, dateTo, selectedSocio]);

  const loadSocios = async () => {
    try {
      const allSocios = await getAllSocios();
      setSocios(allSocios);
    } catch (err) {
      console.error('Error cargando socios:', err);
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await queryExpenses({ isAdmin: profile?.isAdmin || false });
      // Si es admin, mostrar todos; si no, solo los del usuario actual
      const userExpenses = profile?.isAdmin 
        ? data 
        : data.filter(exp => exp.userId === user?.uid || exp.uid === user?.uid);
      setExpenses(userExpenses);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este ticket?')) {
      return;
    }
    try {
      await deleteExpense(ticketId);
      alert('Ticket eliminado correctamente');
      loadExpenses();
    } catch (err) {
      console.error('Error eliminando ticket:', err);
      alert('Error al eliminar el ticket');
    }
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    // Filtro por socio (solo para admin)
    if (profile?.isAdmin && selectedSocio !== 'todos') {
      filtered = filtered.filter(exp => exp.uid === selectedSocio);
    }

    // Filtro de búsqueda en tickets
    if (searchTicket) {
      const searchLower = searchTicket.toLowerCase();
      filtered = filtered.filter(exp => {
        const dateStr = formatDate(exp.date).toLowerCase();
        const emailStr = (exp.userEmail || '').toLowerCase();
        const linesStr = (exp.productLines || []).map(l => (l.label || '').toLowerCase()).join(' ');
        return dateStr.includes(searchLower) || emailStr.includes(searchLower) || linesStr.includes(searchLower);
      });
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(exp => {
        const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
        return expDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(exp => {
        const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
        return expDate <= toDate;
      });
    }

    // Ordenar por fecha descendente
    filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });

    setFilteredExpenses(filtered);
  };

  const calculateTotals = () => {
    let totalAmount = 0;
    let totalSociedad = 0;
    let totalPersonal = 0;
    const sociosDesglose = {}; // Desglose por socio

    filteredExpenses.forEach(exp => {
      const lines = exp.productLines || [];
      let expAmount = 0;
      lines.forEach(line => {
        const qty = Number(line.qty || 1);
        const price = Number(line.price || 0);
        expAmount += qty * price;
      });
      
      totalAmount += expAmount;
      
      const socioId = exp.uid;
      const socioEmail = exp.userEmail || 'Sin email';
      
      if (!sociosDesglose[socioId]) {
        sociosDesglose[socioId] = {
          email: socioEmail,
          totalPersonal: 0,
          totalSociedad: 0,
          total: 0
        };
      }
      
      if (exp.category === 'sociedad') {
        totalSociedad += expAmount;
        sociosDesglose[socioId].totalSociedad += expAmount;
      } else {
        totalPersonal += expAmount;
        sociosDesglose[socioId].totalPersonal += expAmount;
      }
      
      sociosDesglose[socioId].total += expAmount;
    });

    return {
      totalTickets: filteredExpenses.length,
      totalAmount: totalAmount.toFixed(2),
      totalSociedad: totalSociedad.toFixed(2),
      totalPersonal: totalPersonal.toFixed(2),
      sociosDesglose: Object.entries(sociosDesglose).map(([id, data]) => ({
        id,
        email: data.email,
        totalPersonal: data.totalPersonal.toFixed(2),
        totalSociedad: data.totalSociedad.toFixed(2),
        total: data.total.toFixed(2)
      })).sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
    };
  };

  const totals = calculateTotals();

  const exportToExcel = () => {
    // Crear datos para Excel
    const excelData = [];
    
    filteredExpenses.forEach((exp, index) => {
      const lines = exp.productLines || [];
      const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      const dateStr = expDate.toLocaleDateString('es-ES');
      const timeStr = expDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      lines.forEach((line, lineIdx) => {
        const qty = Number(line.qty || 1);
        const price = Number(line.price || 0);
        const subtotal = qty * price;
        
        excelData.push({
          'Ticket': `#${index + 1}`,
          'Fecha': dateStr,
          'Hora': timeStr,
          'Usuario': exp.userEmail || '',
          'Tipo': exp.category === 'sociedad' ? 'SOCIEDAD' : 'Personal',
          'Asistentes': exp.attendees || '',
          'Producto': line.label || '',
          'Cantidad': qty,
          'Precio Unit.': price.toFixed(2),
          'Subtotal': subtotal.toFixed(2)
        });
      });
    });

    // Convertir a CSV
    if (excelData.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = Object.keys(excelData[0]);
    const csvContent = [
      headers.join(','),
      ...excelData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar comas y comillas en los valores
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Añadir BOM para UTF-8 con Excel
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = `gastos_${dateFrom}_${dateTo}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return <div style={{ padding: 20 }}>No autenticado</div>;
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>Cargando gastos...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700, color: '#111827' }}>
        📊 Listados TPV
      </h2>

      {/* Filtros */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#374151' }}>
            Filtros
          </h3>
          <button
            onClick={exportToExcel}
            disabled={filteredExpenses.length === 0}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: filteredExpenses.length === 0 ? '#9ca3af' : '#10b981',
              border: 'none',
              borderRadius: 8,
              cursor: filteredExpenses.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📥 Exportar a Excel
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
          {profile?.isAdmin && (
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
                Socio
              </label>
              <select
                value={selectedSocio}
                onChange={(e) => setSelectedSocio(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  outline: 'none',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="todos">Todos los socios</option>
                {socios.map(socio => (
                  <option key={socio.id} value={socio.id}>
                    {socio.name} {socio.surname} ({socio.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de totales */}
      {filteredExpenses.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 20,
          marginBottom: 32
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Gastos Sociedad</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalSociedad}€</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Gastos Personales</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalPersonal}€</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Total General</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalAmount}€</div>
          </div>
        </div>
      )}

      {/* Desglose por socio - Resumen para banco */}
      {filteredExpenses.length > 0 && totals.sociosDesglose && totals.sociosDesglose.length > 0 && (
        <div style={{
          background: '#fff',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: 32
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
              💰 Resumen Detallado por Socio
            </h3>
            <div style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>
              Periodo: {new Date(dateFrom).toLocaleDateString('es-ES')} - {new Date(dateTo).toLocaleDateString('es-ES')}
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Desglose de gastos personales (TPV) y gastos de sociedad por cada socio
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Socio
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  TPV (Personal)
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Sociedad
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {totals.sociosDesglose.map((socio, index) => (
                <tr key={socio.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#111827' }}>
                    {socio.email}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#8b5cf6', textAlign: 'right' }}>
                    {socio.totalPersonal}€
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#f59e0b', textAlign: 'right' }}>
                    {socio.totalSociedad}€
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, color: '#059669', textAlign: 'right' }}>
                    {socio.total}€
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #374151', backgroundColor: '#f9fafb', fontWeight: 700 }}>
                <td style={{ padding: '16px', fontSize: 16, color: '#111827' }}>
                  TOTAL
                </td>
                <td style={{ padding: '16px', fontSize: 18, fontWeight: 700, color: '#8b5cf6', textAlign: 'right' }}>
                  {totals.totalPersonal}€
                </td>
                <td style={{ padding: '16px', fontSize: 18, fontWeight: 700, color: '#f59e0b', textAlign: 'right' }}>
                  {totals.totalSociedad}€
                </td>
                <td style={{ padding: '16px', fontSize: 20, fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                  {totals.totalAmount}€
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Lista de tickets - Colapsable */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
            📝 Histórico de Tickets
          </h3>
          <button
            onClick={() => setShowTickets(!showTickets)}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            {showTickets ? '▼ Ocultar' : '▶ Mostrar'}
          </button>
        </div>

        {showTickets && (
          <div>
            {/* Búsqueda de tickets */}
            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Buscar por socio, fecha o producto..."
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  outline: 'none'
                }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                Cargando...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                No hay tickets para mostrar
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredExpenses.map((exp, index) => {
              const lines = exp.productLines || [];
              const total = lines.reduce((sum, line) => {
                const qty = Number(line.qty || 1);
                const price = Number(line.price || 0);
                return sum + (qty * price);
              }, 0);

              return (
                <div
                  key={exp.id}
                  style={{
                    padding: 16,
                    background: '#f9fafb',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                        Ticket #{index + 1}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        {formatDate(exp.date)}
                      </div>
                      {profile?.isAdmin && exp.userEmail && (
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                          👤 {exp.userEmail}
                        </div>
                      )}
                      {exp.category === 'sociedad' && (
                        <div style={{ 
                          display: 'inline-block',
                          marginTop: 6,
                          padding: '4px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: '#fff3cd',
                          color: '#856404',
                          border: '1px solid #ffc107'
                        }}>
                          🏛️ SOCIEDAD {exp.attendees ? `(${exp.attendees} asist.)` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>
                        {total.toFixed(2)}€
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        {lines.length} {lines.length === 1 ? 'producto' : 'productos'}
                      </div>
                    </div>
                  </div>

                  {/* Detalle de productos */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    {lines.map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                          fontSize: 14,
                          color: '#374151'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 500 }}>{line.qty}x</span> {line.label}
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {(Number(line.qty || 1) * Number(line.price || 0)).toFixed(2)}€
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botones de acción */}
                  {profile?.isAdmin && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleDeleteTicket(exp.id)}
                        style={{
                          padding: '8px 16px',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#fff',
                          backgroundColor: '#dc2626',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}
      </div>
    </div>
  );
}
