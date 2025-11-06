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

// ---- Auth helpers ----
export async function registerWithEmail(profileData, password) {
  const { email, name } = profileData;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try { await updateProfile(cred.user, { displayName: name }); } catch (e) { console.warn(e); }
  }
  const userRef = doc(db, "users", cred.user.uid);
  await setDoc(userRef, { email, ...profileData, createdAt: serverTimestamp() });
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

// ---- User Management Functions for Admin ----

// Obtener todos los usuarios (solo para admin)
export async function queryAllUsers() {
  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("queryAllUsers error:", err);
    // Fallback sin ordenamiento
    const snapAll = await getDocs(collection(db, "users"));
    return snapAll.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

// Actualizar datos de usuario (solo perfil en Firestore)
export async function updateUserProfile(userId, data) {
  const ref = doc(db, "users", userId);
  const allowed = {};
  
  // Solo permitimos actualizar ciertos campos
  if (data.name !== undefined) allowed.name = data.name;
  if (data.lastName !== undefined) allowed.lastName = data.lastName;
  if (data.phone !== undefined) allowed.phone = data.phone;
  if (data.birthDate !== undefined) allowed.birthDate = data.birthDate;
  if (data.isAdmin !== undefined) allowed.isAdmin = data.isAdmin;
  
  allowed.updatedAt = serverTimestamp();
  
  await updateDoc(ref, allowed);
  return true;
}

// Enviar email de restablecimiento de contraseña
export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Email de restablecimiento enviado' };
  } catch (error) {
    console.error('Error sending password reset:', error);
    let message = 'Error al enviar email de restablecimiento';
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No se encontró un usuario con este email';
        break;
      case 'auth/invalid-email':
        message = 'Email inválido';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos. Inténtalo más tarde';
        break;
      default:
        message = error.message || message;
    }
    
    return { success: false, message };
  }
}

// Obtener estadísticas de un usuario (gastos totales, etc.)
export async function getUserStats(userId) {
  try {
    const expensesCol = collection(db, "expenses");
    const q = query(expensesCol, where("uid", "==", userId));
    const snap = await getDocs(q);
    
    const expenses = snap.docs.map(d => d.data());
    const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalTransactions = expenses.length;
    
    return {
      totalAmount,
      totalTransactions,
      lastTransaction: expenses.length > 0 ? expenses.sort((a, b) => {
        const dateA = a.date?.toDate?.() || new Date(a.date || 0);
        const dateB = b.date?.toDate?.() || new Date(b.date || 0);
        return dateB - dateA;
      })[0] : null
    };
  } catch (err) {
    console.error("getUserStats error:", err);
    return { totalAmount: 0, totalTransactions: 0, lastTransaction: null };
  }
}