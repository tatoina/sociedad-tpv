// src/pages/Menu.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Menu({ user, profile }) {
  return (
    <div style={{padding:16}}>
      <h2 style={{marginBottom:8}}>Bienvenido{user?.displayName ? `, ${user.displayName}` : ""}</h2>
      <div style={{display:'grid', gap:12}}>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {!profile?.isAdmin && <Link to="/tpv"><button className="btn-primary">TPV</button></Link>}
          <Link to="/listados"><button className="btn-primary">Listados</button></Link>
          {profile?.isAdmin && <Link to="/productos"><button className="btn-primary">Productos</button></Link>}
          {profile?.isAdmin && <Link to="/usuarios"><button className="btn-primary">Usuarios</button></Link>}
        </div>
        <div style={{fontSize:13, color:'#666'}}>Selecciona una opción. En móvil los botones están optimizados para toque.</div>
      </div>
    </div>
  );
}