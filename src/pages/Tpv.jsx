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
import { useNavigate, useSearchParams } from "react-router-dom";

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
  const [selectedCategoryEdit, setSelectedCategoryEdit] = useState("");
  const [selectedProductEdit, setSelectedProductEdit] = useState("");
  const [showProducts, setShowProducts] = useState(true);
  const [isForSociedad, setIsForSociedad] = useState(false);
  const [eventoTexto, setEventoTexto] = useState("");
  const [socios, setSocios] = useState([]);
  const [selectedSocios, setSelectedSocios] = useState({});
  const [attendeesCount, setAttendeesCount] = useState({});
  const [expandedTickets, setExpandedTickets] = useState({});
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showSociosSection, setShowSociosSection] = useState(false);
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Abrir histórico si viene desde URL
  useEffect(() => {
    if (searchParams.get('openHistory') === 'true') {
      setShowHistory(true);
      // Limpiar el parámetro de la URL
      searchParams.delete('openHistory');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Detectar cambios en el tamaño de ventana
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determinar configuración según dispositivo
  const deviceConfig = React.useMemo(() => {
    if (windowWidth >= 1024) {
      // PC/Desktop
      return {
        gridColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        cardPadding: 14,
        gap: 12,
        buttonSize: 32,
        fontSize: 14,
        inputFontSize: 16,
        checkboxSize: 20
      };
    } else if (windowWidth >= 768) {
      // Tablet
      return {
        gridColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        cardPadding: 10,
        gap: 8,
        buttonSize: 30,
        fontSize: 12,
        inputFontSize: 15,
        checkboxSize: 18
      };
    } else {
      // Móvil
      return {
        gridColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
        cardPadding: 8,
        gap: 6,
        buttonSize: 26,
        fontSize: 11,
        inputFontSize: 14,
        checkboxSize: 16
      };
    }
  }, [windowWidth]);

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

  // Cargar socios cuando se activa el modo sociedad o cuando se edita un ticket
  useEffect(() => {
    let mounted = true;
    const loadSocios = async () => {
      if (isForSociedad || editingTicketId) {
        try {
          console.log('🔄 Recargando socios...');
          const allSocios = await getAllSocios();
          console.log('🔍 Socios obtenidos con alias:', allSocios.map(s => ({id: s.id, name: s.name, alias: s.alias})));
          if (mounted) {
            setSocios(allSocios);
            // No inicializar selección automáticamente - el usuario debe seleccionar manualmente
          }
        } catch (err) {
          console.error("Error loading socios:", err);
        }
      }
    };
    loadSocios();
    return () => { mounted = false; };
  }, [isForSociedad, editingTicketId]);

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
    
    // Calcular el total antes de las validaciones
    const groupedLines = groupedCart;
    const computedTotal = groupedLines.reduce((s, l) => s + (l.price * l.qty), 0);
    
    // Validar que el total es mayor que 0
    if (computedTotal <= 0) {
      alert("No se puede guardar un ticket sin productos");
      return;
    }
    
    // Si es para la sociedad, validar que al menos un socio esté seleccionado
    if (isForSociedad) {
      const selectedCount = Object.values(selectedSocios).filter(Boolean).length;
      if (selectedCount === 0) {
        alert("Debes seleccionar al menos 1 socio");
        return;
      }
    }
    
    setLoadingSave(true);

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
        
        console.log('🎯 CREANDO GASTO DE SOCIEDAD:');
        console.log('   Total del gasto:', computedTotal);
        console.log('   Socios seleccionados:', selectedSociosList.length);
        console.log('   Total de asistentes:', totalAttendees);
        
        const amountPerAttendee = computedTotal / totalAttendees;
        console.log('   Precio por asistente:', amountPerAttendee.toFixed(2));
        
        // Construir array de participantes
        const participantes = selectedSociosList.map(socioId => {
          const socio = socios.find(s => s.id === socioId);
          const attendees = Number(attendeesCount[socioId] || 1);
          const socioAmount = amountPerAttendee * attendees;
          console.log(`   → ${socio?.email}: ${attendees} asist. = ${socioAmount.toFixed(2)}€`);
          return {
            uid: socioId,
            email: socio?.email || '',
            nombre: socio?.nombre || socio?.email?.split('@')[0] || 'Socio',
            attendees: attendees,
            amount: socioAmount
          };
        });
        
        const itemDescription = eventoTexto.trim() 
          ? `[SOCIEDAD - ${eventoTexto.trim()}] ${groupedLines.map(l => `${l.qty}x ${l.label}`).join(", ")} (${totalAttendees} asistente${totalAttendees > 1 ? 's' : ''})`
          : `[SOCIEDAD] ${groupedLines.map(l => `${l.qty}x ${l.label}`).join(", ")} (${totalAttendees} asistente${totalAttendees > 1 ? 's' : ''})`;
        
        // Crear UN solo ticket con todos los participantes
        await addSale({
          uid: user.uid, // Creador del ticket
          userEmail: user.email || "",
          item: itemDescription,
          category: "sociedad",
          amount: computedTotal,
          productLines: groupedLines,
          participantes: participantes,
          eventoTexto: eventoTexto.trim() || null,
          totalGeneral: computedTotal,
          amountPerAttendee: amountPerAttendee,
          totalAttendees: totalAttendees,
          isForSociedad: true
        });
        
        console.log('✅ Ticket único creado con', participantes.length, 'participantes');
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
          productLines: salePayload.productLines,
          isForSociedad: false
        });
        
        alert("Venta registrada correctamente");
      }
      
      // Limpiar carrito y recargar historial
      setCart([]);
      setIsForSociedad(false);
      setEventoTexto("");
      setSelectedSocios({});
      setAttendeesCount({});
      
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
    
    // Preparar selección de socios si es ticket de sociedad
    const selectedSociosMap = {};
    const attendeesMap = {};
    
    if (ticket.category === 'sociedad') {
      if (ticket.participantes && Array.isArray(ticket.participantes)) {
        ticket.participantes.forEach(p => {
          selectedSociosMap[p.uid] = true;
          attendeesMap[p.uid] = p.attendees || 1;
        });
      } else {
        selectedSociosMap[user.uid] = true;
        attendeesMap[user.uid] = ticket.attendees || 1;
      }
    }
    
    setEditingData({
      item: ticket.item || "",
      amount: ticket.amount || 0,
      productLines: (ticket.productLines || []).map(pl => ({ ...pl })),
      dateInput: ticket.dateInput || toInputDateTime(ticket.createdAt),
      category: ticket.category || 'venta',
      eventoTexto: ticket.eventoTexto || '',
      selectedSocios: selectedSociosMap,
      attendeesCount: attendeesMap
    });
  };

  const cancelEdit = () => {
    setEditingTicketId(null);
    setEditingData(null);
  };

  const saveEdit = async () => {
    if (!editingTicketId) return;
    try {
      const groupedForSave = groupProductLines(editingData.productLines || []);
      const computedTotal = groupedForSave.reduce((s,l)=> s + (l.price * l.qty), 0);
      
      if (editingData.category === 'sociedad') {
        // Calcular reparto entre socios seleccionados
        const selectedSociosList = Object.entries(editingData.selectedSocios || {})
          .filter(([_, isSelected]) => isSelected)
          .map(([socioId, _]) => socioId);
        
        if (selectedSociosList.length === 0) {
          alert('Debes seleccionar al menos un socio');
          return;
        }
        
        const totalAttendees = selectedSociosList.reduce((sum, socioId) => {
          return sum + Number(editingData.attendeesCount[socioId] || 1);
        }, 0);
        
        const amountPerAttendee = computedTotal / totalAttendees;
        
        const participantes = selectedSociosList.map(socioId => {
          const attendees = Number(editingData.attendeesCount[socioId] || 1);
          const socioAmount = amountPerAttendee * attendees;
          const socio = socios.find(s => s.id === socioId);
          return {
            uid: socioId,
            email: socio?.email || '',
            nombre: socio?.nombre || socio?.email?.split('@')[0] || 'Socio',
            attendees: attendees,
            amount: socioAmount
          };
        });
        
        const eventoTexto = editingData.eventoTexto?.trim() || `Gasto conjunto`;
        
        const payload = {
          item: `[SOCIEDAD - ${eventoTexto}] ${groupedForSave.map(l => `${l.qty}x ${l.label}`).join(", ")} (${totalAttendees} asistente${totalAttendees > 1 ? 's' : ''})`,
          amount: computedTotal,
          productLines: groupedForSave,
          date: editingData.dateInput ? fromInputDateTime(editingData.dateInput) : null,
          category: 'sociedad',
          participantes: participantes,
          eventoTexto: eventoTexto,
          totalGeneral: computedTotal,
          amountPerAttendee: amountPerAttendee,
          totalAttendees: totalAttendees
        };
        
        await updateExpense(editingTicketId, payload);
      } else {
        // Ticket personal
        const payload = {
          item: groupedForSave.map(l => `${l.qty}x ${l.label}`).join(", "),
          amount: computedTotal,
          productLines: groupedForSave,
          date: editingData.dateInput ? fromInputDateTime(editingData.dateInput) : null,
          category: editingData.category,
          attendees: null,
          eventoTexto: null,
          totalGeneral: null,
          amountPerAttendee: null,
          totalAttendees: null
        };
        
        await updateExpense(editingTicketId, payload);
      }
      
      // Recargar historial
      const docs = await queryExpenses({ uid: user?.uid, isAdmin: false });
      const items = docs.map(d => ({
        ...d,
        createdAtStr: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : (d.createdAt || ""),
        dateInput: toInputDateTime(d.date || d.createdAt)
      }));
      setHistory(items);
      
      cancelEdit();
      alert('Ticket actualizado correctamente');
    } catch (err) {
      console.error('Error saving edit:', err);
      alert('Error al guardar cambios');
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

  const calcularGastoIndividual = (ticket) => {
    if (ticket.category !== 'sociedad') return null;
    
    // Calcular total de asistentes
    let totalAsistentes = 0;
    let asistentesUsuario = 0;
    
    if (ticket.participantes && Array.isArray(ticket.participantes)) {
      ticket.participantes.forEach(p => {
        const attendees = p.attendees || 1;
        totalAsistentes += attendees;
        if (p.uid === user?.uid) {
          asistentesUsuario = attendees;
        }
      });
    } else {
      // Sistema antiguo: solo el usuario actual
      totalAsistentes = ticket.attendees || 1;
      asistentesUsuario = ticket.attendees || 1;
    }
    
    if (totalAsistentes === 0) return null;
    
    const total = Number(ticket.amount || 0);
    const gastoPorPersona = total / totalAsistentes;
    const gastoIndividual = gastoPorPersona * asistentesUsuario;
    
    return {
      gastoIndividual: gastoIndividual,
      asistentesUsuario: asistentesUsuario,
      totalAsistentes: totalAsistentes
    };
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
                  <span>{showFavoritesOnly ? "Favoritos" : "FAV"}</span>
                </button>
              </div>
            </div>
            
            {/* Solo mostrar productos y controles si NO está activado isForSociedad */}
            {!isForSociedad && (
            <>
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
            {/* Fin de productos - se ocultan cuando isForSociedad=true */}
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
                        onChange={(e) => {
                          const val = e.target.value;
                          // Permitir vacío temporalmente mientras el usuario escribe
                          updateCartLine(i, { qty: val === '' ? '' : Number(val) });
                        }}
                        onBlur={(e) => {
                          // Al perder el foco, asegurar que sea al menos 1
                          const val = Number(e.target.value);
                          if (!val || val < 1) {
                            updateCartLine(i, { qty: 1 });
                          }
                        }}
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
                
                {/* Campo de texto para el evento */}
                {isForSociedad && (
                  <div style={{marginTop:10}}>
                    <input 
                      type="text" 
                      value={eventoTexto}
                      onChange={(e) => setEventoTexto(e.target.value)}
                      placeholder="Describe el evento (ej: Cena de Navidad, Comida de hermandad...)"
                      style={{
                        width:'100%', 
                        padding:'8px 12px', 
                        fontSize:13,
                        border:'2px solid #fbbf24',
                        borderRadius:6,
                        background:'#fef9e7',
                        color:'#92400e',
                        fontWeight:500,
                        boxSizing:'border-box'
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* Lista de socios si está activado */}
              {isForSociedad && (
                <div style={{marginTop:12, padding:8, background:'#fef3c7', borderRadius:12, border:'2px solid #f59e0b'}}>
                  <div style={{fontWeight:700, marginBottom:10, fontSize:15, color:'#92400e', textAlign:'center'}}>
                    Selecciona los socios que asistieron:
                  </div>
                  {socios.length === 0 ? (
                    <div style={{padding:12, textAlign:'center', color:'#92400e', fontSize:13}}>
                      No se encontraron socios. Verifica que haya usuarios registrados (no admins).
                    </div>
                  ) : (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: deviceConfig.gridColumns,
                        gap: deviceConfig.gap,
                        maxHeight: 450,
                        overflowY: 'auto',
                        padding: 2
                      }}>
                        {socios.map(socio => {
                          const displayName = (socio.alias && socio.alias.trim()) || socio.name || socio.email?.split('@')[0] || 'Sin nombre';
                          return (
                            <div
                              key={socio.id} 
                              style={{
                                display:'flex', 
                                flexDirection: 'column',
                                alignItems:'center',
                                gap:5,
                                padding: deviceConfig.cardPadding,
                                background: selectedSocios[socio.id] ? '#fef9e7' : '#fff',
                                borderRadius:8,
                                border: selectedSocios[socio.id] ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                boxShadow: selectedSocios[socio.id] ? '0 2px 8px rgba(245,158,11,0.2)' : '0 1px 3px rgba(0,0,0,0.05)'
                              }}
                              onClick={() => {
                                setSelectedSocios(prev => {
                                  const newSelected = !prev[socio.id];
                                  if (newSelected && !attendeesCount[socio.id]) {
                                    setAttendeesCount(prevCount => ({
                                      ...prevCount,
                                      [socio.id]: 1
                                    }));
                                  }
                                  return {
                                    ...prev,
                                    [socio.id]: newSelected
                                  };
                                });
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
                                onClick={(e) => e.stopPropagation()}
                                style={{width: deviceConfig.checkboxSize, height: deviceConfig.checkboxSize, cursor:'pointer'}}
                              />
                              <div style={{
                                fontWeight:700, 
                                fontSize: deviceConfig.fontSize,
                                color: selectedSocios[socio.id] ? '#92400e' : '#374151',
                                textAlign: 'center',
                                wordBreak: 'break-word',
                                lineHeight: 1.1,
                                minHeight: 22
                              }}>
                                {displayName}
                              </div>
                              {selectedSocios[socio.id] && (
                                <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3}}>
                                  <div style={{fontSize: 9, color: '#92400e', fontWeight: 600}}>
                                    Asist.
                                  </div>
                                  <div style={{display: 'flex', alignItems: 'center', gap: 2, width: '100%'}}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAttendeesCount(prev => ({
                                          ...prev,
                                          [socio.id]: Math.max(1, (prev[socio.id] || 1) - 1)
                                        }));
                                      }}
                                      style={{
                                        width: deviceConfig.buttonSize,
                                        height: deviceConfig.buttonSize,
                                        padding: 0,
                                        fontSize: 18,
                                        fontWeight: 700,
                                        background: '#fff',
                                        border: '2px solid #f59e0b',
                                        borderRadius: 4,
                                        color: '#92400e',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: 1,
                                        flexShrink: 0
                                      }}
                                    >
                                      −
                                    </button>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      value={attendeesCount[socio.id] || 1}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAttendeesCount(prev => ({
                                          ...prev,
                                          [socio.id]: val === '' ? '' : Number(val)
                                        }));
                                      }}
                                      onBlur={(e) => {
                                        const val = Number(e.target.value);
                                        if (!val || val < 1) {
                                          setAttendeesCount(prev => ({ ...prev, [socio.id]: 1 }));
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      onFocus={(e) => e.target.select()}
                                      style={{
                                        flex: 1,
                                        padding:'0', 
                                        margin: 0,
                                        fontSize: deviceConfig.inputFontSize, 
                                        textAlign:'center',
                                        border:'2px solid #f59e0b',
                                        borderRadius:4,
                                        fontWeight:700,
                                        color:'#92400e',
                                        background: '#fff',
                                        minWidth: 0,
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        lineHeight: `${deviceConfig.buttonSize - 4}px`,
                                        height: deviceConfig.buttonSize,
                                        WebkitAppearance: 'none',
                                        MozAppearance: 'textfield',
                                        appearance: 'none'
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAttendeesCount(prev => ({
                                          ...prev,
                                          [socio.id]: (prev[socio.id] || 1) + 1
                                        }));
                                      }}
                                      style={{
                                        width: deviceConfig.buttonSize,
                                        height: deviceConfig.buttonSize,
                                        padding: 0,
                                        fontSize: 18,
                                        fontWeight: 700,
                                        background: '#fff',
                                        border: '2px solid #f59e0b',
                                        borderRadius: 4,
                                        color: '#92400e',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: 1,
                                        flexShrink: 0
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
            <>
            <div className="tpv-history-table" style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize: 14}}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                      Fecha / Hora
                    </th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      Productos
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                      Tipo
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                      Total
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                      Tu Gasto
                    </th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, index) => {
                    const gastoInfo = calcularGastoIndividual(h);
                    return (
                    <React.Fragment key={h.id}>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{h.createdAtStr?.split(',')[0] || ''}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{h.createdAtStr?.split(',')[1]?.trim() || ''}</div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                          <div>
                            {groupProductLines(h.productLines || []).map((pl, i) => (
                              <div key={i} style={{ marginBottom: 4 }}>
                                <span style={{ fontWeight: 500, color: '#6b7280' }}>{pl.qty}×</span> {pl.label}
                                <span style={{ color: '#6b7280', marginLeft: 8 }}>
                                  ({Number(pl.price || 0).toFixed(2)}€)
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {h.category === 'sociedad' ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: '#fff3cd',
                              color: '#856404',
                              border: '1px solid #ffc107',
                              whiteSpace: 'nowrap'
                            }}>
                              🏛️ Sociedad
                              {h.attendees && <div style={{ fontSize: 10 }}>({h.attendees} asist.)</div>}
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              whiteSpace: 'nowrap'
                            }}>
                              Personal
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 16, fontWeight: 700, color: '#059669', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {Number(h.amount || 0).toFixed(2)}€
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {gastoInfo ? (
                            <div>
                              <div style={{ color: '#2563eb' }}>
                                {gastoInfo.gastoIndividual.toFixed(2)}€
                              </div>
                              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>
                                ({gastoInfo.asistentesUsuario}/{gastoInfo.totalAsistentes} asist.)
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: 12 }}>-</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{display:'flex', gap:8, justifyContent:'center'}}>
                            <button className="btn-small" onClick={() => startEditTicket(h)}>✏️</button>
                            <button className="btn-ghost" onClick={() => deleteTicket(h.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila de edición expandida */}
                      {editingTicketId === h.id && (
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                          <td colSpan={5} style={{ padding: '20px 16px' }}>
                            <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 20, border: '2px solid #3b82f6' }}>
                              <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#111827' }}>
                                ✏️ Editando ticket
                              </h4>
                              
                              <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                                  Fecha y hora
                                </label>
                                <input 
                                  type="datetime-local" 
                                  value={editingData.dateInput}
                                  onChange={(e) => setEditingData(d => ({ ...d, dateInput: e.target.value }))}
                                  className="full-input"
                                />
                              </div>

                              <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                                  Tipo de gasto
                                </label>
                                <select
                                  value={editingData.category}
                                  onChange={(e) => setEditingData(d => ({ ...d, category: e.target.value }))}
                                  className="full-input"
                                >
                                  <option value="venta">Personal</option>
                                  <option value="sociedad">Sociedad</option>
                                </select>
                              </div>

                              {editingData.category === 'sociedad' && (
                                <>
                                  <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                                      Evento (opcional)
                                    </label>
                                    <input 
                                      type="text" 
                                      placeholder="Nombre del evento"
                                      value={editingData.eventoTexto}
                                      onChange={(e) => setEditingData(d => ({ ...d, eventoTexto: e.target.value }))}
                                      className="full-input"
                                    />
                                  </div>

                                  <div style={{ marginBottom: 16 }}>
                                    <div 
                                      onClick={() => setShowSociosSection(!showSociosSection)}
                                      style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        padding: '8px 12px',
                                        background: '#f3f4f6',
                                        borderRadius: 6,
                                        marginBottom: showSociosSection ? 8 : 0
                                      }}
                                    >
                                      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                                        Socios participantes
                                      </label>
                                      <span style={{ fontSize: 16, color: '#6b7280' }}>
                                        {showSociosSection ? '▼' : '▶'}
                                      </span>
                                    </div>
                                    {showSociosSection && (
                                      <div style={{ 
                                        maxHeight: 200, 
                                        overflowY: 'auto', 
                                        border: '1px solid #d1d5db', 
                                        borderRadius: 6, 
                                      padding: 12,
                                      backgroundColor: '#f9fafb'
                                    }}>
                                      {socios
                                        .sort((a, b) => {
                                          const aSelected = editingData.selectedSocios?.[a.id] || false;
                                          const bSelected = editingData.selectedSocios?.[b.id] || false;
                                          if (aSelected && !bSelected) return -1;
                                          if (!aSelected && bSelected) return 1;
                                          return (a.alias || a.nombre || a.email).localeCompare(b.alias || b.nombre || b.email);
                                        })
                                        .map(socio => (
                                        <div key={socio.id} style={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 12, 
                                          marginBottom: 8,
                                          padding: 8,
                                          backgroundColor: editingData.selectedSocios?.[socio.id] ? '#eff6ff' : '#fff',
                                          borderRadius: 6,
                                          border: editingData.selectedSocios?.[socio.id] ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                          transition: 'all 0.2s ease'
                                        }}>
                                          <input
                                            type="checkbox"
                                            checked={editingData.selectedSocios?.[socio.id] || false}
                                            onChange={(e) => {
                                              const newSelected = { ...editingData.selectedSocios, [socio.id]: e.target.checked };
                                              const newAttendees = { ...editingData.attendeesCount };
                                              if (e.target.checked && !newAttendees[socio.id]) {
                                                newAttendees[socio.id] = 1;
                                              }
                                              setEditingData(d => ({ 
                                                ...d, 
                                                selectedSocios: newSelected,
                                                attendeesCount: newAttendees
                                              }));
                                            }}
                                            style={{ cursor: 'pointer', width: 18, height: 18 }}
                                          />
                                          <span style={{ 
                                            flex: 1, 
                                            fontSize: 13, 
                                            color: '#111827',
                                            fontWeight: editingData.selectedSocios?.[socio.id] ? 600 : 400
                                          }}>
                                            {socio.alias || socio.nombre || socio.email}
                                          </span>
                                          {editingData.selectedSocios?.[socio.id] && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const currentVal = editingData.attendeesCount?.[socio.id] || 1;
                                                  if (currentVal > 1) {
                                                    const newAttendees = { 
                                                      ...editingData.attendeesCount, 
                                                      [socio.id]: currentVal - 1
                                                    };
                                                    setEditingData(d => ({ ...d, attendeesCount: newAttendees }));
                                                  }
                                                }}
                                                style={{
                                                  width: 28,
                                                  height: 28,
                                                  padding: 0,
                                                  fontSize: 16,
                                                  fontWeight: 600,
                                                  color: '#fff',
                                                  backgroundColor: '#ef4444',
                                                  border: 'none',
                                                  borderRadius: 6,
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                              >
                                                −
                                              </button>
                                              <span style={{ 
                                                minWidth: 40, 
                                                textAlign: 'center',
                                                fontSize: 14,
                                                fontWeight: 600,
                                                color: '#1f2937',
                                                backgroundColor: '#fff',
                                                padding: '4px 8px',
                                                borderRadius: 4,
                                                border: '1px solid #d1d5db'
                                              }}>
                                                {editingData.attendeesCount?.[socio.id] || 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const currentVal = editingData.attendeesCount?.[socio.id] || 1;
                                                  const newAttendees = { 
                                                    ...editingData.attendeesCount, 
                                                    [socio.id]: currentVal + 1
                                                  };
                                                  setEditingData(d => ({ ...d, attendeesCount: newAttendees }));
                                                }}
                                                style={{
                                                  width: 28,
                                                  height: 28,
                                                  padding: 0,
                                                  fontSize: 16,
                                                  fontWeight: 600,
                                                  color: '#fff',
                                                  backgroundColor: '#10b981',
                                                  border: 'none',
                                                  borderRadius: 6,
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                              >
                                                +
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    )}
                                  </div>
                                </>
                              )}

                              <div style={{ marginBottom: 16 }}>
                                <div style={{ marginBottom: 12 }}>
                                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 8 }}>
                                    Añadir productos
                                  </label>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                                    <select
                                      value={selectedCategoryEdit}
                                      onChange={(e) => {
                                        setSelectedCategoryEdit(e.target.value);
                                        setSelectedProductEdit('');
                                      }}
                                      style={{
                                        minWidth: 150,
                                        maxWidth: '100%',
                                        flex: '1 1 auto',
                                        padding: '8px 12px',
                                        fontSize: 14,
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <option value="">Seleccionar categoría...</option>
                                      {(() => {
                                        const categoriesSet = new Set();
                                        products.forEach(p => {
                                          const cat = p.category || 'Sin categoría';
                                          categoriesSet.add(cat);
                                        });
                                        return Array.from(categoriesSet)
                                          .sort((a, b) => a.localeCompare(b))
                                          .map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                          ));
                                      })()}
                                    </select>
                                    <select
                                      value={selectedProductEdit}
                                      onChange={(e) => setSelectedProductEdit(e.target.value)}
                                      disabled={!selectedCategoryEdit}
                                      style={{
                                        minWidth: 180,
                                        maxWidth: '100%',
                                        flex: '2 1 auto',
                                        padding: '8px 12px',
                                        fontSize: 14,
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        backgroundColor: !selectedCategoryEdit ? '#f3f4f6' : '#fff',
                                        cursor: !selectedCategoryEdit ? 'not-allowed' : 'pointer',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      <option value="">Seleccionar producto...</option>
                                      {selectedCategoryEdit && products
                                        .filter(p => (p.category || 'Sin categoría') === selectedCategoryEdit)
                                        .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
                                        .map(p => (
                                          <option key={p.id} value={p.id}>
                                            {p.label || 'Sin nombre'} - {Number(p.price || 0).toFixed(2)}€
                                          </option>
                                        ))
                                      }
                                    </select>
                                    <button
                                      onClick={() => {
                                        if (selectedProductEdit) {
                                          const prod = products.find(p => p.id === selectedProductEdit);
                                          if (prod) {
                                            const newLines = [...(editingData.productLines || []), {
                                              label: prod.label,
                                              price: Number(prod.price || 0),
                                              qty: 1,
                                              productId: prod.id
                                            }];
                                            setEditingData({ ...editingData, productLines: newLines });
                                            setSelectedProductEdit('');
                                          }
                                        }
                                      }}
                                      disabled={!selectedProductEdit}
                                      style={{
                                        padding: '8px 16px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#fff',
                                        backgroundColor: !selectedProductEdit ? '#9ca3af' : '#10b981',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: !selectedProductEdit ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0
                                      }}
                                    >
                                      + Añadir
                                    </button>
                                    <button
                                      onClick={addLineToEditing}
                                      style={{
                                        padding: '8px 16px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#fff',
                                        backgroundColor: '#6366f1',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0
                                      }}
                                    >
                                      + Manual
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 8 }}>
                                    Productos en el ticket
                                  </label>
                                </div>
                                {(editingData.productLines || []).map((pl, idx) => (
                                  <div key={idx} style={{display:'flex', gap:4, alignItems:'center', marginBottom:8}}>
                                    <input 
                                      className="small-input" 
                                      placeholder="Producto" 
                                      value={pl.label} 
                                      onChange={(e) => updateLineEditing(idx, { label: e.target.value })} 
                                      style={{ flex: 1, minWidth: 0, fontSize: 13 }}
                                    />
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                      <input 
                                        className="small-input" 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="€"
                                        value={pl.price} 
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          updateLineEditing(idx, { price: val === '' ? '' : Number(val) });
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === '') {
                                            updateLineEditing(idx, { price: 0 });
                                          }
                                        }}
                                        style={{width: 60, paddingRight: 18, flexShrink: 0, fontSize: 13}}
                                      />
                                      <span style={{ position: 'absolute', right: 6, fontSize: 12, color: '#6b7280', pointerEvents: 'none' }}>€</span>
                                    </div>
                                    <input 
                                      className="small-input" 
                                      type="number" 
                                      placeholder="Qty"
                                      value={pl.qty} 
                                      min="1" 
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateLineEditing(idx, { qty: val === '' ? '' : Math.max(1, Number(val)) });
                                      }}
                                      onBlur={(e) => {
                                        if (e.target.value === '' || Number(e.target.value) < 1) {
                                          updateLineEditing(idx, { qty: 1 });
                                        }
                                      }}
                                      style={{width: 42, flexShrink: 0, fontSize: 13}}
                                    />
                                    <button 
                                      onClick={() => removeLineFromEditing(idx)}
                                      style={{
                                        padding: '6px 8px',
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: '#fff',
                                        backgroundColor: '#ef4444',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        minWidth: 34,
                                        lineHeight: 1
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ))}
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid #e5e7eb', fontSize: 16, fontWeight: 600, color: '#059669', textAlign: 'right' }}>
                                  Total: {(editingData.productLines || []).reduce((s, l) => s + (Number(l.price || 0) * Number(l.qty || 1)), 0).toFixed(2)}€
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={cancelEdit}
                                  style={{
                                    padding: '10px 20px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#374151',
                                    backgroundColor: '#f3f4f6',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={saveEdit}
                                  style={{
                                    padding: '10px 20px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#fff',
                                    backgroundColor: '#3b82f6',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Guardar cambios
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Vista móvil */}
            <div className="tpv-history-mobile">
              {history.map((h) => {
                const lines = groupProductLines(h.productLines || []);
                const isEditing = editingTicketId === h.id;
                const isExpanded = expandedTickets[h.id] || isEditing;
                const isSociedad = h.isForSociedad || h.category === 'sociedad' || (h.participantes && h.participantes.length > 0);
                
                return (
                  <React.Fragment key={h.id}>
                    {/* Card principal del ticket - colapsable */}
                    <div 
                      onClick={() => {
                        if (!isEditing) {
                          setExpandedTickets(prev => ({
                            ...prev,
                            [h.id]: !prev[h.id]
                          }));
                        }
                      }}
                      style={{
                        background: '#fff',
                        border: isEditing ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 10,
                        boxShadow: isEditing ? '0 4px 12px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                        cursor: isEditing ? 'default' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Encabezado siempre visible */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? 8 : 0 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
                            {h.createdAtStr?.split(',')[0] || ''}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {h.createdAtStr?.split(',')[1]?.trim() || ''}
                          </div>
                        </div>
                        {!isExpanded && (
                          <div style={{ 
                            fontSize: 11, 
                            fontWeight: 700, 
                            color: isSociedad ? '#92400e' : '#2563eb',
                            background: isSociedad ? '#fef3c7' : '#dbeafe',
                            padding: '3px 8px',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 24,
                            height: 22,
                            marginLeft: 'auto',
                            marginRight: 'auto'
                          }}>
                            {isSociedad ? 'S' : 'P'}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>
                            {Number(h.amount || 0).toFixed(2)}€
                          </div>
                          {!isEditing && (
                            <div style={{ 
                              fontSize: 18, 
                              color: '#9ca3af',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}>
                              ▼
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contenido expandible */}
                      {isExpanded && (
                        <>
                          <div style={{ marginBottom: 8 }}>
                            {lines.map((pl, i) => (
                              <div key={i} style={{ fontSize: 11, color: '#374151', marginBottom: 2 }}>
                                <span style={{ fontWeight: 600 }}>{pl.qty}×</span> {pl.label} 
                                <span style={{ color: '#6b7280' }}> ({Number(pl.price || 0).toFixed(2)}€)</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            {h.category === 'sociedad' ? (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: 6,
                                fontSize: 9,
                                fontWeight: 600,
                                backgroundColor: '#fff3cd',
                                color: '#856404'
                              }}>
                                🏛️ Sociedad
                              </span>
                            ) : (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: 6,
                                fontSize: 9,
                                fontWeight: 600,
                                backgroundColor: '#e0e7ff',
                                color: '#3730a3'
                              }}>
                                Personal
                              </span>
                            )}
                          </div>

                          {!isEditing && (
                            <div 
                              style={{ display: 'flex', gap: 6 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button className="btn-small" onClick={() => startEditTicket(h)} style={{ flex: 1, fontSize: 11 }}>
                                ✏️ Editar
                              </button>
                              <button className="btn-ghost" onClick={() => deleteTicket(h.id)} style={{ flex: 1, fontSize: 11 }}>
                                🗑️ Eliminar
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Interfaz de edición móvil */}
                    {isEditing && (
                      <div style={{
                        background: '#f8fafc',
                        border: '2px solid #3b82f6',
                        borderRadius: 10,
                        padding: 16,
                        marginTop: -10,
                        marginBottom: 16
                      }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                          ✏️ Editando ticket
                        </h4>

                        {/* Fecha y hora */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                            Fecha y hora
                          </label>
                          <input 
                            type="datetime-local" 
                            value={editingData.dateInput}
                            onChange={(e) => setEditingData(d => ({ ...d, dateInput: e.target.value }))}
                            className="full-input"
                            style={{ fontSize: 14 }}
                          />
                        </div>

                        {/* Tipo de gasto */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                            Tipo de gasto
                          </label>
                          <select
                            value={editingData.category}
                            onChange={(e) => setEditingData(d => ({ ...d, category: e.target.value }))}
                            className="full-input"
                            style={{ fontSize: 14 }}
                          >
                            <option value="venta">Personal</option>
                            <option value="sociedad">Sociedad</option>
                          </select>
                        </div>

                        {/* Evento (solo si es sociedad) */}
                        {editingData.category === 'sociedad' && (
                          <>
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#374151' }}>
                                Evento
                              </label>
                              <input 
                                type="text"
                                value={editingData.eventoTexto || ''}
                                onChange={(e) => setEditingData(d => ({ ...d, eventoTexto: e.target.value }))}
                                className="full-input"
                                placeholder="Nombre del evento"
                                style={{ fontSize: 14 }}
                              />
                            </div>

                            {/* Selección de socios */}
                            <div style={{ marginBottom: 12 }}>
                              <div 
                                onClick={() => setShowSociosSection(!showSociosSection)}
                                style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  padding: '8px 12px',
                                  background: '#f3f4f6',
                                  borderRadius: 6,
                                  marginBottom: showSociosSection ? 8 : 0
                                }}
                              >
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                                  Participantes
                                </label>
                                <span style={{ fontSize: 14, color: '#6b7280' }}>
                                  {showSociosSection ? '▼' : '▶'}
                                </span>
                              </div>
                              {showSociosSection && (
                                <div style={{ 
                                  maxHeight: 200, 
                                  overflowY: 'auto',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 8,
                                  padding: 8,
                                  background: '#fff'
                                }}>
                                {socios
                                  .sort((a, b) => {
                                    const aSelected = editingData.selectedSocios[a.id] || false;
                                    const bSelected = editingData.selectedSocios[b.id] || false;
                                    if (aSelected && !bSelected) return -1;
                                    if (!aSelected && bSelected) return 1;
                                    return (a.alias || a.nombre || a.email).localeCompare(b.alias || b.nombre || b.email);
                                  })
                                  .map(socio => (
                                  <div key={socio.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 8, 
                                    marginBottom: 8,
                                    padding: 8,
                                    background: editingData.selectedSocios[socio.id] ? '#eff6ff' : '#fff',
                                    borderRadius: 6,
                                    border: editingData.selectedSocios[socio.id] ? '2px solid #3b82f6' : '1px solid #e5e7eb'
                                  }}>
                                    <input 
                                      type="checkbox"
                                      checked={editingData.selectedSocios[socio.id] || false}
                                      onChange={(e) => {
                                        const newSelected = { ...editingData.selectedSocios, [socio.id]: e.target.checked };
                                        const newAttendees = { ...editingData.attendeesCount };
                                        if (e.target.checked && !newAttendees[socio.id]) {
                                          newAttendees[socio.id] = 1;
                                        }
                                        setEditingData(d => ({
                                          ...d,
                                          selectedSocios: newSelected,
                                          attendeesCount: newAttendees
                                        }));
                                      }}
                                      style={{ width: 16, height: 16 }}
                                    />
                                    <label style={{ 
                                      flex: 1, 
                                      fontSize: 12, 
                                      color: '#374151',
                                      fontWeight: editingData.selectedSocios[socio.id] ? 600 : 400
                                    }}>
                                      {socio.alias || socio.nombre || socio.email}
                                    </label>
                                    {editingData.selectedSocios[socio.id] && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentVal = editingData.attendeesCount[socio.id] || 1;
                                            if (currentVal > 1) {
                                              setEditingData(d => ({
                                                ...d,
                                                attendeesCount: {
                                                  ...d.attendeesCount,
                                                  [socio.id]: currentVal - 1
                                                }
                                              }));
                                            }
                                          }}
                                          style={{
                                            width: 26,
                                            height: 26,
                                            padding: 0,
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: '#fff',
                                            backgroundColor: '#ef4444',
                                            border: 'none',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          −
                                        </button>
                                        <span style={{ 
                                          minWidth: 32,
                                          textAlign: 'center',
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: '#1f2937',
                                          backgroundColor: '#fff',
                                          padding: '4px 6px',
                                          borderRadius: 4,
                                          border: '1px solid #d1d5db'
                                        }}>
                                          {editingData.attendeesCount[socio.id] || 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentVal = editingData.attendeesCount[socio.id] || 1;
                                            setEditingData(d => ({
                                              ...d,
                                              attendeesCount: {
                                                ...d.attendeesCount,
                                                [socio.id]: currentVal + 1
                                              }
                                            }));
                                          }}
                                          style={{
                                            width: 26,
                                            height: 26,
                                            padding: 0,
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: '#fff',
                                            backgroundColor: '#10b981',
                                            border: 'none',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* Añadir productos */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                            Añadir productos
                          </label>
                          
                          {/* Selector de categoría */}
                          <div style={{ marginBottom: 8 }}>
                            <select
                              value={selectedCategoryEdit}
                              onChange={(e) => {
                                setSelectedCategoryEdit(e.target.value);
                                setSelectedProductEdit('');
                              }}
                              className="full-input"
                              style={{ fontSize: 13 }}
                            >
                              <option value="">Seleccionar categoría...</option>
                              {(() => {
                                const categoriesSet = new Set();
                                products.forEach(p => {
                                  const cat = p.category || 'Sin categoría';
                                  categoriesSet.add(cat);
                                });
                                return Array.from(categoriesSet)
                                  .sort((a, b) => a.localeCompare(b))
                                  .map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ));
                              })()}
                            </select>
                          </div>

                          {/* Selector de producto */}
                          <div style={{ marginBottom: 8 }}>
                            <select
                              value={selectedProductEdit}
                              onChange={(e) => setSelectedProductEdit(e.target.value)}
                              disabled={!selectedCategoryEdit}
                              className="full-input"
                              style={{ 
                                fontSize: 13,
                                backgroundColor: !selectedCategoryEdit ? '#f3f4f6' : '#fff',
                                cursor: !selectedCategoryEdit ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <option value="">Seleccionar producto...</option>
                              {selectedCategoryEdit && products
                                .filter(p => (p.category || 'Sin categoría') === selectedCategoryEdit)
                                .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.label || 'Sin nombre'} - {Number(p.price || 0).toFixed(2)}€
                                  </option>
                                ))
                              }
                            </select>
                          </div>

                          {/* Botones añadir */}
                          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            <button
                              onClick={() => {
                                if (selectedProductEdit) {
                                  const prod = products.find(p => p.id === selectedProductEdit);
                                  if (prod) {
                                    const newLines = [...(editingData.productLines || []), {
                                      label: prod.label,
                                      price: Number(prod.price || 0),
                                      qty: 1,
                                      productId: prod.id
                                    }];
                                    setEditingData({ ...editingData, productLines: newLines });
                                    setSelectedProductEdit('');
                                  }
                                }
                              }}
                              disabled={!selectedProductEdit}
                              style={{
                                flex: 1,
                                padding: 10,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#fff',
                                backgroundColor: !selectedProductEdit ? '#9ca3af' : '#10b981',
                                border: 'none',
                                borderRadius: 6,
                                cursor: !selectedProductEdit ? 'not-allowed' : 'pointer'
                              }}
                            >
                              ✅ Añadir producto
                            </button>
                            <button
                              onClick={addLineToEditing}
                              style={{
                                flex: 1,
                                padding: 10,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#fff',
                                backgroundColor: '#6366f1',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Manual
                            </button>
                          </div>
                        </div>

                        {/* Líneas de productos */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                            Productos en el ticket
                          </label>
                          {(editingData.productLines || []).map((line, idx) => (
                            <div key={idx} style={{ 
                              display: 'flex', 
                              gap: 4, 
                              marginBottom: 8,
                              alignItems: 'center',
                              background: '#fff',
                              padding: 8,
                              borderRadius: 6,
                              border: '1px solid #e5e7eb'
                            }}>
                              <input 
                                type="text"
                                value={line.label || ''}
                                onChange={(e) => updateLineEditing(idx, { label: e.target.value })}
                                placeholder="Producto"
                                style={{ 
                                  flex: 1,
                                  minWidth: 0,
                                  padding: 6,
                                  fontSize: 12,
                                  border: '1px solid #d1d5db',
                                  borderRadius: 4
                                }}
                              />
                              <input 
                                type="number"
                                value={line.qty || 1}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateLineEditing(idx, { qty: val === '' ? '' : Math.max(1, Number(val)) });
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '' || Number(e.target.value) < 1) {
                                    updateLineEditing(idx, { qty: 1 });
                                  }
                                }}
                                min="1"
                                style={{ 
                                  width: 40,
                                  padding: 6,
                                  fontSize: 12,
                                  border: '1px solid #d1d5db',
                                  borderRadius: 4,
                                  textAlign: 'center'
                                }}
                              />
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                  type="number"
                                  value={line.price || 0}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateLineEditing(idx, { price: val === '' ? '' : Number(val) });
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      updateLineEditing(idx, { price: 0 });
                                    }
                                  }}
                                  step="0.01"
                                  style={{ 
                                    width: 50,
                                    padding: 6,
                                    paddingRight: 18,
                                    fontSize: 12,
                                    border: '1px solid #d1d5db',
                                    borderRadius: 4
                                  }}
                                />
                                <span style={{ position: 'absolute', right: 6, fontSize: 11, color: '#6b7280', pointerEvents: 'none' }}>€</span>
                              </div>
                              <button 
                                onClick={() => removeLineFromEditing(idx)}
                                style={{
                                  padding: 4,
                                  fontSize: 14,
                                  background: '#fee2e2',
                                  border: '1px solid #fecaca',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  width: 32,
                                  height: 32,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                          
                          {/* Total */}
                          <div style={{ 
                            marginTop: 12, 
                            paddingTop: 12, 
                            borderTop: '2px solid #e5e7eb', 
                            fontSize: 15, 
                            fontWeight: 700, 
                            color: '#059669', 
                            textAlign: 'right' 
                          }}>
                            Total: {(editingData.productLines || []).reduce((s, l) => s + (Number(l.price || 0) * Number(l.qty || 1)), 0).toFixed(2)}€
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          <button
                            onClick={cancelEdit}
                            style={{
                              flex: 1,
                              padding: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#374151',
                              backgroundColor: '#f3f4f6',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer'
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={saveEdit}
                            style={{
                              flex: 1,
                              padding: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#fff',
                              backgroundColor: '#3b82f6',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer'
                            }}
                          >
                            💾 Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

// helper to convert datetime-local -> Date used above
function serverTimestampIfWanted() { return undefined; }