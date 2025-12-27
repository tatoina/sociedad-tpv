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
    <div style={{ 
      padding: 20, 
      maxWidth: 480, 
      margin: "0 auto",
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: 28, 
          fontWeight: 700, 
          color: '#111827',
          textAlign: 'center'
        }}>
          {mode === "entrar" ? "Iniciar Sesión" : "Crear Cuenta"}
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: 14,
          color: '#6b7280',
          textAlign: 'center'
        }}>
          {mode === "entrar" 
            ? "Accede a tu cuenta de la Sociedad" 
            : "Completa tus datos para registrarte"}
        </p>

        <form
          onSubmit={mode === "entrar" ? handleLogin : handleRegister}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* If registering, show name fields above email/password */}
          {mode === "registrarse" && (
            <>
              <div>
                <label style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  marginBottom: 6, 
                  display: "block", 
                  color: "#374151" 
                }}>
                  Nombre <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  className="full-input" 
                  name="name" 
                  value={form.name} 
                  onChange={onChange} 
                  placeholder="Tu nombre" 
                  required 
                />
              </div>

              <div>
                <label style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  marginBottom: 6, 
                  display: "block", 
                  color: "#374151" 
                }}>
                  Apellidos <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  className="full-input" 
                  name="surname" 
                  value={form.surname} 
                  onChange={onChange} 
                  placeholder="Tus apellidos" 
                  required 
                />
              </div>

              <div>
                <label style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  marginBottom: 6, 
                  display: "block", 
                  color: "#374151" 
                }}>
                  Fecha de nacimiento <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  className="full-input" 
                  name="dob" 
                  value={form.dob} 
                  onChange={onChange} 
                  type="date" 
                  required 
                />
              </div>

              <div>
                <label style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  marginBottom: 6, 
                  display: "block", 
                  color: "#374151" 
                }}>
                  Teléfono <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  className="full-input" 
                  name="phone" 
                  value={form.phone} 
                  onChange={onChange} 
                  placeholder="+34 600 000 000" 
                  type="tel"
                  required 
                />
              </div>
            
              {/* Foto */}
              <div>
                <label style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  marginBottom: 6, 
                  display: "block",
                  color: "#374151"
                }}>
                  Foto de perfil
                </label>
                {photoPreview && (
                  <div style={{ marginBottom: 12, textAlign: 'center' }}>
                    <img 
                      src={photoPreview} 
                      alt="Vista previa" 
                      style={{ 
                        width: 120, 
                        height: 120, 
                        objectFit: "cover", 
                        borderRadius: '50%',
                        border: "3px solid #e5e7eb",
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="full-input"
                  style={{ padding: '8px', fontSize: 13 }}
                />
              </div>
            </>
          )}

          {/* Email and Password fields */}
          <div>
            <label style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              marginBottom: 6, 
              display: "block", 
              color: "#374151" 
            }}>
              Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="full-input"
              name="email"
              value={form.email}
              onChange={onChange}
              type="email"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              marginBottom: 6, 
              display: "block", 
              color: "#374151" 
            }}>
              Contraseña <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="full-input"
              name="password"
              value={form.password}
              onChange={onChange}
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            className="btn-primary full" 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            {loading ? '⏳ Cargando...' : (mode === "entrar" ? "Entrar" : "Crear cuenta")}
          </button>

          {/* Botón de restablecer contraseña solo en modo entrar */}
          {mode === "entrar" && (
            <button
              type="button"
              className="btn-ghost full"
              onClick={handleResetPassword}
              disabled={loading}
              style={{ 
                fontSize: 14, 
                color: '#1976d2',
                padding: '8px 16px'
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {/* Registrarse button below Entrar; toggles mode */}
          <div style={{
            marginTop: 8,
            paddingTop: 16,
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <button
              type="button"
              className="btn-ghost full"
              onClick={() => setMode(prev => (prev === "entrar" ? "registrarse" : "entrar"))}
              disabled={loading}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: '8px 16px'
              }}
            >
              {mode === "entrar" ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}