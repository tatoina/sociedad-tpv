// src/pages/Tpv.jsx
import React, { useEffect, useState } from "react";
import { 
  subscribeProducts, 
  addSale, 
  queryExpenses, 
  updateExpense, 
  deleteExpense,
  getUserFavorites,
  toggleFavoriteProduct,
  getAllSocios
} from "../firebase";
import { useNavigate } from "react-router-dom";

// util: agrupar líneas por productId o label+price
function groupProductLines(lines = []) {
  const map = new Map();
  for (const l of lines) {
    const key = l.productId ? `id:${l.productId}` : `lbl:${(l.label||"").trim()}::${Number(l.price||0).toFixed(2)}`;
    const qty = Number(l.qty || 1);
    const price = Number(l.price || 0);
    const existing = map.get(key);
    if (existing) {
      existing.qty += qty;
    } else {
      map.set(key, { productId: l.productId || null, label: l.label || "", price, qty });
    }
  }
  return Array.from(map.values());
}

// fecha helpers
function toInputDateTime(value) {
  if (!value) return "";
  const d = value.toDate ? value.toDate() : new Date(value);
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return iso.slice(0, 16);
}
function fromInputDateTime(val) {
  if (!val) return null;
  return new Date(val);
}

export default function TPV({ user, profile }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingSave, setLoadingSave] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showProducts, setShowProducts] = useState(true);
  const [isForSociedad, setIsForSociedad] = useState(false);
  const [socios, setSocios] = useState([]);
  const [selectedSocios, setSelectedSocios] = useState({});
  const [attendeesCount, setAttendeesCount] = useState({});
  const nav = useNavigate();

  useEffect(() => {
    const unsub = subscribeProducts(setProducts, true);
    return () => unsub && unsub();
  }, []);

  // Cargar favoritos del usuario
  useEffect(() => {
    let mounted = true;
    const loadFavorites = async () => {
      if (user && user.uid) {
        try {
          const userFavorites = await getUserFavorites(user.uid);
          if (mounted) setFavorites(userFavorites);
        } catch (err) {
          console.error("Error loading favorites:", err);
        }
      }
    };
    loadFavorites();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const docs = await queryExpenses({ uid: user?.uid, isAdmin: false });
        if (!mounted) return;
        const items = docs.map(d => ({
          ...d,
          createdAtStr: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : (d.createdAt || ""),
          dateInput: toInputDateTime(d.date || d.createdAt)
        }));
        setHistory(items);
      } catch (err) {
        console.error("queryExpenses load error:", err);
      }
    };
    if (user && user.uid) load();
    return () => { mounted = false; };
  }, [user]);

  // Cargar socios cuando se activa el modo sociedad
  useEffect(() => {
    let mounted = true;
    const loadSocios = async () => {
      if (isForSociedad) {
        try {
          const allSocios = await getAllSocios();
          console.log('🔍 Socios obtenidos:', allSocios);
          if (mounted) {
            setSocios(allSocios);
            // Inicializar todos como seleccionados por defecto
            const initialSelection = {};
            const initialAttendees = {};
            allSocios.forEach(s => { 
              initialSelection[s.id] = true; 
              initialAttendees[s.id] = 1;
            });
            setSelectedSocios(initialSelection);
            setAttendeesCount(initialAttendees);
          }
        } catch (err) {
          console.error("Error loading socios:", err);
        }
      }
    };
    loadSocios();
    return () => { mounted = false; };
  }, [isForSociedad]);

  if (!user) return <div>No autenticado</div>;
  if (profile?.isAdmin) return <div>Los administradores no pueden usar TPV. Usa "Listados" o "Productos".</div>;

  const addToCart = (p) => setCart(prev => [...prev, { productId: p.id, label: p.label, price: Number(p.price) || 0, qty: 1 }]);
  const removeFromCart = (index) => setCart(prev => prev.filter((_, i) => i !== index));
  const updateCartLine = (index, values) => setCart(prev => prev.map((l, i) => i === index ? { ...l, ...values } : l));

  // Toggle favorito
  const handleToggleFavorite = async (productId) => {
    if (!user || !user.uid) return;
    
    try {
      const updatedFavorites = await toggleFavoriteProduct(user.uid, productId);
      setFavorites(updatedFavorites);
    } catch (err) {
      console.error("Error toggling favorite:", err);
      alert("Error al actualizar favoritos");
    }
  };

  const groupedCart = groupProductLines(cart);
  const total = groupedCart.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.qty) || 1)), 0);

  // Obtener categorías únicas
  const categories = [...new Set(products.map(p => p.category || "Sin categoría"))].sort();

  // Filtrar productos según favoritos y categoría
  let displayedProducts = products;
  
  if (showFavoritesOnly) {
    displayedProducts = displayedProducts.filter(p => favorites.includes(p.id));
  }
  
  if (selectedCategory !== "all") {
    displayedProducts = displayedProducts.filter(p => 
      (p.category || "Sin categoría") === selectedCategory
    );
  }

  const handleSaveSale = async () => {
    if (!groupedCart.length) { alert("Carrito vacío"); return; }
    if (!user || !user.uid) { alert("No autenticado"); return; }
    
    // Si es para la sociedad, validar que al menos un socio esté seleccionado
    if (isForSociedad) {
      const selectedCount = Object.values(selectedSocios).filter(Boolean).length;
      if (selectedCount === 0) {
        alert("Debes seleccionar al menos 1 socio");
        return;
      }
    }
    
    setLoadingSave(true);

    const groupedLines = groupedCart;
    const computedTotal = groupedLines.reduce((s, l) => s + (l.price * l.qty), 0);

    try {
      if (isForSociedad) {
        // Modo sociedad: repartir entre socios seleccionados según asistentes
        const selectedSociosList = Object.entries(selectedSocios)
          .filter(([_, isSelected]) => isSelected)
          .map(([socioId, _]) => socioId);
        
        // Calcular total de asistentes
        const totalAttendees = selectedSociosList.reduce((sum, socioId) => {
          return sum + Number(attendeesCount[socioId] || 1);
        }, 0);
        
        const amountPerAttendee = computedTotal / totalAttendees;
        
        const salesPromises = [];
        
        // Crear un gasto por cada socio seleccionado
        for (const socioId of selectedSociosList) {
          const socio = socios.find(s => s.id === socioId);
          const attendees = Number(attendeesCount[socioId] || 1);
          const socioAmount = amountPerAttendee * attendees;
          
          salesPromises.push(
            addSale({
              uid: socioId,
              userEmail: socio?.email || "",
              item: `[SOCIEDAD] ${groupedLines.map(l => `${l.qty}x ${l.label}`).join(", ")} (${attendees} asistente${attendees > 1 ? 's' : ''})`,
              category: "sociedad",
              amount: socioAmount,
              productLines: groupedLines,
              attendees: attendees
            })
          );
        }
        
        await Promise.all(salesPromises);
        alert(`Gasto repartido entre ${selectedSociosList.length} socios (${totalAttendees} asistentes)\nTotal: ${computedTotal.toFixed(2)} €\nPor asistente: ${amountPerAttendee.toFixed(2)} €`);
        
      } else {
        // Modo normal: guardar para el usuario actual
        const salePayload = {
          uid: user.uid,
          userEmail: user.email || "",
          productLines: groupedLines,
          item: groupedLines.map(l => `${l.qty}x ${l.label}`).join(", "),
          category: "venta",
          amount: computedTotal
        };
        
        await addSale({
          uid: salePayload.uid,
          userEmail: salePayload.userEmail,
          item: salePayload.item,
          category: salePayload.category,
          amount: salePayload.amount,
          productLines: salePayload.productLines
        });
        
        alert("Venta registrada correctamente");
      }
      
      // Limpiar carrito y recargar historial
      setCart([]);
      setIsForSociedad(false);
      setSociosAttendance({});
      
      // Recargar historial
      const docs = await queryExpenses({ uid: user?.uid, isAdmin: false });
      const items = docs.map(d => ({
        ...d,
        createdAtStr: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : (d.createdAt || ""),
        dateInput: toInputDateTime(d.date || d.createdAt)
      }));
      setHistory(items);
      
    } catch (err) {
      console.error("addSale error full:", err);
      alert(`Error al guardar la venta: ${err.code || ""} — ${err.message || err}. Revisa la consola.`);
    } finally {
      setLoadingSave(false);
    }
  };

  const startEditTicket = (ticket) => {
    setEditingTicketId(ticket.id);
    setEditingData({
      item: ticket.item || "",
      amount: ticket.amount || 0,
      productLines: (ticket.productLines || []).map(pl => ({ ...pl })),
      dateInput: ticket.dateInput || toInputDateTime(ticket.createdAt)
    });
  };

  const cancelEdit = () => {
    setEditingTicketId(null);
    setEditingData(null);
  };

  const saveEdit = async () => {
    if (!editingTicketId) return;
    try {
      // agrupar antes de guardar
      const groupedForSave = groupProductLines(editingData.productLines || []);
      const payload = {
        item: groupedForSave.map(l => `${l.qty}x ${l.label}`).join(", "),
        amount: groupedForSave.reduce((s,l)=> s + (l.price * l.qty), 0),
        productLines: groupedForSave,
        date: editingData.dateInput ? fromInputDateTime(editingData.dateInput) : null
      };
      await updateExpense(editingTicketId, payload);
      setHistory(prev => prev.map(h => h.id === editingTicketId ? {
        ...h,
        item: payload.item,
        amount: payload.amount,
        productLines: payload.productLines,
        dateInput: editingData.dateInput,
        createdAtStr: payload.date ? payload.date.toLocaleString() : h.createdAtStr
      } : h));
      cancelEdit();
      alert("Ticket actualizado.");
    } catch (err) {
      console.error("updateExpense error:", err);
      alert("Error actualizando ticket: " + (err.message || err));
    }
  };

  const deleteTicket = async (id) => {
    if (!confirm("Borrar este ticket?")) return;
    try {
      await deleteExpense(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      alert("Ticket borrado.");
    } catch (err) {
      console.error("deleteExpense error:", err);
      alert("Error borrando ticket: " + (err.message || err));
    }
  };

  // editing helpers for product lines
  const addLineToEditing = () => setEditingData(prev => ({ ...prev, productLines: [...(prev.productLines || []), { productId: null, label: "", price: 0, qty: 1 }] }));
  const removeLineFromEditing = (index) => setEditingData(prev => ({ ...prev, productLines: prev.productLines.filter((_, i) => i !== index) }));
  const updateLineEditing = (index, values) => setEditingData(prev => ({ ...prev, productLines: prev.productLines.map((l, i) => i === index ? { ...l, ...values } : l) }));

  return (
    <div style={{padding:12}}>
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr', gap:8}}>
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12}}>
              <h3 style={{margin:0, fontSize:24, fontWeight:700, color:'#111827'}}>TPV</h3>
              <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                {/* Botón Ver Listados TPV */}
                <button
                  onClick={() => nav('/listados-tpv')}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(5,150,105,0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(5,150,105,0.25)';
                  }}
                >
                  📊 Ver Listados TPV
                </button>
                <button
                  onClick={() => setShowProducts(!showProducts)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                >
                  {showProducts ? '▼ Ocultar Productos' : '▶ Mostrar Productos'}
                </button>
                {/* Selector de categoría */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    fontSize: 14,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  <option value="all">📋 Todas las categorías</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {showFavoritesOnly && (
                  <span style={{
                    fontSize: 13,
                    color: '#6b7280',
                    fontWeight: 500,
                    background: '#fef3c7',
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: '1px solid #fbbf24'
                  }}>
                    {favorites.length} {favorites.length === 1 ? 'favorito' : 'favoritos'}
                  </span>
                )}
                <button 
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  style={{
                    fontSize: 14,
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    background: showFavoritesOnly 
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
                      : '#fff',
                    color: showFavoritesOnly ? '#fff' : '#374151',
                    border: showFavoritesOnly ? 'none' : '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: showFavoritesOnly 
                      ? '0 4px 12px rgba(251, 191, 36, 0.3)' 
                      : '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    if (showFavoritesOnly) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(251, 191, 36, 0.4)';
                    } else {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (showFavoritesOnly) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.3)';
                    } else {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  <span style={{fontSize:16}}>{showFavoritesOnly ? "⭐" : "📋"}</span>
                  <span>{showFavoritesOnly ? "Favoritos" : "Todos"}</span>
                </button>
              </div>
            </div>
            {showProducts && (
            <>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:12}}>
              {displayedProducts.map(p => {
                const isFavorite = favorites.includes(p.id);
                return (
                  <div 
                    key={p.id} 
                    className="card" 
                    style={{
                      padding: '12px',
                      position: 'relative',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{paddingTop: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
                      <div style={{display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', justifyContent:'center', marginBottom:2}}>
                        <span style={{fontWeight:600, fontSize:14}}>
                          {p.label}
                        </span>
                        {p.category && (
                          <span style={{fontSize:10, color:'#999', fontStyle:'italic'}}>
                            {p.category}
                          </span>
                        )}
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:6}}>
                        <div style={{fontSize:16, fontWeight:700, color:'#1976d2'}}>
                          {Number(p.price || 0).toFixed(2)} €
                        </div>
                        <button
                          onClick={() => handleToggleFavorite(p.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 18,
                            padding: 2,
                            lineHeight: 1
                          }}
                          title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                        >
                          {isFavorite ? "⭐" : "☆"}
                        </button>
                      </div>
                      <button 
                        className="btn-primary full" 
                        style={{
                          marginTop: 0,
                          fontSize: 13,
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          width: '100%'
                        }}
                        onClick={() => addToCart(p)}
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {showFavoritesOnly && displayedProducts.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: 16,
                border: '2px dashed #fbbf24'
              }}>
                <div style={{
                  fontSize: 64,
                  marginBottom: 16,
                  filter: 'grayscale(50%)',
                  opacity: 0.6
                }}>
                  ⭐
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#92400e',
                  marginBottom: 8
                }}>
                  No tienes productos favoritos
                </div>
                <div style={{
                  fontSize: 14,
                  color: '#78350f',
                  maxWidth: 300,
                  margin: '0 auto',
                  lineHeight: 1.6
                }}>
                  Haz clic en el botón <span style={{
                    display: 'inline-block',
                    width: 24,
                    height: 24,
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '50%',
                    verticalAlign: 'middle',
                    lineHeight: '22px',
                    fontSize: 12
                  }}>⭐</span> en cualquier producto para añadirlo a tus favoritos
                </div>
              </div>
            )}
            </>
            )}
          </div>

          <div>
            <h4 style={{margin:'8px 0'}}>Carrito</h4>
            <div style={{background:'#fafafa', padding:8, borderRadius:8}}>
              {cart.length === 0 ? <div className="muted">Carrito vacío</div> : (
                cart.map((c, i) => (
                  <div key={i} style={{display:'flex', flexDirection:'column', padding:'8px 0', borderBottom:'1px solid #eee', gap:8}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontWeight:600, fontSize:14}}>{c.label}</div>
                        <div style={{fontSize:12, color:'#666'}}>€{Number(c.price).toFixed(2)}</div>
                      </div>
                      <div style={{fontSize:16, fontWeight:700, color:'#1976d2', whiteSpace:'nowrap', marginLeft:8}}>
                        €{(c.qty * c.price).toFixed(2)}
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <input 
                        className="small-input" 
                        type="number" 
                        min="1" 
                        value={c.qty} 
                        onChange={(e) => updateCartLine(i, { qty: Number(e.target.value) || 1 })}
                        style={{width:60, padding:4, fontSize:14}}
                      />
                      <span style={{fontSize:12, color:'#666'}}>uds.</span>
                      <button 
                        className="btn-ghost" 
                        onClick={() => removeFromCart(i)}
                        style={{marginLeft:'auto', padding:'4px 12px', fontSize:12}}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10}}>
                <div style={{fontWeight:700}}>Total:</div>
                <div style={{fontSize:18, fontWeight:800}}>{total.toFixed(2)} €</div>
              </div>
              
              {/* Checkbox para gastos a nombre de la sociedad */}
              <div style={{marginTop:12, padding:12, background:'#fff', borderRadius:8, border:'2px solid #ddd'}}>
                <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
                  <input 
                    type="checkbox" 
                    checked={isForSociedad}
                    onChange={(e) => setIsForSociedad(e.target.checked)}
                    style={{width:18, height:18, cursor:'pointer'}}
                  />
                  <span style={{fontWeight:700, color:'#dc2626', fontSize:14}}>
                    A NOMBRE DE LA SOCIEDAD
                  </span>
                </label>
              </div>
              
              {/* Lista de socios si está activado */}
              {isForSociedad && (
                <div style={{marginTop:12, padding:12, background:'#fef3c7', borderRadius:8, border:'2px solid #f59e0b'}}>
                  <div style={{fontWeight:700, marginBottom:8, fontSize:14, color:'#92400e'}}>
                    Selecciona los socios que asistieron:
                  </div>
                  {socios.length === 0 ? (
                    <div style={{padding:12, textAlign:'center', color:'#92400e', fontSize:13}}>
                      No se encontraron socios. Verifica que haya usuarios registrados (no admins).
                    </div>
                  ) : (
                    <>
                      <div style={{maxHeight:200, overflowY:'auto'}}>
                        {socios.map(socio => (
                          <div
                            key={socio.id} 
                            style={{
                              display:'flex', 
                              alignItems:'center', 
                              gap:10, 
                              marginBottom:10,
                              padding:8,
                              background: selectedSocios[socio.id] ? '#fef9e7' : '#fff',
                              borderRadius:6,
                              border: selectedSocios[socio.id] ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                              transition: 'all 0.2s'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={selectedSocios[socio.id] || false}
                              onChange={(e) => {
                                setSelectedSocios(prev => ({
                                  ...prev,
                                  [socio.id]: e.target.checked
                                }));
                              }}
                              style={{width:18, height:18, cursor:'pointer'}}
                            />
                            <div style={{flex:1, fontSize:13}}>
                              <div style={{fontWeight:600, color: selectedSocios[socio.id] ? '#92400e' : '#374151'}}>
                                {socio.name || socio.email} {socio.surname || ''}
                              </div>
                            </div>
                            {selectedSocios[socio.id] && (
                              <input 
                                type="number" 
                                min="1" 
                                value={attendeesCount[socio.id] || 1}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAttendeesCount(prev => ({
                                    ...prev,
                                    [socio.id]: val === '' ? 1 : Math.max(1, Number(val))
                                  }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.target.select()}
                                style={{
                                  width:60, 
                                  padding:'6px 8px', 
                                  fontSize:13, 
                                  textAlign:'center',
                                  border:'2px solid #f59e0b',
                                  borderRadius:6,
                                  fontWeight:600,
                                  color:'#92400e'
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:8, fontSize:12, color:'#92400e', fontWeight:600}}>
                        ✓ Socios seleccionados: {Object.values(selectedSocios).filter(Boolean).length} de {socios.length}
                        {' • '}
                        Total asistentes: {Object.entries(selectedSocios)
                          .filter(([_, selected]) => selected)
                          .reduce((sum, [socioId, _]) => sum + Number(attendeesCount[socioId] || 1), 0)}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <div style={{marginTop:10}}>
                <button className="btn-primary full" onClick={handleSaveSale} disabled={loadingSave}>Total y Guardar</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
            <h4 style={{margin: 0}}>Histórico de tickets</h4>
            <button 
              className="btn-small"
              onClick={() => setShowHistory(prev => !prev)}
              style={{ fontSize: '12px' }}
            >
              {showHistory ? '▼ Ocultar' : '▶ Mostrar'}
            </button>
          </div>
          {showHistory && (history.length === 0 ? <div>No hay ventas registradas.</div> : (
            <div style={{overflowX:'auto'}}>
              <table className="table-responsive" style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={{textAlign:'left', padding:8}}>Fecha</th>
                    <th style={{textAlign:'left', padding:8}}>Productos</th>
                    <th style={{textAlign:'center', padding:8}}>Tipo</th>
                    <th style={{textAlign:'right', padding:8}}>Total</th>
                    <th style={{padding:8}}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} style={{borderTop:'1px solid #eee', verticalAlign:'top'}}>
                      <td style={{padding:8, minWidth:140}}>
                        {editingTicketId === h.id ? (
                          <input type="datetime-local" value={editingData.dateInput} onChange={(e) => setEditingData(d => ({ ...d, dateInput: e.target.value }))} />
                        ) : (
                          h.createdAtStr
                        )}
                      </td>

                      <td style={{padding:8, maxWidth:420}}>
                        {editingTicketId === h.id ? (
                          <div>
                            <button className="btn-small" onClick={addLineToEditing}>+ Línea</button>
                            {(editingData.productLines || []).map((pl, idx) => (
                              <div key={idx} style={{display:'flex', gap:8, alignItems:'center', marginTop:6}}>
                                <input className="small-input" placeholder="Producto" value={pl.label} onChange={(e) => updateLineEditing(idx, { label: e.target.value })} />
                                <input className="small-input" type="number" step="0.01" style={{width:90}} value={pl.price} onChange={(e) => updateLineEditing(idx, { price: Number(e.target.value) || 0 })} />
                                <input className="small-input" type="number" style={{width:70}} value={pl.qty} min="1" onChange={(e) => updateLineEditing(idx, { qty: Number(e.target.value) || 1 })} />
                                <button className="btn-ghost" onClick={() => removeLineFromEditing(idx)}>Quitar</button>
                              </div>
                            ))}
                            <div style={{marginTop:8}}>
                              <label style={{display:'block', fontSize:13}}>Resumen</label>
                              <input className="full-input" style={{marginTop:4}} value={editingData.item} onChange={(e) => setEditingData(d => ({ ...d, item: e.target.value }))} />
                              <div style={{marginTop:8, display:'flex', gap:8}}>
                                <div style={{flex:1}}>
                                  <label>Total</label>
                                  <input className="small-input" type="number" step="0.01" value={editingData.amount} onChange={(e) => setEditingData(d => ({ ...d, amount: Number(e.target.value) || 0 }))} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {groupProductLines(h.productLines || []).map((pl, i) => (
                              <div key={i}>{pl.qty} x {pl.label} — {Number(pl.price || 0).toFixed(2)} €</div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={{padding:8, textAlign:'center'}}>
                        {h.category === 'sociedad' ? (
                          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              border: '1px solid #ffc107'
                            }}>
                              🏛️ SOCIEDAD
                            </span>
                            {h.attendees && (
                              <span style={{fontSize: 11, color: '#666'}}>
                                {h.attendees} asist.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            backgroundColor: '#e3f2fd',
                            color: '#1565c0'
                          }}>
                            Personal
                          </span>
                        )}
                      </td>

                      <td style={{padding:8, textAlign:'right'}}>{Number(h.amount || 0).toFixed(2)} €</td>

                      <td style={{padding:8}}>
                        {editingTicketId === h.id ? (
                          <div style={{display:'flex', flexDirection:'column', gap:8}}>
                            <button className="btn-primary" onClick={saveEdit}>Guardar</button>
                            <button className="btn-ghost" onClick={cancelEdit}>Cancelar</button>
                          </div>
                        ) : (
                          <div style={{display:'flex', flexDirection:'column', gap:8}}>
                            {/* Solo mostrar Editar si NO es sociedad o si el usuario es admin */}
                            {(h.category !== 'sociedad' || profile?.isAdmin) && (
                              <button className="btn-small" onClick={() => startEditTicket(h)}>Editar</button>
                            )}
                            {/* Solo admin puede borrar tickets de sociedad */}
                            {(h.category !== 'sociedad' || profile?.isAdmin) && (
                              <button className="btn-ghost" onClick={() => deleteTicket(h.id)}>Borrar</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// helper to convert datetime-local -> Date used above
function serverTimestampIfWanted() { return undefined; }