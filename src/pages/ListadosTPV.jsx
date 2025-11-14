// src/pages/ListadosTPV.jsx
import React, { useState, useEffect } from 'react';
import { queryExpenses } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function ListadosTPV({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
    }
  }, [user]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, dateFrom, dateTo]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await queryExpenses();
      // Filtrar solo los gastos del usuario actual
      const userExpenses = data.filter(exp => exp.userId === user?.uid);
      setExpenses(userExpenses);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

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

    filteredExpenses.forEach(exp => {
      const lines = exp.productLines || [];
      lines.forEach(line => {
        const qty = Number(line.qty || 1);
        const price = Number(line.price || 0);
        totalAmount += qty * price;
      });
    });

    return {
      totalTickets: filteredExpenses.length,
      totalAmount: totalAmount.toFixed(2)
    };
  };

  const totals = calculateTotals();

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
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#374151' }}>
          Filtrar por fecha
        </h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
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
        </div>
      </div>

      {/* Resumen de totales */}
      {filteredExpenses.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 32
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Total Tickets</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalTickets}</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Importe Total</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalAmount}€</div>
          </div>
        </div>
      )}

      {/* Lista de tickets */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600, color: '#111827' }}>
          Tickets registrados
        </h3>

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
                      {exp.userName && (
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                          Por: {exp.userName}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
