// src/pages/Listados.jsx
import React, { useEffect, useState } from "react";
import { queryExpenses } from "../firebase";

function toDateInputValue(date) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

function parseDateInput(val) {
  if (!val) return null;
  // val expected like "2025-10-31T11:15"
  const dt = new Date(val);
  return isNaN(dt.getTime()) ? null : dt;
}

// Función para obtener el mes en formato "YYYY-MM"
function getMonthKey(date) {
  if (!date) return "Sin fecha";
  const d = date.toDate ? date.toDate() : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Función para formatear el mes de forma legible
function formatMonth(monthKey) {
  if (monthKey === "Sin fecha") return monthKey;
  const [year, month] = monthKey.split('-');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default function Listados({ user, profile }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState({});

  useEffect(() => {
    setIsAdmin(!!profile?.isAdmin);
  }, [profile]);

  const load = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const startDate = parseDateInput(start);
      const endDate = parseDateInput(end);
      // pasamos Date objects (Firestore code handles date fields that are Timestamps)
      const docs = await queryExpenses({
        uid: user?.uid,
        isAdmin: isAdmin,
        startDate: startDate,
        endDate: endDate
      });
      setResults(docs);
    } catch (err) {
      console.error("queryExpenses error:", err);
      alert("Error cargando listados: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // carga inicial (últimas 30) si quieres
  useEffect(() => {
    load();
  }, [user, profile]);

  // Agrupar resultados por mes y usuario
  const groupByMonthAndUser = () => {
    const grouped = {};
    
    results.forEach(r => {
      const date = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : (r.date ? (r.date.toDate ? r.date.toDate() : new Date(r.date)) : null);
      const monthKey = getMonthKey(date);
      const userKey = r.userEmail || r.uid || "Usuario desconocido";
      
      const key = `${monthKey}|${userKey}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          month: monthKey,
          user: userKey,
          total: 0,
          count: 0,
          expenses: []
        };
      }
      
      grouped[key].total += Number(r.amount || 0);
      grouped[key].count += 1;
      grouped[key].expenses.push(r);
    });
    
    // Convertir a array y ordenar por mes descendente
    return Object.values(grouped).sort((a, b) => {
      if (b.month === a.month) {
        return a.user.localeCompare(b.user);
      }
      return b.month.localeCompare(a.month);
    });
  };

  const toggleDetails = (monthKey, userKey) => {
    const key = `${monthKey}|${userKey}`;
    setExpandedDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const groupedData = groupByMonthAndUser();

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginBottom: 12 }}>Listados</h3>

      <form onSubmit={load} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
        <label style={{ fontSize: 14 }}>Desde (fecha y hora)</label>
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="full-input"
        />

        <label style={{ fontSize: 14 }}>Hasta (fecha y hora)</label>
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="full-input"
        />

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="btn-primary" type="submit">Buscar</button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setStart("");
              setEnd("");
              setResults([]);
              setExpandedDetails({});
            }}
          >
            Limpiar
          </button>
        </div>
      </form>

      <div style={{ marginTop: 18 }}>
        {loading ? <div>Cargando...</div> : (
          <div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              Total de gastos: {results.length} | Agrupaciones: {groupedData.length}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table-responsive" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>Mes</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Usuario</th>
                    <th style={{ textAlign: "center", padding: 8 }}>Gastos</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Total</th>
                    <th style={{ textAlign: "center", padding: 8 }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map(group => {
                    const key = `${group.month}|${group.user}`;
                    const isExpanded = expandedDetails[key];
                    
                    return (
                      <React.Fragment key={key}>
                        <tr style={{ borderTop: "2px solid #ddd", backgroundColor: "#f9f9f9" }}>
                          <td style={{ padding: 8, fontWeight: "500" }}>{formatMonth(group.month)}</td>
                          <td style={{ padding: 8 }}>{group.user}</td>
                          <td style={{ padding: 8, textAlign: "center" }}>{group.count}</td>
                          <td style={{ padding: 8, textAlign: "right", fontWeight: "600" }}>
                            {group.total.toFixed(2)} €
                          </td>
                          <td style={{ padding: 8, textAlign: "center" }}>
                            <button 
                              className="btn-small" 
                              onClick={() => toggleDetails(group.month, group.user)}
                            >
                              {isExpanded ? "Ocultar" : "Ver"}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && group.expenses.map(expense => {
                          const date = expense.createdAt && expense.createdAt.toDate ? expense.createdAt.toDate() : (expense.date ? (expense.date.toDate ? expense.date.toDate() : new Date(expense.date)) : null);
                          const dateStr = date ? date.toLocaleString() : "";
                          
                          return (
                            <tr key={expense.id} style={{ borderTop: "1px solid #eee", backgroundColor: "#fff" }}>
                              <td style={{ padding: 8, paddingLeft: 24, fontSize: 13 }}>{dateStr}</td>
                              <td style={{ padding: 8, fontSize: 13 }} colSpan="2">
                                {expense.item || (expense.productLines ? expense.productLines.map(pl => `${pl.qty}x ${pl.label}`).join(", ") : "")}
                              </td>
                              <td style={{ padding: 8, textAlign: "right", fontSize: 13 }}>
                                {Number(expense.amount || 0).toFixed(2)} €
                              </td>
                              <td></td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}