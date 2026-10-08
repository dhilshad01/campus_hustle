import { useEffect, useState, createContext, useContext } from 'react'
import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom'
import { api } from './api.js'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Listing from './pages/Listing.jsx'
import Sell from './pages/Sell.jsx'
import Requests from './pages/Requests.jsx'
import Parcels from './pages/Parcels.jsx'
import Profile from './pages/Profile.jsx'

const Ctx = createContext(null); export const useApp = () => useContext(Ctx)

export default function App() {
  const [user, setUser] = useState(undefined), [toast, setToast] = useState('')
  useEffect(() => { api('/auth/me').then(setUser, () => setUser(null)) }, [])
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2400) }
  if (user === undefined) return <main><div className="sk" /><div className="sk" /></main>
  if (!user) return <Ctx.Provider value={{ user, setUser, say }}><Login />{toast && <div className="toast">{toast}</div>}</Ctx.Provider>
  const tabs = [['/', '🏠', 'Home'], ['/sell', '➕', 'Sell'], ['/requests', '🎯', 'Requests'], ['/parcels', '📦', 'Parcels'], ['/me', '👤', 'Profile']]
  return (<Ctx.Provider value={{ user, setUser, say }}>
    <div className="top"><Link to="/" className="logo" style={{ textDecoration: 'none' }}>Campus<b>Hustle</b></Link><span className="sp" /><Link to="/me" className="chip" aria-label="Notifications">🔔</Link></div>
    <nav className="bot">{tabs.map(([to, i, l]) => <NavLink key={to} to={to} end={to === '/'}><span>{i}</span>{l}</NavLink>)}</nav>
    <main><Routes>
      <Route path="/" element={<Home />} /><Route path="/listing/:id" element={<Listing />} /><Route path="/sell" element={<Sell />} />
      <Route path="/requests" element={<Requests />} /><Route path="/parcels" element={<Parcels />} /><Route path="/me" element={<Profile />} /><Route path="*" element={<Navigate to="/" />} />
    </Routes></main>{toast && <div className="toast">{toast}</div>}</Ctx.Provider>)
}
