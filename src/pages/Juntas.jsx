// src/pages/Juntas.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

// Las 5 juntas (índice 0 = Junta 1)
const JUNTAS = [
  { num: 1, miembros: ["GOÑI", "JOSEBA", "URDIAN", "IÑAKI MORA"] },
  { num: 2, miembros: ["JAVILO", "MIKEL LOPEZ", "IGOR", "INA"] },
  { num: 3, miembros: ["RUBEN VICENTE", "ANSORENA", "SENO", "VICTOR MORA"] },
  { num: 4, miembros: ["DANI", "BURZIO", "GUSI", "CHIFAS"] },
  { num: 5, miembros: ["VIDU", "MIKEL ASTIZ", "VICTOR MARTIN"] },
];

// Año base del ciclo: Junta 1 comenzó en agosto de 2022
const BASE_YEAR = 2022;

/**
 * Devuelve el índice (0-4) de la junta activa hoy.
 * El año de junta va de agosto a julio del año siguiente.
 */
function getCurrentJuntaIndex() {
  const now = new Date();
  const month = now.getMonth(); // 0=ene … 11=dic
  const year = now.getFullYear();
  // Si estamos de agosto en adelante, el "año de junta" es el año actual
  // Si estamos antes de agosto, el "año de junta" es el año anterior
  const juntaYear = month >= 7 ? year : year - 1;
  const offset = juntaYear - BASE_YEAR;
  // módulo real (para evitar negativos en el futuro lejano)
  return ((offset % JUNTAS.length) + JUNTAS.length) % JUNTAS.length;
}

/**
 * Devuelve el rango de años de una junta dado su índice en el ciclo.
 * El ciclo arranca en BASE_YEAR. Para mostrar años pasados y futuros,
 * calculamos cuántos ciclos completos han pasado respecto al año actual.
 */
function getJuntaYears(juntaIndex) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const currentJuntaYear = month >= 7 ? year : year - 1;
  const currentJuntaIndex = getCurrentJuntaIndex();

  // diferencia de posición en el ciclo respecto a la activa
  let diff = juntaIndex - currentJuntaIndex;
  // normalizamos a -2..+2 para mostrar el ciclo más cercano
  if (diff > Math.floor(JUNTAS.length / 2)) diff -= JUNTAS.length;
  if (diff < -Math.floor(JUNTAS.length / 2)) diff += JUNTAS.length;

  const startYear = currentJuntaYear + diff;
  return { startYear, endYear: startYear + 1 };
}

export default function Juntas() {
  const nav = useNavigate();
  const currentIdx = getCurrentJuntaIndex();

  return (
    <div style={{ padding: "16px 12px", maxWidth: 500, margin: "0 auto" }}>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => nav(-1)}
          style={{
            background: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 14,
            cursor: "pointer",
            color: "#374151",
            fontWeight: 600,
          }}
        >
          ← Volver
        </button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
          🏛️ Juntas
        </h2>
      </div>

      {/* Descripción */}
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
        Cada junta ejerce de <strong>agosto a julio</strong> del año siguiente.
        La junta activa aparece resaltada.
      </p>

      {/* Lista de juntas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {JUNTAS.map((junta, idx) => {
          const isActive = idx === currentIdx;
          const { startYear, endYear } = getJuntaYears(idx);
          const isPast = startYear < (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1);

          return (
            <div
              key={junta.num}
              style={{
                borderRadius: 16,
                border: isActive
                  ? "2px solid #f59e0b"
                  : isPast
                  ? "1px solid #e5e7eb"
                  : "1px solid #dbeafe",
                background: isActive
                  ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)"
                  : isPast
                  ? "#f9fafb"
                  : "#eff6ff",
                padding: "16px 18px",
                boxShadow: isActive
                  ? "0 4px 16px rgba(245,158,11,0.25)"
                  : "0 1px 4px rgba(0,0,0,0.06)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Fila superior: número + badge actual + años */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isActive
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : isPast
                        ? "#9ca3af"
                        : "#3b82f6",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {junta.num}
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: isActive ? "#92400e" : isPast ? "#6b7280" : "#1e3a8a",
                    }}
                  >
                    Junta {junta.num}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        background: "#f59e0b",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 20,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      ★ ACTUAL
                    </span>
                  )}
                  {isPast && (
                    <span
                      style={{
                        background: "#e5e7eb",
                        color: "#6b7280",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 20,
                      }}
                    >
                      Completada
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActive ? "#b45309" : "#6b7280",
                    background: isActive ? "#fde68a" : "#f3f4f6",
                    padding: "4px 10px",
                    borderRadius: 20,
                    whiteSpace: "nowrap",
                  }}
                >
                  Ago {startYear} – Jul {endYear}
                </span>
              </div>

              {/* Miembros */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {junta.miembros.map((m, i) => (
                  <span
                    key={i}
                    style={{
                      background: isActive ? "#fef9e7" : isPast ? "#f3f4f6" : "#dbeafe",
                      border: isActive
                        ? "1px solid #fcd34d"
                        : isPast
                        ? "1px solid #e5e7eb"
                        : "1px solid #bfdbfe",
                      color: isActive ? "#92400e" : isPast ? "#4b5563" : "#1e40af",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "5px 12px",
                      borderRadius: 20,
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pie: siguiente junta */}
      <div
        style={{
          marginTop: 24,
          padding: "14px 16px",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 12,
          fontSize: 13,
          color: "#166534",
          lineHeight: 1.6,
        }}
      >
        <strong>Próxima junta:</strong>{" "}
        {(() => {
          const nextIdx = (currentIdx + 1) % JUNTAS.length;
          const { startYear } = getJuntaYears((currentIdx + 1) % JUNTAS.length);
          return `Junta ${JUNTAS[nextIdx].num} — ${JUNTAS[nextIdx].miembros.join(", ")} (agosto ${startYear})`;
        })()}
      </div>
    </div>
  );
}
