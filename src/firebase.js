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

// --- CONFIG: reemplaza por tu firebaseConfig real si hace falta ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAiinYBnD20OAIs9S_7wetabfQz477Duh4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "sociedad-tpv.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "sociedad-tpv",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "sociedad-tpv.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "180644630865",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:180644630865:web:a0a2d69c67c5b482c9c370"
};
console.log("FIREBASE CONFIG:", { apiKey: firebaseConfig.apiKey, authDomain: firebaseConfig.authDomain, projectId: firebaseConfig.projectId });

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

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

// ---- Photo Management ----
export async function uploadUserPhoto(uid, file) {
  if (!uid || !file) throw new Error("UID y archivo requeridos");
  
  try {
    console.log("Iniciando conversión de foto a base64...", { uid, fileName: file.name, fileSize: file.size });
    
    // Convertir imagen a base64
    const photoBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    console.log("Imagen convertida, guardando en Firestore...");
    
    // Guardar directamente en Firestore como base64
    await updateUserProfile(uid, { photoURL: photoBase64 });
    console.log("Foto guardada exitosamente en Firestore");
    
    return photoBase64;
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
    if (!isAdmin && uid) constraints.push(where("uid", "==", uid));
    if (startDate) constraints.push(where("date", ">=", startDate));
    if (endDate) constraints.push(where("date", "<=", endDate));
    const q = constraints.length ? query(expensesCol, ...constraints, orderBy("date", "desc")) : query(expensesCol, orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("queryExpenses error:", err);
    const snapAll = await getDocs(collection(db, "expenses"));
    let items = snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!isAdmin && uid) items = items.filter(i => i.uid === uid);
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

export async function addSale({ uid, userEmail, item, category, amount, date = null, productId = null } = {}) {
  if (!uid) throw new Error("UID requerido para addSale");
  const payload = {
    uid,
    userEmail: userEmail || "",
    item: item || "",
    category: category || "",
    amount: Number(amount) || 0,
    productId: productId || null,
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