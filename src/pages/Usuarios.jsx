// src/pages/Usuarios.jsx
import React, { useEffect, useState } from "react";
import { queryAllUsers, updateUserProfile, resetUserPassword, uploadUserPhoto, deleteUserPhoto } from "../firebase";

export default function Usuarios({ profile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    surname: "",
    dob: "",
    phone: "",
    email: "", 
    photoURL: "",
    isAdmin: false 
  });
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await queryAllUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      alert("Error cargando usuarios: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || "",
      surname: user.surname || "",
      dob: user.dob || "",
      phone: user.phone || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      isAdmin: !!user.isAdmin
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ 
      name: "", 
      surname: "",
      dob: "",
      phone: "",
      email: "", 
      photoURL: "",
      isAdmin: false 
    });
  };

  const saveEdit = async (uid) => {
    try {
      await updateUserProfile(uid, {
        name: editForm.name,
        surname: editForm.surname,
        dob: editForm.dob,
        phone: editForm.phone,
        photoURL: editForm.photoURL,
        isAdmin: editForm.isAdmin
      });
      await loadUsers();
      cancelEdit();
      alert("Usuario actualizado correctamente");
    } catch (err) {
      console.error("Error actualizando usuario:", err);
      alert("Error actualizando usuario: " + (err.message || err));
    }
  };

  const handlePhotoUpload = async (e, uid) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen');
      e.target.value = '';
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2MB');
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      console.log("Componente: iniciando subida...");
      const photoURL = await uploadUserPhoto(uid, file);
      console.log("Componente: foto subida, URL recibida:", photoURL);
      setEditForm(prev => ({ ...prev, photoURL }));
      alert('Foto subida correctamente');
      e.target.value = ''; // Limpiar input
    } catch (err) {
      console.error("Error subiendo foto:", err);
      alert("Error subiendo foto: " + (err.message || err));
      e.target.value = ''; // Limpiar input
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async (uid) => {
    if (!confirm('¿Eliminar la foto del usuario?')) return;

    setUploadingPhoto(true);
    try {
      await deleteUserPhoto(uid);
      setEditForm(prev => ({ ...prev, photoURL: "" }));
      alert('Foto eliminada correctamente');
    } catch (err) {
      console.error("Error eliminando foto:", err);
      alert("Error eliminando foto: " + (err.message || err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleResetPassword = async (email) => {
    if (!confirm(`¿Enviar email de restablecimiento de contraseña a ${email}?`)) return;
    
    setResettingPassword(true);
    try {
      await resetUserPassword(email);
      alert(`Email de restablecimiento enviado a ${email}`);
    } catch (err) {
      console.error("Error restableciendo contraseña:", err);
      alert("Error: " + (err.message || err));
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginBottom: 12 }}>Gestión de Usuarios</h3>

      {loading ? (
        <div>Cargando usuarios...</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="table-responsive" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px", whiteSpace: "nowrap" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", whiteSpace: "nowrap" }}>Nombre</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", whiteSpace: "nowrap" }}>Admin</th>
                  <th style={{ textAlign: "center", padding: "8px 12px", whiteSpace: "nowrap" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                      {user.email}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {user.name || "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      {user.isAdmin ? "✓ Sí" : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <button className="btn-small" onClick={() => startEdit(user)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: "#666" }}>
                No hay usuarios registrados
              </div>
            )}
          </div>

          {/* Formulario de edición */}
          {editingId && (() => {
            const user = users.find(u => u.id === editingId);
            return (
              <div style={{ 
                marginTop: 20, 
                padding: 16, 
                background: "#f9f9f9", 
                borderRadius: 8,
                border: "2px solid #1976d2"
              }}>
                <h4 style={{ marginTop: 0, marginBottom: 16, color: "#1976d2" }}>
                  Editando usuario: {user?.email}
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Foto */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Foto
                    </label>
                    {editForm.photoURL && (
                      <div style={{ marginBottom: 8 }}>
                        <img 
                          src={editForm.photoURL} 
                          alt="Foto usuario" 
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
                    <div style={{ display: "flex", gap: 8 }}>
                      <label style={{ flex: 1 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, editingId)}
                          disabled={uploadingPhoto}
                          style={{ display: 'none' }}
                          id="photo-upload"
                        />
                        <button 
                          className="btn-small"
                          onClick={() => document.getElementById('photo-upload').click()}
                          disabled={uploadingPhoto}
                          style={{ width: '100%' }}
                        >
                          {uploadingPhoto ? 'Subiendo...' : '📎 Adjuntar foto'}
                        </button>
                      </label>
                      {editForm.photoURL && (
                        <button 
                          className="btn-small"
                          onClick={() => handlePhotoDelete(editingId)}
                          disabled={uploadingPhoto}
                          style={{ background: '#d32f2f' }}
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Email (solo lectura)
                    </label>
                    <input
                      className="full-input"
                      value={editForm.email}
                      disabled
                      style={{ background: "#e9e9e9", cursor: "not-allowed" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Nombre
                    </label>
                    <input
                      className="full-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del usuario"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Apellidos
                    </label>
                    <input
                      className="full-input"
                      value={editForm.surname}
                      onChange={(e) => setEditForm(prev => ({ ...prev, surname: e.target.value }))}
                      placeholder="Apellidos"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Fecha de nacimiento
                    </label>
                    <input
                      type="date"
                      className="full-input"
                      value={editForm.dob}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>
                      Teléfono
                    </label>
                    <input
                      className="full-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Teléfono"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>
                      Rol
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editForm.isAdmin}
                        onChange={(e) => setEditForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                      />
                      <span style={{ fontSize: 14 }}>Es administrador</span>
                    </label>
                  </div>

                  <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #ddd" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>
                      Contraseña
                    </label>
                    <button 
                      className="btn-ghost" 
                      onClick={() => handleResetPassword(editForm.email)}
                      disabled={resettingPassword}
                      style={{ width: "100%" }}
                    >
                      {resettingPassword ? "Enviando..." : "🔑 Enviar email de restablecimiento"}
                    </button>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      Se enviará un email al usuario para que pueda restablecer su contraseña
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn-primary" onClick={() => saveEdit(editingId)} style={{ flex: 1 }}>
                      Guardar cambios
                    </button>
                    <button className="btn-ghost" onClick={cancelEdit} style={{ flex: 1 }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 8, fontSize: 13 }}>
        <strong>Nota:</strong> Los usuarios se crean al registrarse desde la página de Login. 
        Aquí puedes editar el nombre, el rol de administrador y restablecer contraseñas.
      </div>
    </div>
  );
}
