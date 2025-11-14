// src/pages/Productos.jsx
import React, { useEffect, useState } from "react";
import { queryProducts, subscribeProducts, addProduct, updateProduct, deleteProduct } from "../firebase";
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

export default function Productos({ profile }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [rowForm, setRowForm] = useState({ label: "", category: "", price: 0, active: true });
  const [newRow, setNewRow] = useState({ label: "", category: "", price: 0, active: true });
  const nav = useNavigate();

  const handleBackButton = () => {
    nav('/menu');
  };

  useEffect(() => {
    const unsub = subscribeProducts((items) => {
      setProducts(items);
      setLoading(false);
    }, false); // traer todos
    return () => unsub && unsub();
  }, []);

  const startEdit = (p) => {
    setEditingId(p.id);
    setRowForm({
      label: p.label || "",
      category: p.category || "",
      price: Number(p.price || 0),
      active: !!p.active
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowForm({ label: "", category: "", price: 0, active: true });
  };

  const saveEdit = async (id) => {
    try {
      await updateProduct(id, { label: rowForm.label, category: rowForm.category, price: Number(rowForm.price || 0), active: rowForm.active });
      cancelEdit();
      alert("Producto actualizado");
    } catch (err) {
      console.error("updateProduct error:", err);
      alert("Error actualizando producto: " + (err.message || err));
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Borrar producto "${p.label}"?`)) return;
    try {
      await deleteProduct(p.id);
      alert("Producto borrado");
    } catch (err) {
      console.error("deleteProduct error:", err);
      alert("Error borrando producto: " + (err.message || err));
    }
  };

  const handleAddNew = async () => {
    if (!newRow.label) { alert("Introduce nombre"); return; }
    try {
      await addProduct({ label: newRow.label, category: newRow.category, price: Number(newRow.price || 0), active: !!newRow.active });
      setNewRow({ label: "", category: "", price: 0, active: true });
      alert("Producto añadido");
    } catch (err) {
      console.error("addProduct error:", err);
      alert("Error añadiendo producto: " + (err.message || err));
    }
  };

  return (
    <div style={{padding:12}}>
      <BackButton onClick={handleBackButton} />
      <h3 style={{marginBottom:12}}>Productos</h3>

      <div style={{marginBottom:12}}>
        <h4 style={{marginBottom:8}}>Añadir producto</h4>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <input className="full-input" placeholder="Nombre" value={newRow.label} onChange={(e) => setNewRow(r => ({ ...r, label: e.target.value }))} />
          <input className="full-input" placeholder="Categoría" value={newRow.category} onChange={(e) => setNewRow(r => ({ ...r, category: e.target.value }))} />
          <input className="full-input" placeholder="Precio" type="number" step="0.01" value={newRow.price} onChange={(e) => setNewRow(r => ({ ...r, price: e.target.value }))} />
          <label style={{display:'flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={newRow.active} onChange={(e) => setNewRow(r => ({ ...r, active: e.target.checked }))} />
            Activo
          </label>
          <button className="btn-primary full" onClick={handleAddNew}>Añadir producto</button>
        </div>
      </div>

      {loading ? <div>Cargando...</div> : (
        <div style={{overflowX:'auto'}}>
          <table className="table-responsive" style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:8}}>Nombre</th>
                <th style={{padding:8}}>Categoría</th>
                <th style={{padding:8}}>Precio</th>
                <th style={{padding:8}}>Activo</th>
                <th style={{padding:8}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{borderTop:'1px solid #eee'}}>
                  <td style={{padding:8}}>
                    {editingId === p.id ? (
                      <input className="full-input" value={rowForm.label} onChange={(e) => setRowForm(r => ({ ...r, label: e.target.value }))} />
                    ) : p.label}
                  </td>
                  <td style={{padding:8}}>
                    {editingId === p.id ? (
                      <input className="full-input" value={rowForm.category} onChange={(e) => setRowForm(r => ({ ...r, category: e.target.value }))} />
                    ) : (p.category || "—")}
                  </td>
                  <td style={{padding:8, textAlign:'right'}}>
                    {editingId === p.id ? (
                      <input className="small-input" type="number" step="0.01" value={rowForm.price} onChange={(e) => setRowForm(r => ({ ...r, price: e.target.value }))} />
                    ) : (Number(p.price || 0).toFixed(2) + " €")}
                  </td>
                  <td style={{padding:8, textAlign:'center'}}>
                    {editingId === p.id ? (
                      <input type="checkbox" checked={rowForm.active} onChange={(e) => setRowForm(r => ({ ...r, active: e.target.checked }))} />
                    ) : (p.active ? "Sí" : "No")}
                  </td>
                  <td style={{padding:8}}>
                    {editingId === p.id ? (
                      <>
                        <button className="btn-primary" onClick={() => saveEdit(p.id)}>Guardar</button>
                        <button className="btn-ghost" onClick={cancelEdit} style={{marginLeft:8}}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-small" onClick={() => startEdit(p)}>Editar</button>
                        <button className="btn-ghost" onClick={() => handleDelete(p)} style={{marginLeft:8}}>Borrar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}