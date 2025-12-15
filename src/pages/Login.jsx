// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerWithEmail, loginWithEmail, resetUserPassword } from "../firebase";

export default function Login() {
  const [mode, setMode] = useState("entrar"); // 'entrar' or 'registrarse'
  const [form, setForm] = useState({
    name: "",
    surname: "",
    dob: "",
    phone: "",
    email: "",
    password: ""
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen');
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2MB');
      return;
    }

    setPhotoFile(file);
    
    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerWithEmail({
        name: form.name,
        surname: form.surname,
        dob: form.dob,
        phone: form.phone,
        email: form.email
      }, form.password, photoFile);
      alert("Registro OK. Bienvenido.");
      nav("/menu");
    } catch (err) {
      console.error("Register error full:", err);
      alert(`Error registro: ${err.code || ""} — ${err.message || err}`);
    } finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithEmail(form.email, form.password);
      nav("/menu");
    } catch (err) {
      console.error("Login error full:", err);
      alert(`Error login: ${err.code || ""} — ${err.message || err}`);
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!form.email) {
      alert('Por favor introduce tu email primero');
      return;
    }

    if (!confirm(`¿Enviar email de recuperación a ${form.email}?`)) {
      return;
    }

    setLoading(true);
    try {
      await resetUserPassword(form.email);
      alert('Email enviado. Revisa tu bandeja de entrada (y spam) para restablecer tu contraseña.');
    } catch (err) {
      console.error("Reset password error:", err);
      alert(`Error: ${err.message || err}`);
    } finally { setLoading(false); }
  };

  // Layout requested: vertical order — Email, Contraseña, Entrar (button), Registrarse (button)
  // For 'registrarse' mode we show additional profile fields above the buttons.
  return (
    <div style={{ padding: 16, maxWidth: 420, margin: "0 auto" }}>
      <h3 style={{ marginBottom: 12 }}>Acceso</h3>

      <form
        onSubmit={mode === "entrar" ? handleLogin : handleRegister}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {/* If registering, show name fields above email/password */}
        {mode === "registrarse" && (
          <>
            <input className="full-input" name="name" value={form.name} onChange={onChange} placeholder="Nombre" required />
            <input className="full-input" name="surname" value={form.surname} onChange={onChange} placeholder="Apellidos" required />
            <input className="full-input" name="dob" value={form.dob} onChange={onChange} type="date" placeholder="Fecha de nacimiento" required />
            <input className="full-input" name="phone" value={form.phone} onChange={onChange} placeholder="Teléfono" required />
            
            {/* Foto */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                Foto (opcional)
              </label>
              {photoPreview && (
                <div style={{ marginBottom: 8 }}>
                  <img 
                    src={photoPreview} 
                    alt="Vista previa" 
                    style={{ 
                      width: 100, 
                      height: 100, 
                      objectFit: "cover", 
                      borderRadius: 8,
                      border: "1px solid #ddd"
                    }} 
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="full-input"
                style={{ padding: '6px' }}
              />
            </div>
          </>
        )}

        {/* Requested order: Email, Password, Entrar button, Registrarse button */}
        <input
          className="full-input"
          name="email"
          value={form.email}
          onChange={onChange}
          type="email"
          placeholder="Email"
          required
        />

        <input
          className="full-input"
          name="password"
          value={form.password}
          onChange={onChange}
          type="password"
          placeholder="Contraseña"
          required
        />

        <button className="btn-primary full" type="submit" disabled={loading}>
          {mode === "entrar" ? "Entrar" : "Registrarse"}
        </button>

        {/* Botón de restablecer contraseña solo en modo entrar */}
        {mode === "entrar" && (
          <button
            type="button"
            className="btn-ghost full"
            onClick={handleResetPassword}
            disabled={loading}
            style={{ fontSize: 13, color: '#1976d2' }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {/* Registrarse button below Entrar; toggles mode */}
        <button
          type="button"
          className="btn-ghost full"
          onClick={() => setMode(prev => (prev === "entrar" ? "registrarse" : "entrar"))}
          disabled={loading}
        >
          {mode === "entrar" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
        </button>
      </form>

      
    </div>
  );
}