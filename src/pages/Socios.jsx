// src/pages/Socios.jsx
import React, { useState, useEffect } from "react";
import { queryAllUsers, updateUserProfile, resetUserPassword as sendPasswordReset } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Socios({ user, profile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await queryAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setMessage("Error cargando usuarios: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (u) => {
    setEditingUser({
      id: u.id,
      name: u.name || "",
      lastName: u.lastName || "",
      phone: u.phone || "",
      birthDate: u.birthDate || "",
      isAdmin: u.isAdmin || false,
      email: u.email || ""
    });
  };

  const handleSaveUser = async () => {
    try {
      if (!editingUser) return;
      
      const { id, email, ...updateData } = editingUser;
      await updateUserProfile(id, updateData);
      
      setMessage("Usuario actualizado correctamente");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      console.error("Error actualizando usuario:", err);
      setMessage("Error actualizando usuario: " + err.message);
    }
  };

  const handleResetPassword = async (email, userName) => {
    try {
      const result = await sendPasswordReset(email);
      if (result.success) {
        setMessage(`Email de restablecimiento enviado a ${userName} (${email})`);
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (err) {
      console.error("Error restableciendo contraseña:", err);
      setMessage("Error enviando email de restablecimiento");
    }
  };

  const filteredUsers = users.filter(u => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(searchLower) ||
      (u.lastName || "").toLowerCase().includes(searchLower) ||
      (u.email || "").toLowerCase().includes(searchLower) ||
      (u.phone || "").toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('es-ES');
    } catch {
      return "N/A";
    }
  };

  if (loading) return <div style={{padding: 16}}>Cargando usuarios...</div>;

  return (
    <div style={{padding: 16}}>
      <h2>Gestión de Socios</h2>
      
      {message && (
        <div style={{
          padding: 12,
          margin: "12px 0",
          backgroundColor: message.includes("Error") ? "#ffebee" : "#e8f5e8",
          color: message.includes("Error") ? "#c62828" : "#2e7d32",
          borderRadius: 4,
          border: `1px solid ${message.includes("Error") ? "#ffcdd2" : "#c8e6c9"}`
        }}>
          {message}
          <button 
            onClick={() => setMessage("")}
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Filtro de búsqueda */}
      <div style={{marginBottom: 16}}>
        <input
          type="text"
          placeholder="Buscar por nombre, apellidos, email o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: 8,
            border: "1px solid #ddd",
            borderRadius: 4
          }}
        />
      </div>

      {/* Estadísticas generales */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{
          padding: 12,
          backgroundColor: "#f5f5f5",
          borderRadius: 6,
          textAlign: "center"
        }}>
          <div style={{fontSize: 24, fontWeight: "bold", color: "#1976d2"}}>
            {filteredUsers.length}
          </div>
          <div style={{fontSize: 12, color: "#666"}}>
            Socios{searchTerm ? " (filtrados)" : ""}
          </div>
        </div>
        <div style={{
          padding: 12,
          backgroundColor: "#f5f5f5",
          borderRadius: 6,
          textAlign: "center"
        }}>
          <div style={{fontSize: 24, fontWeight: "bold", color: "#388e3c"}}>
            {filteredUsers.filter(u => u.isAdmin).length}
          </div>
          <div style={{fontSize: 12, color: "#666"}}>Administradores</div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div style={{overflowX: "auto"}}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <thead>
            <tr style={{backgroundColor: "#f8f9fa"}}>
              <th style={{padding: 12, textAlign: "left", borderBottom: "2px solid #dee2e6"}}>Usuario</th>
              <th style={{padding: 12, textAlign: "left", borderBottom: "2px solid #dee2e6"}}>Contacto</th>
              <th style={{padding: 12, textAlign: "left", borderBottom: "2px solid #dee2e6"}}>Rol</th>
              <th style={{padding: 12, textAlign: "left", borderBottom: "2px solid #dee2e6"}}>Registro</th>
              <th style={{padding: 12, textAlign: "center", borderBottom: "2px solid #dee2e6"}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              return (
                <tr key={u.id} style={{borderBottom: "1px solid #dee2e6"}}>
                  <td style={{padding: 12}}>
                    <div style={{fontWeight: "bold"}}>
                      {u.name || "Sin nombre"} {u.lastName || ""}
                    </div>
                    <div style={{fontSize: 12, color: "#666"}}>
                      {u.email}
                    </div>
                  </td>
                  <td style={{padding: 12}}>
                    <div>{u.phone || "Sin teléfono"}</div>
                    <div style={{fontSize: 12, color: "#666"}}>
                      Nacimiento: {u.birthDate || "N/A"}
                    </div>
                  </td>
                  <td style={{padding: 12}}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 12,
                      backgroundColor: u.isAdmin ? "#e3f2fd" : "#f3e5f5",
                      color: u.isAdmin ? "#1565c0" : "#7b1fa2"
                    }}>
                      {u.isAdmin ? "Admin" : "Usuario"}
                    </span>
                  </td>
                  <td style={{padding: 12}}>
                    <div style={{fontSize: 12, color: "#666"}}>
                      {formatDate(u.createdAt)}
                    </div>
                  </td>
                  <td style={{padding: 12, textAlign: "center"}}>
                    <div style={{display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap"}}>
                      <button
                        onClick={() => handleEditUser(u)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          backgroundColor: "#1976d2",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer"
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleResetPassword(u.email, u.name || "usuario")}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          backgroundColor: "#f57c00",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer"
                        }}
                      >
                        Reset Pass
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: 40,
          color: "#666"
        }}>
          {searchTerm ? "No se encontraron usuarios que coincidan con la búsqueda" : "No hay usuarios registrados"}
        </div>
      )}

      {/* Modal de edición */}
      {editingUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "#fff",
            padding: 24,
            borderRadius: 8,
            maxWidth: 500,
            width: "90%",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h3>Editar Usuario</h3>
            
            <div style={{marginBottom: 12}}>
              <label style={{display: "block", marginBottom: 4, fontWeight: "bold"}}>
                Email (no editable):
              </label>
              <input
                type="email"
                value={editingUser.email}
                disabled
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  backgroundColor: "#f5f5f5"
                }}
              />
            </div>

            <div style={{marginBottom: 12}}>
              <label style={{display: "block", marginBottom: 4, fontWeight: "bold"}}>
                Nombre:
              </label>
              <input
                type="text"
                value={editingUser.name}
                onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 4
                }}
              />
            </div>

            <div style={{marginBottom: 12}}>
              <label style={{display: "block", marginBottom: 4, fontWeight: "bold"}}>
                Apellidos:
              </label>
              <input
                type="text"
                value={editingUser.lastName}
                onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 4
                }}
              />
            </div>

            <div style={{marginBottom: 12}}>
              <label style={{display: "block", marginBottom: 4, fontWeight: "bold"}}>
                Teléfono:
              </label>
              <input
                type="tel"
                value={editingUser.phone}
                onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 4
                }}
              />
            </div>

            <div style={{marginBottom: 12}}>
              <label style={{display: "block", marginBottom: 4, fontWeight: "bold"}}>
                Fecha de Nacimiento:
              </label>
              <input
                type="date"
                value={editingUser.birthDate}
                onChange={(e) => setEditingUser({...editingUser, birthDate: e.target.value})}
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 4
                }}
              />
            </div>

            <div style={{marginBottom: 20}}>
              <label style={{display: "flex", alignItems: "center", gap: 8}}>
                <input
                  type="checkbox"
                  checked={editingUser.isAdmin}
                  onChange={(e) => setEditingUser({...editingUser, isAdmin: e.target.checked})}
                />
                <span style={{fontWeight: "bold"}}>Es Administrador</span>
              </label>
            </div>

            <div style={{display: "flex", gap: 12, justifyContent: "flex-end"}}>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#666",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}