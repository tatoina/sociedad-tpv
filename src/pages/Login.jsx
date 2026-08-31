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

  // Layout: logo+nombre flotante arriba, card form abajo. Estilo sociedad gastronómica.
  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    display: 'block',
    color: '#8A7E72',
    textTransform: 'uppercase',
    letterSpacing: '0.6px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF8F5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px'
    }}>
      {/* Cabecera identidad */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img
          src="/icons/logoAbaigar.png"
          alt="Abaigar"
          style={{
            width: 88,
            height: 88,
            objectFit: 'contain',
            filter: 'drop-shadow(0 3px 6px rgba(44,31,20,0.18))'
          }}
        />
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 30,
          fontWeight: 700,
          color: '#2C1F14',
          margin: '12px 0 4px'
        }}>
          Abaigar
        </h1>
        <p style={{
          fontSize: 11,
          color: '#8A7E72',
          margin: 0,
          letterSpacing: '2.5px',
          textTransform: 'uppercase'
        }}>
          Sociedad Gastronómica
        </p>
      </div>

      {/* Card formulario */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 6,
        padding: '28px 28px 24px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 2px 20px rgba(44,31,20,0.10)',
        border: '1px solid #E8DDD5'
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          margin: '0 0 4px 0',
          fontSize: 22,
          fontWeight: 700,
          color: '#2C1F14'
        }}>
          {mode === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p style={{ margin: '0 0 22px 0', fontSize: 13, color: '#8A7E72' }}>
          {mode === 'entrar' ? 'Accede a tu área personal' : 'Completa tus datos para registrarte'}
        </p>

        <form
          onSubmit={mode === "entrar" ? handleLogin : handleRegister}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {mode === "registrarse" && (
            <>
              <div>
                <label style={labelStyle}>Nombre <span style={{ color: '#c0392b' }}>*</span></label>
                <input className="full-input" name="name" value={form.name} onChange={onChange} placeholder="Tu nombre" required />
              </div>
              <div>
                <label style={labelStyle}>Apellidos <span style={{ color: '#c0392b' }}>*</span></label>
                <input className="full-input" name="surname" value={form.surname} onChange={onChange} placeholder="Tus apellidos" required />
              </div>
              <div>
                <label style={labelStyle}>Fecha de nacimiento <span style={{ color: '#c0392b' }}>*</span></label>
                <input className="full-input" name="dob" value={form.dob} onChange={onChange} type="date" required />
              </div>
              <div>
                <label style={labelStyle}>Teléfono <span style={{ color: '#c0392b' }}>*</span></label>
                <input className="full-input" name="phone" value={form.phone} onChange={onChange} placeholder="+34 600 000 000" type="tel" required />
              </div>
              <div>
                <label style={labelStyle}>Foto de perfil</label>
                {photoPreview && (
                  <div style={{ marginBottom: 10, textAlign: 'center' }}>
                    <img
                      src={photoPreview}
                      alt="Vista previa"
                      style={{
                        width: 80, height: 80, objectFit: 'cover',
                        borderRadius: '50%', border: '2px solid #D4C9BC'
                      }}
                    />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="full-input" style={{ padding: '8px', fontSize: 13 }} />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Email <span style={{ color: '#c0392b' }}>*</span></label>
            <input className="full-input" name="email" value={form.email} onChange={onChange} type="email" placeholder="tu@email.com" required />
          </div>

          <div>
            <label style={labelStyle}>Contraseña <span style={{ color: '#c0392b' }}>*</span></label>
            <input className="full-input" name="password" value={form.password} onChange={onChange} type="password" placeholder="••••••••" required />
          </div>

          <button
            className="btn-primary full"
            type="submit"
            disabled={loading}
            style={{ marginTop: 6, padding: '13px 24px', fontSize: 15, fontWeight: 700, letterSpacing: '0.5px' }}
          >
            {loading ? 'Cargando...' : (mode === 'entrar' ? 'Entrar' : 'Crear cuenta')}
          </button>

          {mode === 'entrar' && (
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#8B6340', textDecoration: 'underline',
                padding: '4px 0', textAlign: 'center'
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <div style={{ marginTop: 6, paddingTop: 14, borderTop: '1px solid #EDE4DA', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setMode(prev => (prev === 'entrar' ? 'registrarse' : 'entrar'))}
              disabled={loading}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8B6340', fontWeight: 600 }}
            >
              {mode === 'entrar' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}