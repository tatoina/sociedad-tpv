// src/pages/ListadosTPV.jsx
import React, { useState, useEffect } from 'react';
import { queryExpenses, getAllSocios, deleteExpense, updateExpense, subscribeProducts } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import * as XLSX from 'xlsx';

export default function ListadosTPV({ user, profile }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socios, setSocios] = useState([]);
  const [selectedSocio, setSelectedSocio] = useState('todos');
  const [showTickets, setShowTickets] = useState(false);
  const [searchTicket, setSearchTicket] = useState('');
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialDescargas, setHistorialDescargas] = useState([]);
  const [expandedTickets, setExpandedTickets] = useState(new Set());
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  
  // Inicializar con el mes actual
  const getCurrentMonthDates = () => {
    const today = new Date();
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      from: formatDate(firstDayCurrentMonth),
      to: formatDate(lastDayCurrentMonth)
    };
  };
  
  const currentMonth = getCurrentMonthDates();
  const [dateFrom, setDateFrom] = useState(currentMonth.from);
  const [dateTo, setDateTo] = useState(currentMonth.to);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (user?.uid) {
      loadExpenses();
      loadSocios();
      if (profile?.isAdmin) {
        cargarHistorial();
      }
    }
  }, [user, profile]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, dateFrom, dateTo, selectedSocio]);

  // Descarga automática el día 1 de cada mes
  useEffect(() => {
    if (profile?.isAdmin && expenses.length > 0) {
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      // Verificar si es día 1
      if (dayOfMonth === 1) {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const key = `autoDownload_${currentYear}_${currentMonth}`;
        
        // Verificar si ya se descargó este mes
        const yaDescargado = localStorage.getItem(key);
        
        if (!yaDescargado) {
          // Esperar 2 segundos para asegurar que los datos estén cargados
          setTimeout(() => {
            exportarMesAnteriorPorSocio(true);
            localStorage.setItem(key, 'true');
          }, 2000);
        }
      }
    }
  }, [expenses, profile]);

  const loadSocios = async () => {
    try {
      const allSocios = await getAllSocios();
      setSocios(allSocios);
    } catch (err) {
      console.error('Error cargando socios:', err);
    }
  };

  // Cargar productos
  useEffect(() => {
    const unsub = subscribeProducts(setProducts, true);
    return () => unsub && unsub();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await queryExpenses({ isAdmin: profile?.isAdmin || false });
      // Si es admin, mostrar todos; si no, solo los del usuario actual
      const userExpenses = profile?.isAdmin 
        ? data 
        : data.filter(exp => exp.userId === user?.uid || exp.uid === user?.uid);
      setExpenses(userExpenses);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este ticket?')) {
      return;
    }
    try {
      await deleteExpense(ticketId);
      alert('Ticket eliminado correctamente');
      loadExpenses();
    } catch (err) {
      console.error('Error eliminando ticket:', err);
      alert('Error al eliminar el ticket');
    }
  };

  const toggleExpandTicket = (ticketId) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const startEditTicket = async (ticket) => {
    // Expandir el ticket automáticamente
    const newExpanded = new Set(expandedTickets);
    newExpanded.add(ticket.id);
    setExpandedTickets(newExpanded);
    
    const expDate = ticket.date?.toDate ? ticket.date.toDate() : new Date(ticket.date);
    const dateInput = expDate.toISOString().slice(0, 16);
    
    // Preparar selección de socios
    const selectedSociosMap = {};
    const attendeesMap = {};
    let totalAttendees = 0;
    
    if (ticket.category === 'sociedad') {
      // Nuevo sistema: cargar desde participantes
      if (ticket.participantes && Array.isArray(ticket.participantes)) {
        ticket.participantes.forEach(p => {
          selectedSociosMap[p.uid] = true;
          attendeesMap[p.uid] = p.attendees || 1;
          totalAttendees += (p.attendees || 1);
        });
      } else {
        // Sistema antiguo: solo el socio actual
        selectedSociosMap[ticket.uid] = true;
        attendeesMap[ticket.uid] = ticket.attendees || 1;
        totalAttendees = ticket.attendees || 0;
      }
    }
    
    // Establecer datos de edición y luego el ID (para evitar condición de carrera)
    const newEditingData = {
      productLines: (ticket.productLines || []).map(pl => ({ ...pl })),
      dateInput: dateInput,
      category: ticket.category || 'venta',
      attendees: totalAttendees,
      eventoTexto: ticket.eventoTexto || '',
      selectedSocios: selectedSociosMap,
      attendeesCount: attendeesMap,
      originalUid: ticket.uid
    };
    
    setEditingData(newEditingData);
    setEditingTicketId(ticket.id);
  };

  const cancelEdit = () => {
    setEditingTicketId(null);
    setEditingData(null);
  };

  const saveEdit = async () => {
    if (!editingTicketId) return;
    try {
      const newDate = new Date(editingData.dateInput);
      const lines = editingData.productLines || [];
      const computedTotal = lines.reduce((s, l) => s + (Number(l.price || 0) * Number(l.qty || 1)), 0);
      const item = lines.map(l => `${l.qty}x ${l.label}`).join(", ");
      
      if (editingData.category === 'sociedad') {
        // Calcular reparto entre socios seleccionados
        const selectedSociosList = Object.entries(editingData.selectedSocios || {})
          .filter(([_, isSelected]) => isSelected)
          .map(([socioId, _]) => socioId);
        
        console.log('📊 CÁLCULO DE REPARTO:');
        console.log('   Socios seleccionados:', selectedSociosList);
        console.log('   attendeesCount:', editingData.attendeesCount);
        
        if (selectedSociosList.length === 0) {
          alert('Debes seleccionar al menos un socio');
          return;
        }
        
        // Calcular total de asistentes
        const totalAttendees = selectedSociosList.reduce((sum, socioId) => {
          const asist = Number(editingData.attendeesCount[socioId] || 1);
          console.log(`   Socio ${socioId}: ${asist} asistentes`);
          return sum + asist;
        }, 0);
        
        console.log('   Total de asistentes:', totalAttendees);
        console.log('   Gasto total:', computedTotal);
        
        const amountPerAttendee = computedTotal / totalAttendees;
        console.log('   Precio por asistente:', amountPerAttendee.toFixed(2));
        
        // Construir array de participantes
        const participantes = selectedSociosList.map(socioId => {
          const attendees = Number(editingData.attendeesCount[socioId] || 1);
          const socioAmount = amountPerAttendee * attendees;
          const socio = socios.find(s => s.id === socioId);
          console.log(`   → Socio ${socioId} paga: ${socioAmount.toFixed(2)}€ (${attendees} × ${amountPerAttendee.toFixed(2)})`);
          return {
            uid: socioId,
            email: socio?.email || '',
            nombre: socio?.nombre || socio?.email?.split('@')[0] || 'Socio',
            attendees: attendees,
            amount: socioAmount
          };
        });
        
        const eventoTexto = editingData.eventoTexto?.trim() || `Gasto conjunto`;
        
        // Actualizar el ticket único con los nuevos participantes
        await updateExpense(editingTicketId, {
          productLines: lines,
          amount: computedTotal,
          item: `[SOCIEDAD - ${eventoTexto}] ${item} (${totalAttendees} asistente${totalAttendees > 1 ? 's' : ''})`,
          date: newDate,
          category: 'sociedad',
          participantes: participantes,
          eventoTexto: eventoTexto,
          totalGeneral: computedTotal,
          amountPerAttendee: amountPerAttendee,
          totalAttendees: totalAttendees
        });
        
        alert('Ticket actualizado con ' + participantes.length + ' participantes');
      } else {
        // Ticket personal
        await updateExpense(editingTicketId, {
          productLines: lines,
          amount: computedTotal,
          item: item,
          date: newDate,
          category: editingData.category,
          attendees: null,
          eventoTexto: null,
          totalGeneral: null,
          amountPerAttendee: null,
          totalAttendees: null
        });
        
        alert('Ticket actualizado');
      }
      
      setEditingTicketId(null);
      setEditingData(null);
      loadExpenses();
    } catch (err) {
      console.error('Error actualizando ticket:', err);
      alert('Error al actualizar el ticket');
    }
  };

  const addLineToEditing = () => {
    setEditingData(prev => ({
      ...prev,
      productLines: [...(prev.productLines || []), { label: '', price: 0, qty: 1 }]
    }));
  };

  const removeLineFromEditing = (idx) => {
    setEditingData(prev => ({
      ...prev,
      productLines: prev.productLines.filter((_, i) => i !== idx)
    }));
  };

  const updateLineEditing = (idx, updates) => {
    setEditingData(prev => ({
      ...prev,
      productLines: prev.productLines.map((line, i) => 
        i === idx ? { ...line, ...updates } : line
      )
    }));
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    // Filtro por socio (solo para admin)
    if (profile?.isAdmin && selectedSocio !== 'todos') {
      filtered = filtered.filter(exp => exp.uid === selectedSocio);
    }

    // Filtro de búsqueda en tickets
    if (searchTicket) {
      const searchLower = searchTicket.toLowerCase();
      filtered = filtered.filter(exp => {
        const dateStr = formatDate(exp.date).toLowerCase();
        const emailStr = (exp.userEmail || '').toLowerCase();
        const linesStr = (exp.productLines || []).map(l => (l.label || '').toLowerCase()).join(' ');
        return dateStr.includes(searchLower) || emailStr.includes(searchLower) || linesStr.includes(searchLower);
      });
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(exp => {
        const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
        return expDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(exp => {
        const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
        return expDate <= toDate;
      });
    }

    // Ordenar por fecha descendente
    filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });

    setFilteredExpenses(filtered);
  };

  const calculateTotals = () => {
    let totalAmount = 0;
    let totalSociedad = 0;
    let totalPersonal = 0;
    const sociosDesglose = {}; // Desglose por socio
    const isAdmin = profile?.isAdmin;
    const currentUserId = user?.uid;

    filteredExpenses.forEach(exp => {
      let expAmount = 0;
      
      // Nuevo sistema: tickets con participantes
      if (exp.category === 'sociedad' && exp.participantes && Array.isArray(exp.participantes)) {
        // Para cada participante, sumar su parte
        exp.participantes.forEach(p => {
          const amount = Number(p.amount || 0);
          
          // Si NO es admin, solo contar la parte del usuario actual
          if (!isAdmin && p.uid !== currentUserId) {
            return; // Saltar este participante
          }
          
          totalSociedad += amount;
          totalAmount += amount;
          
          const socioId = p.uid;
          const socioEmail = p.email || 'Sin email';
          
          if (!sociosDesglose[socioId]) {
            sociosDesglose[socioId] = {
              email: socioEmail,
              totalPersonal: 0,
              totalSociedad: 0,
              total: 0
            };
          }
          
          sociosDesglose[socioId].totalSociedad += amount;
          sociosDesglose[socioId].total += amount;
        });
        return; // Siguiente ticket
      }
      
      // Sistema antiguo o tickets personales
      if (exp.category === 'sociedad') {
        expAmount = Number(exp.amount || 0);
      } else {
        const lines = exp.productLines || [];
        lines.forEach(line => {
          const qty = Number(line.qty || 1);
          const price = Number(line.price || 0);
          expAmount += qty * price;
        });
      }
      
      // Si NO es admin, solo contar los tickets del usuario actual
      if (!isAdmin && exp.uid !== currentUserId && exp.userId !== currentUserId) {
        return; // Saltar este ticket
      }
      
      totalAmount += expAmount;
      
      const socioId = exp.uid;
      const socioEmail = exp.userEmail || 'Sin email';
      
      if (!sociosDesglose[socioId]) {
        sociosDesglose[socioId] = {
          email: socioEmail,
          totalPersonal: 0,
          totalSociedad: 0,
          total: 0
        };
      }
      
      if (exp.category === 'sociedad') {
        totalSociedad += expAmount;
        sociosDesglose[socioId].totalSociedad += expAmount;
      } else {
        totalPersonal += expAmount;
        sociosDesglose[socioId].totalPersonal += expAmount;
      }
      
      sociosDesglose[socioId].total += expAmount;
    });

    return {
      totalTickets: filteredExpenses.length,
      totalAmount: totalAmount.toFixed(2),
      totalSociedad: totalSociedad.toFixed(2),
      totalPersonal: totalPersonal.toFixed(2),
      sociosDesglose: Object.entries(sociosDesglose).map(([id, data]) => ({
        id,
        email: data.email,
        totalPersonal: data.totalPersonal.toFixed(2),
        totalSociedad: data.totalSociedad.toFixed(2),
        total: data.total.toFixed(2)
      })).sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
    };
  };

  const totals = calculateTotals();

  const exportToExcel = () => {
    if (filteredExpenses.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Mostrar modal de selección
    setShowExportModal(true);
  };

  const exportarDetalle = () => {
    // Crear mapeo de uid/email a nombre completo
    const userMap = {};
    socios.forEach(socio => {
      const nombreCompleto = `${socio.name || ''} ${socio.surname || ''}`.trim() || socio.email;
      userMap[socio.id] = nombreCompleto;
      userMap[socio.email] = nombreCompleto;
    });

    // Ordenar gastos por usuario y luego por fecha
    const expensesSorted = [...filteredExpenses].sort((a, b) => {
      const userNameA = userMap[a.uid] || userMap[a.userEmail] || a.userEmail || 'Sin usuario';
      const userNameB = userMap[b.uid] || userMap[b.userEmail] || b.userEmail || 'Sin usuario';
      
      // Primero ordenar por usuario
      const userCompare = userNameA.localeCompare(userNameB);
      if (userCompare !== 0) return userCompare;
      
      // Si son del mismo usuario, ordenar por fecha
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });

    // Crear datos para Excel con detalle
    const excelData = [];
    
    // Agregar encabezado con fechas
    excelData.push({
      'Fecha': `Período: ${dateFrom} al ${dateTo}`,
      'Usuario': '',
      'Tipo': '',
      'Producto': '',
      'Cantidad': '',
      'Precio Unit.': '',
      'Subtotal': ''
    });
    excelData.push({
      'Fecha': '',
      'Usuario': '',
      'Tipo': '',
      'Producto': '',
      'Cantidad': '',
      'Precio Unit.': '',
      'Subtotal': ''
    });
    
    let currentUser = null;
    let userTotal = 0;
    
    expensesSorted.forEach((exp) => {
      const lines = exp.productLines || [];
      const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      const dateStr = expDate.toLocaleDateString('es-ES');
      
      const userName = userMap[exp.uid] || userMap[exp.userEmail] || exp.userEmail || 'Sin usuario';
      
      // Si cambia el usuario, agregar total del usuario anterior
      if (currentUser && currentUser !== userName) {
        excelData.push({
          'Fecha': '',
          'Usuario': '',
          'Tipo': '',
          'Producto': `TOTAL ${currentUser}`,
          'Cantidad': '',
          'Precio Unit.': '',
          'Subtotal': parseFloat(userTotal.toFixed(2))
        });
        excelData.push({
          'Fecha': '',
          'Usuario': '',
          'Tipo': '',
          'Producto': '',
          'Cantidad': '',
          'Precio Unit.': '',
          'Subtotal': ''
        });
        userTotal = 0;
      }
      
      currentUser = userName;
      
      lines.forEach((line, lineIdx) => {
        const qty = Number(line.qty || 1);
        const price = Number(line.price || 0);
        const subtotal = qty * price;
        userTotal += subtotal;
        
        excelData.push({
          'Fecha': dateStr,
          'Usuario': userName,
          'Tipo': exp.category === 'sociedad' ? 'SOCIEDAD' : 'Personal',
          'Producto': line.label || '',
          'Cantidad': qty,
          'Precio Unit.': parseFloat(price.toFixed(2)),
          'Subtotal': parseFloat(subtotal.toFixed(2))
        });
      });
    });

    // Agregar total del último usuario
    if (currentUser) {
      excelData.push({
        'Fecha': '',
        'Usuario': '',
        'Tipo': '',
        'Producto': `TOTAL ${currentUser}`,
        'Cantidad': '',
        'Precio Unit.': '',
        'Subtotal': parseFloat(userTotal.toFixed(2))
      });
    }

    // Agregar línea en blanco
    excelData.push({
      'Fecha': '',
      'Usuario': '',
      'Tipo': '',
      'Producto': '',
      'Cantidad': '',
      'Precio Unit.': '',
      'Subtotal': ''
    });

    // Calcular total general
    const totalGeneral = filteredExpenses.reduce((sum, exp) => {
      const lines = exp.productLines || [];
      return sum + lines.reduce((lineSum, line) => {
        const qty = Number(line.qty || 1);
        const price = Number(line.price || 0);
        return lineSum + (qty * price);
      }, 0);
    }, 0);

    excelData.push({
      'Fecha': '',
      'Usuario': '',
      'Tipo': '',
      'Producto': 'TOTAL GENERAL',
      'Cantidad': '',
      'Precio Unit.': '',
      'Subtotal': parseFloat(totalGeneral.toFixed(2))
    });

    // Crear workbook de Excel
    const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: false });
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 30 }, // Usuario
      { wch: 12 }, // Tipo
      { wch: 35 }, // Producto
      { wch: 10 }, // Cantidad
      { wch: 12 }, // Precio Unit.
      { wch: 12 }  // Subtotal
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos Detalle');
    
    // Generar buffer de Excel
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Descargar archivo
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `gastos_detalle_${dateFrom}_${dateTo}.xlsx`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarSimple = () => {
    // Crear mapeo de uid/email a nombre completo
    const userMap = {};
    socios.forEach(socio => {
      const nombreCompleto = `${socio.name || ''} ${socio.surname || ''}`.trim() || socio.email;
      userMap[socio.id] = nombreCompleto;
      userMap[socio.email] = nombreCompleto;
    });

    // Agrupar por usuario y categoría
    const datosPorUsuario = {};
    
    filteredExpenses.forEach(exp => {
      const userName = userMap[exp.uid] || userMap[exp.userEmail] || exp.userEmail || 'Sin usuario';
      
      if (!datosPorUsuario[userName]) {
        datosPorUsuario[userName] = {
          individual: 0,
          comun: 0
        };
      }
      
      const lines = exp.productLines || [];
      const totalTicket = lines.reduce((sum, line) => {
        const qty = Number(line.qty || 1);
        const price = Number(line.price || 0);
        return sum + (qty * price);
      }, 0);
      
      if (exp.category === 'sociedad') {
        datosPorUsuario[userName].comun += totalTicket;
      } else {
        datosPorUsuario[userName].individual += totalTicket;
      }
    });

    // Obtener mes y año del rango de fechas
    const fechaInicio = new Date(dateFrom);
    const mesNombre = fechaInicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    // Crear datos para Excel
    const excelData = [];
    
    // Agregar encabezado
    excelData.push({
      'Mes': mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
      'Nombre': '',
      'Gasto Individual': '',
      'Gasto Común': '',
      'Total': ''
    });
    excelData.push({
      'Mes': '',
      'Nombre': '',
      'Gasto Individual': '',
      'Gasto Común': '',
      'Total': ''
    });

    // Agregar datos de cada usuario
    Object.entries(datosPorUsuario)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([usuario, datos]) => {
        const total = datos.individual + datos.comun;
        excelData.push({
          'Mes': mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
          'Nombre': usuario,
          'Gasto Individual': parseFloat(datos.individual.toFixed(2)),
          'Gasto Común': parseFloat(datos.comun.toFixed(2)),
          'Total': parseFloat(total.toFixed(2))
        });
      });

    // Calcular totales generales
    const totalIndividual = Object.values(datosPorUsuario).reduce((sum, d) => sum + d.individual, 0);
    const totalComun = Object.values(datosPorUsuario).reduce((sum, d) => sum + d.comun, 0);
    const totalGeneral = totalIndividual + totalComun;

    // Agregar línea en blanco
    excelData.push({
      'Mes': '',
      'Nombre': '',
      'Gasto Individual': '',
      'Gasto Común': '',
      'Total': ''
    });

    // Agregar totales
    excelData.push({
      'Mes': '',
      'Nombre': 'TOTAL',
      'Gasto Individual': parseFloat(totalIndividual.toFixed(2)),
      'Gasto Común': parseFloat(totalComun.toFixed(2)),
      'Total': parseFloat(totalGeneral.toFixed(2))
    });

    // Crear workbook de Excel
    const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: false });
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 20 }, // Mes
      { wch: 30 }, // Nombre
      { wch: 18 }, // Gasto Individual
      { wch: 18 }, // Gasto Común
      { wch: 15 }  // Total
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos Simple');
    
    // Generar buffer de Excel
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Descargar archivo
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `gastos_simple_${dateFrom}_${dateTo}.xlsx`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarMesAnteriorPorSocio = async (esAutomatico = false) => {
    // Calcular fechas del mes anterior
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    // Filtrar gastos del mes anterior
    const expensesLastMonth = expenses.filter(exp => {
      const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      return expDate >= firstDayLastMonth && expDate <= lastDayLastMonth;
    });

    if (expensesLastMonth.length === 0) {
      if (!esAutomatico) {
        alert('No hay datos del mes anterior para exportar');
      }
      return;
    }

    // Obtener nombres de usuarios desde Firestore
    const { db } = await import('../firebase');
    const { collection, getDocs } = await import('firebase/firestore');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersMap = {};
    usersSnapshot.docs.forEach(doc => {
      usersMap[doc.id] = doc.data().name || doc.data().email || 'Sin nombre';
    });

    // Agrupar por socio
    const sociosData = {};

    expensesLastMonth.forEach(exp => {
      const socioId = exp.uid;
      const socioNombre = usersMap[socioId] || 'Socio Desconocido';
      
      if (!sociosData[socioId]) {
        sociosData[socioId] = {
          nombre: socioNombre,
          gastoTPV: 0,
          gastoSociedad: 0,
          total: 0,
          asistentesSociedad: 0
        };
      }

      const lines = exp.productLines || [];
      let expAmount = 0;
      lines.forEach(line => {
        const qty = Number(line.qty || 1);
        const price = Number(line.price || 0);
        expAmount += qty * price;
      });

      if (exp.category === 'sociedad') {
        sociosData[socioId].gastoSociedad += expAmount;
        // Sumar asistentes
        sociosData[socioId].asistentesSociedad += Number(exp.attendees || 0);
      } else {
        sociosData[socioId].gastoTPV += expAmount;
      }
      
      sociosData[socioId].total += expAmount;
    });

    // Convertir a array y ordenar por total descendente
    const sociosArray = Object.entries(sociosData).map(([id, data]) => ({
      'Nombre Socio': data.nombre,
      'Gasto TPV': parseFloat(data.gastoTPV.toFixed(2)),
      'Gasto Sociedad': parseFloat(data.gastoSociedad.toFixed(2)),
      'Asistentes': data.asistentesSociedad || '',
      'Total': parseFloat(data.total.toFixed(2))
    })).sort((a, b) => b['Total'] - a['Total']);

    // Calcular subtotales
    const totalAsistentes = sociosArray.reduce((sum, s) => sum + (s['Asistentes'] || 0), 0);
    const subtotales = {
      'Nombre Socio': 'SUBTOTALES',
      'Gasto TPV': parseFloat(sociosArray.reduce((sum, s) => sum + s['Gasto TPV'], 0).toFixed(2)),
      'Gasto Sociedad': parseFloat(sociosArray.reduce((sum, s) => sum + s['Gasto Sociedad'], 0).toFixed(2)),
      'Asistentes': totalAsistentes,
      'Total': parseFloat(sociosArray.reduce((sum, s) => sum + s['Total'], 0).toFixed(2))
    };

    // Crear datos para Excel
    const excelData = [
      ...sociosArray,
      {}, // Línea en blanco
      subtotales
    ];

    // Crear workbook de Excel
    const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: false });
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 30 }, // Nombre Socio
      { wch: 12 }, // Gasto TPV
      { wch: 15 }, // Gasto Sociedad
      { wch: 12 }, // Asistentes
      { wch: 12 }  // Total
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Mensual');
    
    // Generar buffer de Excel
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Formato nombre: resumen_mesAnio.xlsx (ej: resumen_11-2024.xlsx)
    const monthName = firstDayLastMonth.toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' });
    const fileName = `resumen_${monthName.replace('/', '-')}.xlsx`;
    
    try {
      // Subir a Firebase Storage con estructura por año
      const year = firstDayLastMonth.getFullYear();
      const fileRef = storageRef(storage, `resumen-mensual/${year}/${fileName}`);
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);
      
      // Guardar en historial con URL de Firebase
      guardarEnHistorial(fileName, subtotales, esAutomatico, downloadURL);
      
      if (!esAutomatico) {
        alert(`Excel guardado en la nube: ${fileName}\n\nPuedes descargarlo desde "Ver Historial"`);
      }
    } catch (error) {
      console.error('Error al subir archivo a Firebase:', error);
      if (!esAutomatico) {
        alert('Error al guardar el archivo en la nube');
      }
    }
  };

  const cargarHistorial = async () => {
    try {
      // Leer desde Firestore collection 'historial-resumenes'
      const { db } = await import('../firebase');
      const { collection, query, orderBy: fbOrderBy, getDocs } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'historial-resumenes'),
        fbOrderBy('fecha', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const historial = snapshot.docs.map(doc => ({
        id: doc.id,
        fecha: doc.data().fecha?.toDate?.()?.toLocaleString('es-ES') || doc.data().fecha,
        archivo: doc.data().nombreArchivo,
        gastoTPV: doc.data().totalTPV,
        gastoSociedad: doc.data().totalSociedad,
        total: doc.data().totalGeneral,
        tipo: doc.data().tipo === 'automatico' ? 'Automático' : 'Manual',
        url: doc.data().url,
        anio: doc.data().anio
      }));
      
      setHistorialDescargas(historial);
      
      // Expandir todos los años por defecto
      const anios = [...new Set(historial.map(h => h.anio))];
      setExpandedYears(new Set(anios));
    } catch (error) {
      console.error('Error cargando historial:', error);
      // Fallback a localStorage si hay error
      const historial = localStorage.getItem('historialDescargas');
      if (historial) {
        setHistorialDescargas(JSON.parse(historial));
      }
    }
  };

  const guardarEnHistorial = async (nombreArchivo, totales, esAutomatico, downloadURL) => {
    try {
      // Extraer año del nombre de archivo (formato: resumen_MM-YYYY.csv)
      const match = nombreArchivo.match(/(\d{4})/);
      const anio = match ? parseInt(match[1]) : new Date().getFullYear();
      const mesMatch = nombreArchivo.match(/resumen_(\d{2})/);
      const mesNum = mesMatch ? parseInt(mesMatch[1]) : new Date().getMonth() + 1;
      const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const mes = nombresMeses[mesNum - 1];

      // Guardar en Firestore
      const { db } = await import('../firebase');
      const { collection, addDoc } = await import('firebase/firestore');
      
      await addDoc(collection(db, 'historial-resumenes'), {
        fecha: new Date(),
        nombreArchivo: nombreArchivo,
        mes: mes,
        anio: anio,
        totalTPV: totales.gastoTPV,
        totalSociedad: totales.gastoSociedad,
        totalGeneral: totales.total,
        url: downloadURL,
        tipo: esAutomatico ? 'automatico' : 'manual',
        rutaStorage: `resumen-mensual/${anio}/${nombreArchivo}`
      });

      // Recargar historial
      await cargarHistorial();
    } catch (error) {
      console.error('Error guardando en historial:', error);
      // Fallback a localStorage
      const nuevaDescarga = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-ES'),
        archivo: nombreArchivo,
        gastoTPV: totales.gastoTPV,
        gastoSociedad: totales.gastoSociedad,
        total: totales.total,
        tipo: esAutomatico ? 'Automático' : 'Manual',
        url: downloadURL
      };
      const historial = JSON.parse(localStorage.getItem('historialDescargas') || '[]');
      historial.unshift(nuevaDescarga);
      localStorage.setItem('historialDescargas', JSON.stringify(historial));
      setHistorialDescargas(historial);
    }
  };

  const eliminarArchivo = async (descarga) => {
    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${descarga.archivo}"?`)) {
      return;
    }

    try {
      // Eliminar de Firebase Storage si existe URL
      if (descarga.url) {
        const match = descarga.archivo.match(/(\d{4})/);
        const year = match ? match[1] : '';
        if (year) {
          const fileRef = storageRef(storage, `resumen-mensual/${year}/${descarga.archivo}`);
          await deleteObject(fileRef);
        }
      }

      // Eliminar de Firestore
      const { db } = await import('../firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'historial-resumenes', descarga.id));

      // Recargar historial
      await cargarHistorial();

      alert('Archivo eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      alert('Error al eliminar el archivo. Puede que ya no exista en el servidor.');
      
      // Fallback: eliminar del historial local
      const historial = JSON.parse(localStorage.getItem('historialDescargas') || '[]');
      const nuevoHistorial = historial.filter(h => h.id !== descarga.id);
      localStorage.setItem('historialDescargas', JSON.stringify(nuevoHistorial));
      setHistorialDescargas(nuevoHistorial);
    }
  };

  const eliminarCarpetaAnio = async (anio) => {
    if (!window.confirm(`¿Estás seguro de eliminar TODOS los archivos del año ${anio}?\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      // Listar todos los archivos del año en Firebase Storage
      const folderRef = storageRef(storage, `resumen-mensual/${anio}`);
      const listResult = await listAll(folderRef);

      // Eliminar todos los archivos
      const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);

      // Eliminar de Firestore todos los registros del año
      const { db } = await import('../firebase');
      const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'historial-resumenes'),
        where('anio', '==', parseInt(anio))
      );
      
      const snapshot = await getDocs(q);
      const deleteFirestorePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'historial-resumenes', docSnap.id))
      );
      await Promise.all(deleteFirestorePromises);

      // Recargar historial
      await cargarHistorial();

      alert(`Todos los archivos del año ${anio} han sido eliminados`);
    } catch (error) {
      console.error('Error al eliminar carpeta:', error);
      alert('Error al eliminar la carpeta. Algunos archivos pueden no haberse eliminado.');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return <div style={{ padding: 20 }}>No autenticado</div>;
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>Cargando gastos...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700, color: '#111827' }}>
        📊 Listados TPV
      </h2>

      {/* Filtros */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#374151' }}>
            Filtros
          </h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowHistorial(true)}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                backgroundColor: '#8b5cf6',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#7c3aed'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#8b5cf6'}
            >
              📂 Ver Historial
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredExpenses.length === 0}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                backgroundColor: filteredExpenses.length === 0 ? '#9ca3af' : '#10b981',
                border: 'none',
                borderRadius: 8,
                cursor: filteredExpenses.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📥 Exportar a Excel
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: profile?.isAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: 20, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {profile?.isAdmin && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#6b7280' }}>
                Socio
              </label>
              <select
                value={selectedSocio}
                onChange={(e) => setSelectedSocio(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  outline: 'none',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="todos">Todos los socios</option>
                {socios.map(socio => (
                  <option key={socio.id} value={socio.id}>
                    {socio.name} {socio.surname} ({socio.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de totales */}
      {filteredExpenses.length > 0 && (
        <>
          {/* Título con nombre de usuario */}
          <div style={{ 
            marginBottom: 16,
            textAlign: 'center'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: 8,
              fontSize: 18, 
              fontWeight: 600, 
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              GASTOS TOTALES DE: {profile?.nombre || profile?.name || user?.email?.split('@')[0] || 'Usuario'}
            </h3>
            <div style={{
              fontSize: 14,
              color: '#6b7280',
              fontWeight: 500
            }}>
              📅 {new Date(dateFrom).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(dateTo).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 20,
            marginBottom: 32
          }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Gastos Sociedad</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalSociedad}€</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Gastos Personales</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalPersonal}€</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Total General</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{totals.totalAmount}€</div>
          </div>
          </div>
        </>
      )}

      {/* Desglose por socio - Resumen para banco (solo admin) */}
      {profile?.isAdmin && filteredExpenses.length > 0 && totals.sociosDesglose && totals.sociosDesglose.length > 0 && (
        <div style={{
          background: '#fff',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: 32
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
              💰 Resumen Detallado por Socio
            </h3>
            <div style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>
              Periodo: {new Date(dateFrom).toLocaleDateString('es-ES')} - {new Date(dateTo).toLocaleDateString('es-ES')}
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Desglose de gastos personales (TPV) y gastos de sociedad por cada socio
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Socio
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  TPV (Personal)
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Sociedad
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {totals.sociosDesglose.map((socio, index) => (
                <tr key={socio.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#111827' }}>
                    {socio.email}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#8b5cf6', textAlign: 'right' }}>
                    {socio.totalPersonal}€
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#f59e0b', textAlign: 'right' }}>
                    {socio.totalSociedad}€
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 16, fontWeight: 600, color: '#059669', textAlign: 'right' }}>
                    {socio.total}€
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #374151', backgroundColor: '#f9fafb', fontWeight: 700 }}>
                <td style={{ padding: '16px', fontSize: 16, color: '#111827' }}>
                  TOTAL
                </td>
                <td style={{ padding: '16px', fontSize: 18, fontWeight: 700, color: '#8b5cf6', textAlign: 'right' }}>
                  {totals.totalPersonal}€
                </td>
                <td style={{ padding: '16px', fontSize: 18, fontWeight: 700, color: '#f59e0b', textAlign: 'right' }}>
                  {totals.totalSociedad}€
                </td>
                <td style={{ padding: '16px', fontSize: 20, fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                  {totals.totalAmount}€
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Lista de tickets - Colapsable */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
            📝 Histórico de Tickets
          </h3>
          <button
            onClick={() => setShowTickets(!showTickets)}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            {showTickets ? '▼ Ocultar' : '▶ Mostrar'}
          </button>
        </div>

        {showTickets && (
          <div>
            {/* Búsqueda de tickets */}
            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Buscar por socio, fecha o producto..."
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 14,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                Cargando...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                No hay tickets para mostrar
              </div>
            ) : (
              <>
              <div className="tpv-history-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                        #
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                        Fecha / Hora
                      </th>
                      {profile?.isAdmin && (
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                          Usuario
                        </th>
                      )}
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        Productos
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                        Tipo
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                        Total
                      </th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp, index) => {
                      const lines = exp.productLines || [];
                      // Para tickets de sociedad con participantes, calcular la parte del usuario actual
                      let total = 0;
                      let myPart = 0;
                      
                      if (exp.category === 'sociedad' && exp.participantes && Array.isArray(exp.participantes)) {
                        // Nuevo sistema: ticket único con participantes
                        total = Number(exp.totalGeneral || exp.amount || 0);
                        const myParticipacion = exp.participantes.find(p => p.uid === user?.uid);
                        myPart = myParticipacion ? Number(myParticipacion.amount || 0) : 0;
                      } else if (exp.category === 'sociedad') {
                        // Sistema antiguo: múltiples tickets
                        total = Number(exp.amount || 0);
                        myPart = total;
                      } else {
                        // Ticket personal
                        total = lines.reduce((sum, line) => {
                          const qty = Number(line.qty || 1);
                          const price = Number(line.price || 0);
                          return sum + (qty * price);
                        }, 0);
                        myPart = total;
                      }

                      const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
                      const fechaStr = expDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const horaStr = expDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                      const isExpanded = expandedTickets.has(exp.id);
                      
                      // Para mostrar participantes en la columna Tipo
                      let participantesDisplay = [];
                      if (exp.category === 'sociedad' && exp.participantes && Array.isArray(exp.participantes)) {
                        participantesDisplay = exp.participantes.map(p => ({
                          nombre: p.nombre || p.email?.split('@')[0] || 'Socio',
                          asistentes: p.attendees || 1
                        }));
                      }

                      return (
                        <React.Fragment key={exp.id}>
                          <tr 
                            style={{ 
                              borderBottom: '1px solid #e5e7eb', 
                              backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb',
                              cursor: 'pointer'
                            }}
                            onClick={() => toggleExpandTicket(exp.id)}
                          >
                            <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#6b7280' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 16 }}>{isExpanded ? '▼' : '▶'}</span>
                                #{index + 1}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 500 }}>{fechaStr}</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{horaStr}</div>
                            </td>
                            {profile?.isAdmin && (
                              <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                                {exp.userEmail || '-'}
                              </td>
                            )}
                            <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                              {lines.length} producto{lines.length !== 1 ? 's' : ''}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              {exp.category === 'sociedad' ? (
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
                                  {participantesDisplay.length > 0 && (
                                    <div style={{ fontSize: 10, marginTop: 4 }}>
                                      {participantesDisplay.map((p, i) => (
                                        <div key={i}>{p.nombre} ({p.asistentes})</div>
                                      ))}
                                    </div>
                                  )}
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
                              {profile?.isAdmin ? total.toFixed(2) : myPart.toFixed(2)}€
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{display:'flex', gap:8, justifyContent:'center'}}>
                                {/* Mostrar botón editar si es admin o si el ticket es del usuario */}
                                {(profile?.isAdmin || exp.userId === user?.uid || exp.uid === user?.uid) && (
                                  <button 
                                    className="btn-small" 
                                    onClick={() => {
                                      console.log('BOTÓN EDITAR CLICKEADO - Versión 2.1.2');
                                      if (editingTicketId === exp.id) {
                                        cancelEdit();
                                      } else {
                                        startEditTicket(exp);
                                      }
                                    }}
                                    style={{ minWidth: '40px' }}
                                  >
                                    {editingTicketId === exp.id ? '✖️' : '✏️'}
                                  </button>
                                )}
                                {/* Botón eliminar solo para admin */}
                                {profile?.isAdmin && (
                                  <button 
                                    className="btn-ghost" 
                                    onClick={() => handleDeleteTicket(exp.id)}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          
                          {/* Fila expandida con detalles */}
                          {isExpanded && (
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                              <td colSpan={profile?.isAdmin ? 7 : 6} style={{ padding: '20px 16px' }}>
                                {editingTicketId === exp.id && editingData ? (
                                  /* Vista de edición */
                                  <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 20, border: '2px solid #3b82f6', maxWidth: '100%', overflow: 'hidden' }}>
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
                                          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#374151' }}>
                                            Socios participantes
                                          </label>
                                          <div style={{ 
                                            maxHeight: 200, 
                                            overflowY: 'auto', 
                                            border: '1px solid #d1d5db', 
                                            borderRadius: 6, 
                                            padding: 12,
                                            backgroundColor: '#f9fafb'
                                          }}>
                                            {socios.map(socio => (
                                              <div key={socio.id} style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 12, 
                                                marginBottom: 8,
                                                padding: 8,
                                                backgroundColor: '#fff',
                                                borderRadius: 6,
                                                border: '1px solid #e5e7eb'
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
                                                  style={{ cursor: 'pointer' }}
                                                />
                                                <span style={{ flex: 1, fontSize: 13, color: '#111827' }}>
                                                  {socio.nombre || socio.email}
                                                </span>
                                                {editingData.selectedSocios?.[socio.id] && (
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ fontSize: 12, color: '#6b7280' }}>Asist.:</span>
                                                    <input
                                                      type="number"
                                                      min="1"
                                                      value={editingData.attendeesCount?.[socio.id] || 1}
                                                      onChange={(e) => {
                                                        const newAttendees = { 
                                                          ...editingData.attendeesCount, 
                                                          [socio.id]: Number(e.target.value) || 1 
                                                        };
                                                        setEditingData(d => ({ ...d, attendeesCount: newAttendees }));
                                                      }}
                                                      style={{
                                                        width: 60,
                                                        padding: '4px 8px',
                                                        fontSize: 13,
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: 4
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </>
                                    )}

                                    <div style={{ marginBottom: 16 }}>
                                      <div style={{ marginBottom: 12 }}>
                                        <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 8 }}>
                                          Añadir productos
                                        </label>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                          <select
                                            value={selectedCategory}
                                            onChange={(e) => {
                                              setSelectedCategory(e.target.value);
                                              setSelectedProduct('');
                                            }}
                                            style={{
                                              minWidth: 200,
                                              padding: '8px 12px',
                                              fontSize: 14,
                                              border: '1px solid #d1d5db',
                                              borderRadius: 6,
                                              backgroundColor: '#fff',
                                              cursor: 'pointer'
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
                                            value={selectedProduct}
                                            onChange={(e) => setSelectedProduct(e.target.value)}
                                            disabled={!selectedCategory}
                                            style={{
                                              minWidth: 300,
                                              flex: 1,
                                              padding: '8px 12px',
                                              fontSize: 14,
                                              border: '1px solid #d1d5db',
                                              borderRadius: 6,
                                              backgroundColor: !selectedCategory ? '#f3f4f6' : '#fff',
                                              cursor: !selectedCategory ? 'not-allowed' : 'pointer'
                                            }}
                                          >
                                            <option value="">Seleccionar producto...</option>
                                            {selectedCategory && products
                                              .filter(p => (p.category || 'Sin categoría') === selectedCategory)
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
                                              if (selectedProduct) {
                                                const prod = products.find(p => p.id === selectedProduct);
                                                if (prod) {
                                                  const newLines = [...(editingData.productLines || []), {
                                                    label: prod.label,
                                                    price: Number(prod.price || 0),
                                                    qty: 1,
                                                    productId: prod.id
                                                  }];
                                                  setEditingData({ ...editingData, productLines: newLines });
                                                  setSelectedProduct('');
                                                }
                                              }
                                            }}
                                            disabled={!selectedProduct}
                                            style={{
                                              padding: '8px 16px',
                                              fontSize: 13,
                                              fontWeight: 600,
                                              color: '#fff',
                                              backgroundColor: !selectedProduct ? '#9ca3af' : '#10b981',
                                              border: 'none',
                                              borderRadius: 6,
                                              cursor: !selectedProduct ? 'not-allowed' : 'pointer',
                                              whiteSpace: 'nowrap'
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
                                              whiteSpace: 'nowrap'
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
                                        <div key={idx} style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
                                          <input 
                                            className="small-input" 
                                            placeholder="Producto" 
                                            value={pl.label} 
                                            onChange={(e) => updateLineEditing(idx, { label: e.target.value })} 
                                            style={{ flex: 1 }}
                                          />
                                          <input 
                                            className="small-input" 
                                            type="number" 
                                            step="0.01" 
                                            placeholder="Precio"
                                            value={pl.price} 
                                            onChange={(e) => updateLineEditing(idx, { price: Number(e.target.value) || 0 })} 
                                            style={{width:100}}
                                          />
                                          <input 
                                            className="small-input" 
                                            type="number" 
                                            placeholder="Cant."
                                            value={pl.qty} 
                                            min="1" 
                                            onChange={(e) => updateLineEditing(idx, { qty: Number(e.target.value) || 1 })} 
                                            style={{width:70}}
                                          />
                                          <button 
                                            onClick={() => removeLineFromEditing(idx)}
                                            style={{
                                              padding: '8px 12px',
                                              fontSize: 13,
                                              fontWeight: 600,
                                              color: '#fff',
                                              backgroundColor: '#ef4444',
                                              border: 'none',
                                              borderRadius: 6,
                                              cursor: 'pointer'
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
                                ) : (
                                  /* Vista normal de detalles */
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                  gap: 20
                                }}>
                                  {/* Columna de productos */}
                                  <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                                      📦 Productos
                                    </h4>
                                    <div style={{ 
                                      backgroundColor: '#fff',
                                      borderRadius: 8,
                                      padding: 12,
                                      border: '1px solid #e5e7eb'
                                    }}>
                                      {lines.map((line, idx) => (
                                        <div key={idx} style={{ 
                                          padding: '8px 0',
                                          borderBottom: idx < lines.length - 1 ? '1px solid #f3f4f6' : 'none',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}>
                                          <div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                              {line.label}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                              {line.qty} × {Number(line.price || 0).toFixed(2)}€
                                            </div>
                                          </div>
                                          <div style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>
                                            {(Number(line.qty || 1) * Number(line.price || 0)).toFixed(2)}€
                                          </div>
                                        </div>
                                      ))}
                                      <div style={{ 
                                        marginTop: 12,
                                        paddingTop: 12,
                                        borderTop: '2px solid #e5e7eb',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Total:</span>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
                                          {total.toFixed(2)}€
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Columna de información adicional */}
                                  <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                                      ℹ️ Información
                                    </h4>
                                    <div style={{ 
                                      backgroundColor: '#fff',
                                      borderRadius: 8,
                                      padding: 12,
                                      border: '1px solid #e5e7eb'
                                    }}>
                                      <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Tipo de gasto</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                          {exp.category === 'sociedad' ? '🏛️ Sociedad' : '👤 Personal'}
                                        </div>
                                      </div>
                                      
                                      {exp.category === 'sociedad' && exp.attendees && (
                                        <div style={{ marginBottom: 12 }}>
                                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Asistentes</div>
                                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                            👥 {exp.attendees} persona{exp.attendees !== 1 ? 's' : ''}
                                          </div>
                                        </div>
                                      )}

                                      {exp.category === 'sociedad' && exp.totalGeneral && (
                                        <div style={{ 
                                          marginBottom: 12,
                                          padding: 12,
                                          backgroundColor: '#fef3c7',
                                          borderRadius: 6,
                                          border: '1px solid #fbbf24'
                                        }}>
                                          <div style={{ fontSize: 11, color: '#92400e', marginBottom: 8, fontWeight: 600 }}>💰 Reparto del gasto</div>
                                          <div style={{ fontSize: 12, color: '#78350f', marginBottom: 4 }}>
                                            <strong>Total general:</strong> {exp.totalGeneral.toFixed(2)}€
                                          </div>
                                          <div style={{ fontSize: 12, color: '#78350f', marginBottom: 4 }}>
                                            <strong>Total asistentes:</strong> {exp.totalAttendees} persona{exp.totalAttendees !== 1 ? 's' : ''}
                                          </div>
                                          <div style={{ fontSize: 12, color: '#78350f', marginBottom: 4 }}>
                                            <strong>Por asistente:</strong> {exp.amountPerAttendee.toFixed(2)}€
                                          </div>
                                          <div style={{ fontSize: 13, color: '#78350f', marginTop: 8, paddingTop: 8, borderTop: '1px solid #fbbf24', fontWeight: 600 }}>
                                            <strong>Tu parte ({exp.attendees} asist.):</strong> {exp.amount.toFixed(2)}€
                                          </div>
                                          
                                          {exp.participantes && exp.participantes.length > 0 && (
                                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #fbbf24' }}>
                                              <div style={{ fontSize: 11, color: '#92400e', marginBottom: 6, fontWeight: 600 }}>👥 Lista de asistentes:</div>
                                              {exp.participantes.map((participante, idx) => (
                                                <div key={idx} style={{ 
                                                  fontSize: 12, 
                                                  color: '#78350f', 
                                                  marginBottom: 3,
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center'
                                                }}>
                                                  <span>
                                                    • {participante.nombre || participante.email} 
                                                    {participante.attendees > 1 && ` (${participante.attendees} asist.)`}
                                                  </span>
                                                  <span style={{ fontWeight: 600 }}>{participante.amount.toFixed(2)}€</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {exp.category === 'sociedad' && exp.eventoTexto && (
                                        <div style={{ marginBottom: 12 }}>
                                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Evento</div>
                                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                            📅 {exp.eventoTexto}
                                          </div>
                                        </div>
                                      )}

                                      <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Fecha y hora</div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                          🕒 {expDate.toLocaleString('es-ES')}
                                        </div>
                                      </div>

                                      {profile?.isAdmin && (
                                        <div>
                                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Usuario</div>
                                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                            {exp.userEmail || '-'}
                                          </div>
                                        </div>
                                      )}

                                      {exp.item && (
                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Descripción</div>
                                          <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
                                            {exp.item}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil */}
              <div className="tpv-history-mobile">
                {filteredExpenses.map((exp, index) => {
                  const lines = exp.productLines || [];
                  const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
                  const fechaStr = expDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const horaStr = expDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                  
                  let total = 0;
                  let myPart = 0;
                  
                  if (exp.category === 'sociedad' && exp.participantes && Array.isArray(exp.participantes)) {
                    total = lines.reduce((sum, line) => {
                      const qty = Number(line.qty || 0);
                      const price = Number(line.price || 0);
                      return sum + (qty * price);
                    }, 0);
                    const userParticipante = exp.participantes.find(p => p.uid === user?.uid);
                    myPart = userParticipante ? Number(userParticipante.amount || 0) : 0;
                  } else {
                    total = lines.reduce((sum, line) => {
                      const qty = Number(line.qty || 0);
                      const price = Number(line.price || 0);
                      return sum + (qty * price);
                    }, 0);
                    myPart = total;
                  }

                  return (
                    <div key={exp.id} style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                            {fechaStr}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {horaStr}
                          </div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>
                          {profile?.isAdmin ? total.toFixed(2) : myPart.toFixed(2)}€
                        </div>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        {lines.map((pl, i) => (
                          <div key={i} style={{ fontSize: 11, color: '#374151', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600 }}>{pl.qty}×</span> {pl.label} 
                            <span style={{ color: '#6b7280' }}> ({Number(pl.price || 0).toFixed(2)}€)</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        {exp.category === 'sociedad' ? (
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

                      <div style={{ display: 'flex', gap: 6 }}>
                        {(profile?.isAdmin || exp.userId === user?.uid || exp.uid === user?.uid) && (
                          <button className="btn-small" onClick={() => startEditTicket(exp)} style={{ flex: 1, fontSize: 11 }}>
                            ✏️ Editar
                          </button>
                        )}
                        {profile?.isAdmin && (
                          <button className="btn-ghost" onClick={() => handleDeleteTicket(exp.id)} style={{ flex: 1, fontSize: 11 }}>
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Historial de Descargas */}
      {showHistorial && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            maxWidth: 900,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
                📂 Historial de Descargas
              </h2>
              <button
                onClick={() => setShowHistorial(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            {historialDescargas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                No hay descargas registradas aún
              </div>
            ) : (
              <div style={{ overflow: 'auto' }}>
                {/* Agrupar por año */}
                {(() => {
                  const porAnio = {};
                  historialDescargas.forEach(descarga => {
                    // Extraer año del nombre del archivo (resumen_MM-YYYY.csv)
                    const match = descarga.archivo.match(/(\d{4})/);
                    const anio = match ? match[1] : 'Sin año';
                    if (!porAnio[anio]) porAnio[anio] = [];
                    porAnio[anio].push(descarga);
                  });
                  
                  // Ordenar años descendente
                  const aniosOrdenados = Object.keys(porAnio).sort((a, b) => b - a);
                  
                  return aniosOrdenados.map(anio => (
                    <div key={anio} style={{ marginBottom: 32 }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: 16
                      }}>
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedYears);
                            if (newExpanded.has(anio)) {
                              newExpanded.delete(anio);
                            } else {
                              newExpanded.add(anio);
                            }
                            setExpandedYears(newExpanded);
                          }}
                          style={{ 
                            margin: 0, 
                            fontSize: 18, 
                            fontWeight: 700, 
                            color: '#374151',
                            padding: '8px 16px',
                            backgroundColor: '#f9fafb',
                            borderRadius: 8,
                            borderLeft: '4px solid #3b82f6',
                            flex: 1,
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f9fafb'}
                        >
                          <span style={{ fontSize: 14 }}>
                            {expandedYears.has(anio) ? '▼' : '▶'}
                          </span>
                          📅 Año {anio}
                        </button>
                        {profile?.isAdmin && anio !== 'Sin año' && (
                          <button
                            onClick={() => eliminarCarpetaAnio(anio)}
                            style={{
                              padding: '8px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#fff',
                              backgroundColor: '#dc2626',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              marginLeft: 12,
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                          >
                            🗑️ Eliminar año completo
                          </button>
                        )}
                      </div>
                      {expandedYears.has(anio) && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                              Fecha Descarga
                            </th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                              Archivo
                            </th>
                            <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                              Tipo
                            </th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                              TPV
                            </th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                              Sociedad
                            </th>
                            <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                              Total
                            </th>
                            <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {porAnio[anio].map((descarga) => (
                            <tr key={descarga.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                                {descarga.fecha}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: 14, color: '#111827', fontWeight: 500 }}>
                                {descarga.archivo}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 12px',
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  backgroundColor: descarga.tipo === 'Automático' ? '#dbeafe' : '#f3e8ff',
                                  color: descarga.tipo === 'Automático' ? '#1e40af' : '#6b21a8'
                                }}>
                                  {descarga.tipo}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: 14, color: '#8b5cf6', textAlign: 'right', fontWeight: 500 }}>
                                {descarga.gastoTPV != null ? descarga.gastoTPV.toFixed(2) : '0.00'}€
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: 14, color: '#f59e0b', textAlign: 'right', fontWeight: 500 }}>
                                {descarga.gastoSociedad != null ? descarga.gastoSociedad.toFixed(2) : '0.00'}€
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: 15, color: '#059669', textAlign: 'right', fontWeight: 700 }}>
                                {descarga.total != null ? descarga.total.toFixed(2) : '0.00'}€
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                  {descarga.url ? (
                                    <a
                                      href={descarga.url}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#fff',
                                        backgroundColor: '#10b981',
                                        border: 'none',
                                        borderRadius: 6,
                                        textDecoration: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      📥
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#9ca3af' }}>-</span>
                                  )}
                                  {profile?.isAdmin && (
                                    <button
                                      onClick={() => eliminarArchivo(descarga)}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#fff',
                                        backgroundColor: '#ef4444',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}

            <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f0f9ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 8, fontWeight: 600 }}>
                ℹ️ Información
              </div>
              <div style={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
                • Los archivos se generan automáticamente el día 1 de cada mes<br/>
                • Los archivos se guardan en formato <strong>Excel (.xlsx)</strong> en Firebase Storage organizados por año (ej: /2025/resumen_01-2025.xlsx)<br/>
                • Puedes descargar cualquier archivo desde esta ventana haciendo clic en "Descargar"<br/>
                • El historial guarda TODOS los registros sin límite de tiempo
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de tipo de exportación */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 32,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ margin: 0, marginBottom: 16, fontSize: 24, fontWeight: 700, color: '#111827', textAlign: 'center' }}>
              📊 Exportar a Excel
            </h3>
            <p style={{ margin: 0, marginBottom: 32, fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
              Selecciona el formato de exportación que deseas:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Exportación Detallada */}
              <div style={{ 
                border: '2px solid #e5e7eb', 
                borderRadius: 12, 
                padding: 16,
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      📋 Exportación DETALLADA
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Todas las líneas con productos y totales por usuario
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(
                        profile?.isAdmin 
                          ? '📋 EXPORTACIÓN DETALLADA (ADMIN)\n\n✅ Incluye TODOS los tickets de TODOS los socios\n✅ Cada fila muestra: Usuario, Fecha, Tipo de gasto, Producto, Cantidad, Precio, Total\n✅ Ordenado por usuario y fecha\n✅ Ideal para análisis detallado completo de la sociedad'
                          : '📋 EXPORTACIÓN DETALLADA (USUARIO)\n\n✅ Incluye SOLO TUS tickets\n✅ Gastos personales + tus participaciones en gastos de sociedad\n✅ Cada fila muestra: Fecha, Tipo de gasto, Producto, Cantidad, Precio, Total\n✅ Ordenado por fecha\n✅ Ideal para tu análisis personal detallado'
                      );
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#3b82f6',
                      backgroundColor: '#dbeafe',
                      border: '1px solid #93c5fd',
                      borderRadius: 8,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title="Ver información sobre este tipo de exportación"
                  >
                    ℹ️ Info
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    exportarDetalle();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#3b82f6';
                  }}
                >
                  Exportar Detallada
                </button>
              </div>

              {/* Exportación Simple */}
              <div style={{ 
                border: '2px solid #e5e7eb', 
                borderRadius: 12, 
                padding: 16,
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      📊 Exportación SIMPLE
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Solo una línea por socio con su total
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(
                        profile?.isAdmin 
                          ? '📊 EXPORTACIÓN SIMPLE (ADMIN)\n\n✅ Incluye TODOS los socios\n✅ Una fila por socio con su total\n✅ Columnas: Usuario, Gastos Personales, Gastos Sociedad, Total\n✅ Ideal para resumen rápido de cobros/pagos'
                          : '📊 EXPORTACIÓN SIMPLE (USUARIO)\n\n✅ Incluye SOLO TU información\n✅ Una fila con tus totales\n✅ Columnas: Tu nombre, Gastos Personales, Gastos Sociedad, Total\n✅ Ideal para resumen rápido de tus gastos'
                      );
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#10b981',
                      backgroundColor: '#d1fae5',
                      border: '1px solid #6ee7b7',
                      borderRadius: 8,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title="Ver información sobre este tipo de exportación"
                  >
                    ℹ️ Info
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    exportarSimple();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#10b981';
                  }}
                >
                  Exportar Simple
                </button>
              </div>

              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  border: '2px solid #d1d5db',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginTop: 8
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#9ca3af';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.color = '#6b7280';
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
