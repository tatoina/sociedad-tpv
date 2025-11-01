// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerWithEmail, loginWithEmail } from "../firebase";

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
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
      }, form.password);
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
          Entrar
        </button>

        {/* Registrarse button below Entrar; toggles mode */}
        <button
          type="button"
          className="btn-ghost full"
          onClick={() => setMode(prev => (prev === "entrar" ? "registrarse" : "entrar"))}
          disabled={loading && mode === "registrarse"}
        >
          {mode === "entrar" ? "Registrarse" : "Volver a Entrar"}
        </button>
      </form>

      
    </div>
  );
}