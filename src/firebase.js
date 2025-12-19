// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// --- CONFIG: reemplaza por tu firebaseConfig real si hace falta ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAiinYBnD20OAIs9S_7wetabfQz477Duh4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "sociedad-tpv.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "sociedad-tpv",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "sociedad-tpv.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "180644630865",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:180644630865:web:a0a2d69c67c5b482c9c370"
};
console.log("FIREBASE CONFIG:", { apiKey: firebaseConfig.apiKey, authDomain: firebaseConfig.authDomain, projectId: firebaseConfig.projectId });

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// ---- Auth helpers ----
export async function registerWithEmail(profileData, password, photoFile = null) {
  const { email, name } = profileData;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try { await updateProfile(cred.user, { displayName: name }); } catch (e) { console.warn(e); }
  }
  
  // Si hay foto, subirla primero
  let photoURL = "";
  if (photoFile) {
    try {
      photoURL = await uploadUserPhoto(cred.user.uid, photoFile);
    } catch (e) {
      console.warn("Error subiendo foto durante registro:", e);
    }
  }
  
  const userRef = doc(db, "users", cred.user.uid);
  await setDoc(userRef, { 
    email, 
    ...profileData, 
    photoURL,
    createdAt: serverTimestamp() 
  });
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function fetchUserDoc(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---- Users Management ----
export async function queryAllUsers() {
  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, orderBy("email", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("queryAllUsers error:", err);
    const snapAll = await getDocs(collection(db, "users"));
    let items = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a,b) => String(a.email || "").localeCompare(String(b.email || "")));
    return items;
  }
}

export async function updateUserProfile(uid, data) {
  if (!uid) throw new Error("UID requerido");
  const ref = doc(db, "users", uid);
  const allowed = {};
  if (data.name !== undefined) allowed.name = data.name;
  if (data.surname !== undefined) allowed.surname = data.surname;
  if (data.lastName !== undefined) allowed.lastName = data.lastName;
  if (data.dob !== undefined) allowed.dob = data.dob;
  if (data.birthDate !== undefined) allowed.birthDate = data.birthDate;
  if (data.phone !== undefined) allowed.phone = data.phone;
  if (data.photoURL !== undefined) allowed.photoURL = data.photoURL;
  if (data.isAdmin !== undefined) allowed.isAdmin = !!data.isAdmin;
  allowed.updatedAt = serverTimestamp();
  await updateDoc(ref, allowed);
  return true;
}

export async function resetUserPassword(email) {
  if (!email) throw new Error("Email requerido");
  await sendPasswordResetEmail(auth, email);
  return true;
}

export async function deleteUser(uid) {
  if (!uid) throw new Error("UID requerido");
  try {
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);
    return { success: true };
  } catch (err) {
    console.error("Error eliminando usuario:", err);
    throw err;
  }
}

// ---- Photo Management ----
export async function uploadUserPhoto(uid, file) {
  if (!uid || !file) throw new Error("UID y archivo requeridos");
  
  try {
    console.log("Iniciando compresión y conversión de foto...", { uid, fileName: file.name, fileSize: file.size });
    
    // Comprimir imagen antes de convertir a base64
    const compressedImage = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calcular dimensiones manteniendo aspecto (máximo 800x800)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          // Crear canvas y redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a base64 con calidad ajustada
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          console.log("Imagen comprimida:", { 
            originalSize: file.size, 
            compressedSize: base64.length,
            dimensions: `${width}x${height}`
          });
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // Verificar tamaño final
    if (compressedImage.length > 1000000) {
      throw new Error("La imagen es demasiado grande incluso después de comprimir. Por favor, usa una imagen más pequeña.");
    }
    
    console.log("Guardando en Firestore...");
    
    // Guardar directamente en Firestore como base64
    await updateUserProfile(uid, { photoURL: compressedImage });
    console.log("Foto guardada exitosamente en Firestore");
    
    return compressedImage;
  } catch (error) {
    console.error("Error detallado en uploadUserPhoto:", error);
    throw error;
  }
}

export async function deleteUserPhoto(uid) {
  if (!uid) throw new Error("UID requerido");
  
  try {
    // Simplemente limpiar la referencia en Firestore
    await updateUserProfile(uid, { photoURL: "" });
    console.log("Foto eliminada exitosamente de Firestore");
    return true;
  } catch (err) {
    console.error("Error eliminando foto:", err);
    throw err;
  }
}

// ---- Products (existing helpers unchanged) ----
export async function queryProducts({ onlyActive = true } = {}) {
  try {
    const productsCol = collection(db, "products");
    let q;
    if (onlyActive) q = query(productsCol, where("active", "==", true), orderBy("label", "asc"));
    else q = query(productsCol, orderBy("label", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("queryProducts error:", err);
    const snapAll = await getDocs(collection(db, "products"));
    let items = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
    if (onlyActive) items = items.filter(i => i.active);
    items.sort((a,b) => String(a.label || "").localeCompare(String(b.label || "")));
    return items;
  }
}

export function subscribeProducts(callback, onlyActive = true) {
  const productsCol = collection(db, "products");
  let q;
  if (onlyActive) q = query(productsCol, where("active", "==", true), orderBy("label", "asc"));
  else q = query(productsCol, orderBy("label", "asc"));

  const unsubscribe = onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  }, async (err) => {
    console.error("subscribeProducts error:", err);
    try {
      const snapAll = await getDocs(collection(db, "products"));
      let items = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
      if (onlyActive) items = items.filter(i => i.active);
      items.sort((a,b) => String(a.label || "").localeCompare(String(b.label || "")));
      callback(items);
    } catch (e2) {
      console.error("subscribeProducts fallback error:", e2);
      callback([]);
    }
  });

  return unsubscribe;
}

export async function addProduct(data) {
  const ref = await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
  return { id: ref.id, ...data };
}

export async function updateProduct(productId, data) {
  const ref = doc(db, "products", productId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  return true;
}

export async function deleteProduct(productId) {
  const ref = doc(db, "products", productId);
  await deleteDoc(ref);
  return true;
}

// ---- Expenses / Sales ----
export async function queryExpenses({ uid, isAdmin = false, startDate = null, endDate = null } = {}) {
  try {
    const expensesCol = collection(db, "expenses");
    const constraints = [];
    // Siempre traer todos si no es admin, luego filtraremos localmente para incluir participantes
    if (startDate) constraints.push(where("date", ">=", startDate));
    if (endDate) constraints.push(where("date", "<=", endDate));
    const q = constraints.length ? query(expensesCol, ...constraints, orderBy("date", "desc")) : query(expensesCol, orderBy("date", "desc"));
    const snap = await getDocs(q);
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Si no es admin, filtrar tickets propios o donde el usuario esté en participantes
    if (!isAdmin && uid) {
      items = items.filter(exp => {
        // Ticket propio (uid directo)
        if (exp.uid === uid) return true;
        // Ticket de sociedad donde el usuario está en participantes
        if (exp.participantes && Array.isArray(exp.participantes)) {
          return exp.participantes.some(p => p.uid === uid);
        }
        return false;
      });
    }
    
    return items;
  } catch (err) {
    console.error("queryExpenses error:", err);
    const snapAll = await getDocs(collection(db, "expenses"));
    let items = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Mismo filtro en el catch
    if (!isAdmin && uid) {
      items = items.filter(exp => {
        if (exp.uid === uid) return true;
        if (exp.participantes && Array.isArray(exp.participantes)) {
          return exp.participantes.some(p => p.uid === uid);
        }
        return false;
      });
    }
    
    if (startDate) items = items.filter(i => {
      const di = i.date && i.date.toDate ? i.date.toDate() : new Date(i.date || 0);
      return di >= startDate;
    });
    if (endDate) items = items.filter(i => {
      const di = i.date && i.date.toDate ? i.date.toDate() : new Date(i.date || 0);
      return di <= endDate;
    });
    items.sort((a,b) => {
      const da = a.date && a.date.toDate ? a.date.toDate() : new Date(a.date || 0);
      const db_ = b.date && b.date.toDate ? b.date.toDate() : new Date(b.date || 0);
      return db_ - da;
    });
    return items;
  }
}

// Obtener todos los usuarios/socios (no admins y no admin@admin)
export async function getAllSocios() {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    console.log('📊 Total users en DB:', snapshot.docs.length);
    const allUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('👥 Todos los users:', allUsers);
    const socios = allUsers.filter(user => !user.isAdmin && user.email !== "admin@admin");
    console.log('✅ Socios filtrados (no admins):', socios);
    return socios;
  } catch (err) {
    console.error("Error getting socios:", err);
    throw err;
  }
}

export async function addSale({ uid, userEmail, item, category, amount, date = null, productId = null, productLines = null, attendees = null, eventoTexto = null, totalGeneral = null, amountPerAttendee = null, totalAttendees = null, participantes = null } = {}) {
  if (!uid) throw new Error("UID requerido para addSale");
  const payload = {
    uid,
    userId: uid, // Añadir userId para compatibilidad con filtros
    userEmail: userEmail || "",
    item: item || "",
    category: category || "",
    amount: Number(amount) || 0,
    productId: productId || null,
    productLines: productLines || null,
    attendees: attendees || null,
    eventoTexto: eventoTexto || null,
    totalGeneral: totalGeneral || null,
    amountPerAttendee: amountPerAttendee || null,
    totalAttendees: totalAttendees || null,
    participantes: participantes || null, // Array de {uid, email, nombre, attendees, amount}
    date: date ? date : serverTimestamp(),
    createdAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, "expenses"), payload);
  return { id: ref.id, ...payload };
}

// NEW: updateExpense - actualizar un documento expense (solo campos permitidos)
export async function updateExpense(expenseId, data) {
  const ref = doc(db, "expenses", expenseId);
  // sanitize: sólo permitimos ciertos campos desde cliente
  const allowed = {};
  if (data.item !== undefined) allowed.item = data.item;
  if (data.amount !== undefined) allowed.amount = Number(data.amount);
  if (data.category !== undefined) allowed.category = data.category;
  if (data.date !== undefined) allowed.date = data.date; // Date or Timestamp expected
  if (data.productLines !== undefined) allowed.productLines = data.productLines; // si guardas detalle por líneas
  if (data.attendees !== undefined) allowed.attendees = data.attendees;
  if (data.eventoTexto !== undefined) allowed.eventoTexto = data.eventoTexto;
  if (data.totalGeneral !== undefined) allowed.totalGeneral = data.totalGeneral;
  if (data.amountPerAttendee !== undefined) allowed.amountPerAttendee = data.amountPerAttendee;
  if (data.totalAttendees !== undefined) allowed.totalAttendees = data.totalAttendees;
  if (data.participantes !== undefined) allowed.participantes = data.participantes;
  allowed.updatedAt = serverTimestamp();
  await updateDoc(ref, allowed);
  return true;
}

// NEW: deleteExpense - borrar un expense por id
export async function deleteExpense(expenseId) {
  const ref = doc(db, "expenses", expenseId);
  await deleteDoc(ref);
  return true;
}

// ---- Favorite Products Management ----

// Obtener productos favoritos de un usuario
export async function getUserFavorites(uid) {
  if (!uid) return [];
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.favoriteProducts || [];
    }
    return [];
  } catch (err) {
    console.error("getUserFavorites error:", err);
    return [];
  }
}

// Añadir producto a favoritos
export async function addFavoriteProduct(uid, productId) {
  if (!uid || !productId) throw new Error("UID y productId requeridos");
  
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentFavorites = userData.favoriteProducts || [];
      
      // Evitar duplicados
      if (!currentFavorites.includes(productId)) {
        const updatedFavorites = [...currentFavorites, productId];
        await updateDoc(userRef, {
          favoriteProducts: updatedFavorites,
          updatedAt: serverTimestamp()
        });
        return updatedFavorites;
      }
      return currentFavorites;
    } else {
      // Si el usuario no existe, crear el documento con los favoritos
      await setDoc(userRef, {
        favoriteProducts: [productId],
        createdAt: serverTimestamp()
      });
      return [productId];
    }
  } catch (err) {
    console.error("addFavoriteProduct error:", err);
    throw err;
  }
}

// Quitar producto de favoritos
export async function removeFavoriteProduct(uid, productId) {
  if (!uid || !productId) throw new Error("UID y productId requeridos");
  
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentFavorites = userData.favoriteProducts || [];
      
      const updatedFavorites = currentFavorites.filter(id => id !== productId);
      await updateDoc(userRef, {
        favoriteProducts: updatedFavorites,
        updatedAt: serverTimestamp()
      });
      return updatedFavorites;
    }
    return [];
  } catch (err) {
    console.error("removeFavoriteProduct error:", err);
    throw err;
  }
}

// Verificar si un producto es favorito
export async function isProductFavorite(uid, productId) {
  if (!uid || !productId) return false;
  
  try {
    const favorites = await getUserFavorites(uid);
    return favorites.includes(productId);
  } catch (err) {
    console.error("isProductFavorite error:", err);
    return false;
  }
}

// Toggle favorito (añadir si no existe, quitar si existe)
export async function toggleFavoriteProduct(uid, productId) {
  if (!uid || !productId) throw new Error("UID y productId requeridos");
  
  try {
    const favorites = await getUserFavorites(uid);
    
    if (favorites.includes(productId)) {
      return await removeFavoriteProduct(uid, productId);
    } else {
      return await addFavoriteProduct(uid, productId);
    }
  } catch (err) {
    console.error("toggleFavoriteProduct error:", err);
    throw err;
  }
}

// ============================================
// GESTIÓN DE INSCRIPCIONES A EVENTOS
// ============================================

// Añadir inscripción a evento
export async function addEventRegistration(data) {
  try {
    const docRef = await addDoc(collection(db, "eventRegistrations"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...data };
  } catch (err) {
    console.error("addEventRegistration error:", err);
    throw err;
  }
}

// Obtener inscripciones de un usuario
export async function getUserEventRegistrations(uid) {
  if (!uid) return [];
  
  try {
    const q = query(
      collection(db, "eventRegistrations"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("getUserEventRegistrations error:", err);
    throw err;
  }
}

// Obtener todas las inscripciones (para admin)
export async function getAllEventRegistrations() {
  try {
    const q = query(
      collection(db, "eventRegistrations"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("getAllEventRegistrations error:", err);
    throw err;
  }
}

// Actualizar inscripción a evento
export async function updateEventRegistration(id, data) {
  if (!id) throw new Error("ID de inscripción requerido");
  
  try {
    const docRef = doc(db, "eventRegistrations", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { id, ...data };
  } catch (err) {
    console.error("updateEventRegistration error:", err);
    throw err;
  }
}

// Eliminar inscripción a evento
export async function deleteEventRegistration(id) {
  if (!id) throw new Error("ID de inscripción requerido");
  
  try {
    await deleteDoc(doc(db, "eventRegistrations", id));
  } catch (err) {
    console.error("deleteEventRegistration error:", err);
    throw err;
  }
}

// Eliminar todas las inscripciones de un tipo de evento específico
export async function deleteAllEventRegistrationsByType(eventType) {
  if (!eventType) throw new Error("Tipo de evento requerido");
  
  try {
    const q = query(
      collection(db, "eventRegistrations"),
      where("eventType", "==", eventType)
    );
    const snapshot = await getDocs(q);
    
    // Eliminar todos los documentos encontrados
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return snapshot.docs.length; // Retorna cantidad de registros eliminados
  } catch (err) {
    console.error("deleteAllEventRegistrationsByType error:", err);
    throw err;
  }
}

// Guardar configuración de evento (ej: fecha de próxima cena)
export async function setEventConfig(eventType, config) {
  if (!eventType) throw new Error("Tipo de evento requerido");
  
  try {
    const docRef = doc(db, "eventConfigs", eventType);
    await setDoc(docRef, {
      ...config,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return config;
  } catch (err) {
    console.error("setEventConfig error:", err);
    throw err;
  }
}

// Obtener configuración de evento
export async function getEventConfig(eventType) {
  if (!eventType) throw new Error("Tipo de evento requerido");
  
  try {
    const docRef = doc(db, "eventConfigs", eventType);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (err) {
    console.error("getEventConfig error:", err);
    return null;
  }
}

// Enviar notificación de nueva fecha de cena
export async function notificarFechaCena(eventType, fechaCena) {
  try {
    const notificarFn = httpsCallable(functions, 'notificarFechaCena');
    const result = await notificarFn({ eventType, fechaCena });
    return result.data;
  } catch (err) {
    console.error("notificarFechaCena error:", err);
    throw err;
  }
}