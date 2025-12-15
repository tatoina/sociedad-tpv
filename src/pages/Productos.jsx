// src/pages/Productos.jsx
import React, { useEffect, useState } from "react";
import { queryProducts, subscribeProducts, addProduct, updateProduct, deleteProduct } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Productos({ profile }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [rowForm, setRowForm] = useState({ label: "", category: "", price: 0, active: true });
  const [newRow, setNewRow] = useState({ label: "", category: "", price: 0, active: true });
  const nav = useNavigate();

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
      <div style={{
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        color: '#fff',
        padding: '16px 20px',
        borderRadius: '12px',
        marginBottom: 20,
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
      }}>
        <h3 style={{margin:0, fontSize:24, fontWeight:700}}>Gestión de Productos</h3>
      </div>

      <div style={{marginBottom:12}}>
        <div style={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: 12
        }}>
          <h4 style={{margin:0, fontSize:18, fontWeight:600}}>Añadir producto</h4>
        </div>
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
          <table style={{width:'100%', borderCollapse:'collapse', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                color: '#fff !important'
              }}>
                <th style={{textAlign:'left', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none'}}>Nombre</th>
                <th style={{textAlign:'left', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none'}}>Categoría</th>
                <th style={{textAlign:'right', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none'}}>Precio</th>
                <th style={{textAlign:'center', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none'}}>Activo</th>
                <th style={{textAlign:'left', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none'}}>Acciones</th>
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