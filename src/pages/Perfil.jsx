// src/pages/Perfil.jsx
import React, { useState, useEffect } from "react";
import { updateUserProfile } from "../firebase";
import { useNavigate } from "react-router-dom";

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

export default function Perfil({ user, profile, onProfileUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    phone: "",
    birthDate: ""
  });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleBackButton = () => {
    nav('/menu');
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        birthDate: profile.birthDate || ""
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que todos los campos estén completos
    if (!formData.name || !formData.lastName || !formData.phone || !formData.birthDate) {
      alert("Todos los campos son obligatorios. Por favor, completa tu perfil.");
      return;
    }
    
    setLoading(true);
    try {
      await updateUserProfile(user.uid, formData);
      alert("Perfil actualizado correctamente");
      setEditing(false);
      // Recargar perfil
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      alert("Error actualizando perfil: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Restaurar valores originales
    setFormData({
      name: profile?.name || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      birthDate: profile?.birthDate || ""
    });
    setEditing(false);
  };

  // Verificar si el perfil está incompleto
  const isIncomplete = !profile?.name || !profile?.lastName || !profile?.phone || !profile?.birthDate;

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <BackButton onClick={handleBackButton} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Mi Perfil</h2>
      </div>

      {isIncomplete && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: 20,
          color: '#856404'
        }}>
          <strong>⚠️ Perfil incompleto</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
            Debes completar todos los campos de tu perfil para poder usar la aplicación.
          </p>
        </div>
      )}

      {!editing ? (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.email}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Nombre</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{profile?.name || "Sin nombre"}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Apellido</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{profile?.lastName || "Sin apellido"}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Teléfono</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{profile?.phone || "Sin teléfono"}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Fecha de nacimiento</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString() : "Sin fecha"}
            </div>
          </div>

          {!isIncomplete && (
            <button 
              className="btn-primary full" 
              onClick={() => setEditing(true)}
              style={{ marginTop: 20 }}
            >
              ✏️ Editar perfil
            </button>
          )}
          
          {isIncomplete && (
            <button 
              className="btn-primary full" 
              onClick={() => setEditing(true)}
              style={{ marginTop: 20, background: '#ffc107', color: '#000' }}
            >
              ⚠️ Completar perfil obligatorio
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4, color: "#666" }}>
              Email (no editable)
            </label>
            <input
              type="text"
              value={user?.email}
              disabled
              className="full-input"
              style={{ background: "#f5f5f5", cursor: "not-allowed" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Nombre *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="full-input"
              placeholder="Introduce tu nombre"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Apellido *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="full-input"
              placeholder="Introduce tu apellido"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Teléfono *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="full-input"
              placeholder="Introduce tu teléfono"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Fecha de nacimiento *
            </label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
              className="full-input"
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "Guardando..." : "💾 Guardar cambios"}
            </button>
            <button 
              type="button" 
              className="btn-ghost" 
              onClick={handleCancel}
              disabled={loading}
              style={{ flex: 1 }}
            >
              ❌ Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
