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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("label");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedProducts = products
    .filter(p => !p.label.startsWith("[Categoría]")) // Excluir productos placeholder de categorías
    .filter(p => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (p.label || "").toLowerCase().includes(searchLower) ||
        (p.category || "").toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortField === "price") {
        aVal = Number(a.price || 0);
        bVal = Number(b.price || 0);
      } else if (sortField === "active") {
        aVal = a.active ? 1 : 0;
        bVal = b.active ? 1 : 0;
      } else {
        aVal = (a[sortField] || "").toString().toLowerCase();
        bVal = (b[sortField] || "").toString().toLowerCase();
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const existingCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

  const handleCategoryChange = (value) => {
    if (value === "__NEW__") {
      setShowNewCategory(true);
      setNewRow(r => ({ ...r, category: "" }));
    } else {
      setShowNewCategory(false);
      setNewRow(r => ({ ...r, category: value }));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Introduce un nombre para la categoría");
      return;
    }
    if (existingCategories.includes(newCategoryName.trim())) {
      alert("Esta categoría ya existe");
      return;
    }
    try {
      // Crear un producto placeholder para la categoría
      await addProduct({ 
        label: `[Categoría] ${newCategoryName.trim()}`, 
        category: newCategoryName.trim(), 
        price: 0, 
        active: false 
      });
      setNewCategoryName("");
      alert(`Categoría "${newCategoryName.trim()}" creada correctamente`);
    } catch (err) {
      console.error("Error creando categoría:", err);
      alert("Error creando categoría: " + (err.message || err));
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    const productsInCategory = products.filter(p => p.category === categoryName && !p.label.startsWith("[Categoría]"));
    if (productsInCategory.length > 0) {
      alert(`No se puede eliminar la categoría "${categoryName}" porque tiene ${productsInCategory.length} producto(s) asociado(s)`);
      return;
    }
    if (!confirm(`¿Eliminar la categoría "${categoryName}"?`)) return;
    try {
      // Eliminar el producto placeholder de la categoría
      const categoryProduct = products.find(p => p.category === categoryName && p.label.startsWith("[Categoría]"));
      if (categoryProduct) {
        await deleteProduct(categoryProduct.id);
      }
      alert(`Categoría "${categoryName}" eliminada`);
    } catch (err) {
      console.error("Error eliminando categoría:", err);
      alert("Error eliminando categoría: " + (err.message || err));
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
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setShowCategoryManager(!showCategoryManager)}
        >
          <h4 style={{margin:0, fontSize:18, fontWeight:600}}>📁 Gestionar Categorías</h4>
          <span style={{fontSize:20}}>{showCategoryManager ? '▼' : '▶'}</span>
        </div>
        
        {showCategoryManager && (
          <div style={{marginBottom:20, padding:16, background:'#f9fafb', borderRadius:8, border:'2px solid #10b981'}}>
            <div style={{marginBottom:16}}>
              <div style={{display:'flex', gap:8, marginBottom:12}}>
                <input 
                  className="full-input" 
                  placeholder="Nombre de la nueva categoría" 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  style={{flex:1}}
                />
                <button 
                  className="btn-primary" 
                  onClick={handleAddCategory}
                  style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', whiteSpace:'nowrap'}}
                >
                  ➕ Crear Categoría
                </button>
              </div>
            </div>
            
            <div style={{marginTop:16}}>
              <h5 style={{margin:'0 0 12px 0', fontSize:15, fontWeight:600, color:'#374151'}}>Categorías existentes:</h5>
              {existingCategories.length === 0 ? (
                <p style={{color:'#6b7280', fontSize:14, margin:0}}>No hay categorías creadas</p>
              ) : (
                <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                  {existingCategories.map(cat => {
                    const count = products.filter(p => p.category === cat && !p.label.startsWith("[Categoría]")).length;
                    return (
                      <div 
                        key={cat} 
                        style={{
                          display:'flex',
                          alignItems:'center',
                          gap:8,
                          padding:'8px 12px',
                          background:'#fff',
                          border:'2px solid #e5e7eb',
                          borderRadius:8,
                          fontSize:14
                        }}
                      >
                        <span style={{fontWeight:600}}>{cat}</span>
                        <span style={{color:'#6b7280', fontSize:12}}>({count} productos)</span>
                        {count === 0 && (
                          <button 
                            onClick={() => handleDeleteCategory(cat)}
                            style={{
                              background:'#ef4444',
                              color:'#fff',
                              border:'none',
                              borderRadius:4,
                              padding:'4px 8px',
                              fontSize:12,
                              cursor:'pointer',
                              fontWeight:600
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
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
          
          {showNewCategory ? (
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input 
                className="full-input" 
                placeholder="Nueva categoría" 
                value={newRow.category} 
                onChange={(e) => setNewRow(r => ({ ...r, category: e.target.value }))} 
                autoFocus
              />
              <button 
                className="btn-ghost" 
                onClick={() => {
                  setShowNewCategory(false);
                  setNewRow(r => ({ ...r, category: "" }));
                }}
                style={{whiteSpace:'nowrap'}}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <select 
              className="full-input" 
              value={newRow.category} 
              onChange={(e) => handleCategoryChange(e.target.value)}
              style={{padding:'8px', fontSize:14, border:'1px solid #ddd', borderRadius:4}}
            >
              <option value="">Seleccionar categoría...</option>
              {existingCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="__NEW__" style={{fontWeight:'bold', color:'#1976d2'}}>+ Nueva categoría...</option>
            </select>
          )}
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              className="full-input" 
              placeholder="Precio" 
              type="number" 
              step="0.01" 
              value={newRow.price} 
              onChange={(e) => setNewRow(r => ({ ...r, price: e.target.value }))} 
              onBlur={(e) => {
                if (e.target.value === '' || Number(e.target.value) < 0) {
                  setNewRow(r => ({ ...r, price: '' }));
                }
              }}
              style={{ paddingRight: '28px' }}
            />
            <span style={{ position: 'absolute', right: 12, fontSize: 14, color: '#6b7280', pointerEvents: 'none' }}>€</span>
          </div>
          <label style={{display:'flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={newRow.active} onChange={(e) => setNewRow(r => ({ ...r, active: e.target.checked }))} />
            Activo
          </label>
          <button className="btn-primary full" onClick={handleAddNew}>Añadir producto</button>
        </div>
      </div>

      {loading ? <div>Cargando...</div> : (
        <>
          <div style={{marginBottom: 16}}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#1976d2'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <div style={{marginTop: 8, fontSize: 13, color: '#6b7280'}}>
              Mostrando {filteredAndSortedProducts.length} de {products.filter(p => !p.label.startsWith("[Categoría]")).length} productos
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
              <thead>
                <tr style={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: '#fff !important'
                }}>
                  <th 
                    onClick={() => handleSort('label')} 
                    style={{textAlign:'left', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none', cursor: 'pointer', userSelect: 'none'}}
                  >
                    Nombre {sortField === 'label' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('category')} 
                    style={{textAlign:'left', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none', cursor: 'pointer', userSelect: 'none'}}
                  >
                    Categoría {sortField === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('price')} 
                    style={{textAlign:'right', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none', cursor: 'pointer', userSelect: 'none'}}
                  >
                    Precio {sortField === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('active')} 
                    style={{textAlign:'center', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none', cursor: 'pointer', userSelect: 'none'}}
                  >
                    Activo {sortField === 'active' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{textAlign:'left', padding:12, fontWeight:600, color: '#fff', borderBottom: 'none'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProducts.map(p => (
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
                      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        <input 
                          className="small-input" 
                          type="number" 
                          step="0.01" 
                          value={rowForm.price} 
                          onChange={(e) => setRowForm(r => ({ ...r, price: e.target.value }))} 
                          onBlur={(e) => {
                            if (e.target.value === '' || Number(e.target.value) < 0) {
                              setRowForm(r => ({ ...r, price: '' }));
                            }
                          }}
                          style={{ paddingRight: '22px', width: '100px' }}
                        />
                        <span style={{ position: 'absolute', right: 8, fontSize: 13, color: '#6b7280', pointerEvents: 'none' }}>€</span>
                      </div>
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
        </>
      )}
    </div>
  );
}