/* eslint-disable react-hooks/exhaustive-deps */
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

export default function Listados({ user, profile }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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
            }}
          >
            Limpiar
          </button>
        </div>
      </form>

      <div style={{ marginTop: 18 }}>
        {loading ? <div>Cargando...</div> : (
          <div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Resultados: {results.length}</div>
            <div style={{ overflowX: "auto" }}>
              <table className="table-responsive" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>Fecha / Hora</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Usuario</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Detalle</th>
                    <th style={{ textAlign: "right", padding: 8 }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => {
                    const date = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : (r.date ? (r.date.toDate ? r.date.toDate() : new Date(r.date)) : null);
                    const dateStr = date ? date.toLocaleString() : "";
                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: 8, minWidth: 160 }}>{dateStr}</td>
                        <td style={{ padding: 8 }}>{r.userEmail || r.uid}</td>
                        <td style={{ padding: 8, maxWidth: 420 }}>{r.item || (r.productLines ? r.productLines.map(pl => `${pl.qty}x ${pl.label}`).join(", ") : "")}</td>
                        <td style={{ padding: 8, textAlign: "right" }}>{Number(r.amount || 0).toFixed(2)} €</td>
                      </tr>
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