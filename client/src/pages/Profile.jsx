import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, useGet, inr } from '../api.js'
import { useApp } from '../App.jsx'
import { Card, Empty } from './Home.jsx'

export default function Profile() {
  const { user, setUser, say } = useApp(), [sp] = useSearchParams(), [tab, setTab] = useState(sp.get('tab') || 'saved')
  const saved = useGet('/listings/saved'), mine = useGet('/listings/mine'), offers = useGet('/offers/mine'), orders = useGet('/offers/food/mine'), notes = useGet('/notifications')
  const biz = user.account === 'business', sum = (k) => mine.data?.reduce((a, l) => a + (l[k] || 0), 0) || 0
  const advance = (id, status) => async () => { try { await api(`/offers/food/${id}/status`, { method: 'POST', body: { status } }); orders.reload() } catch (x) { say(x.message) } }
  const NEXT = { placed: 'preparing', preparing: 'ready' }
  return (<>
    <div className="panel"><b style={{ fontSize: 18 }}>{user.name}</b><div className="meta">{biz ? '🏪 Business account (demo)' : `🎓 ${[user.department, user.year && 'Yr ' + user.year].filter(Boolean).join(' · ')} · demo account`} · Campus: {user.campus}</div>
      <p><button className="btn g sm" onClick={async () => { await api('/auth/logout', { method: 'POST' }); setUser(null) }}>Log out</button></p></div>
    {biz && <div className="panel"><b>🏪 Storefront overview</b><div className="row" style={{ marginTop: 8 }}>{[['Products', mine.data?.length || 0], ['Active', mine.data?.filter((l) => l.status === 'available').length || 0], ['Views', sum('views')]].map(([k, v]) => <div key={k} style={{ flex: 1 }}><div className="pr">{v}</div><div className="meta">{k}</div></div>)}</div></div>}
    <div className="chips">{[['saved', '❤️ Wishlist'], ['mine', 'My listings'], ['offers', 'Offers'], ['orders', '🧾 Orders'], ['notes', 'Notifications']].map(([k, l]) => <button key={k} className={'chip ' + (tab === k ? 'on' : '')} onClick={() => { setTab(k); if (k === 'notes') api('/notifications/read', { method: 'POST' }) }}>{l}</button>)}</div>
    {tab === 'saved' && (saved.data?.length ? <div className="grid">{saved.data.map((l) => <Card key={l._id} l={l} />)}</div> : <Empty title="Save something you might want later." to="/" cta="Explore" />)}
    {tab === 'mine' && (mine.data?.length ? mine.data.map((l) => <Link key={l._id} to={'/listing/' + l._id} className="panel row" style={{ justifyContent: 'space-between', textDecoration: 'none' }}><span>{l.emoji} {l.title} · {inr(l.price)}</span><span><span className={'bd ' + (l.status === 'available' ? 'n' : 'r')}>{l.status}</span>{l.status === 'available' && new Date(l.expiresAt) - Date.now() < 864e5 && <span className="bd r">Expiring soon</span>}</span></Link>) : <Empty title="Be the first to sell this." to="/sell" cta="Sell something" />)}
    {tab === 'offers' && (offers.data?.length ? offers.data.map((o) => <Link key={o._id} to={'/listing/' + o.listing?._id} className="panel" style={{ display: 'block', textDecoration: 'none' }}><b>{o.listing?.title}</b> · {inr(o.amount)} <span className="bd r">{o.status}</span><div className="meta">{o.buyer._id === user.id ? 'You offered' : o.buyer.name + ' offered'}</div></Link>) : <Empty title="No offers yet." text="Offers you send or receive show up here." />)}
    {tab === 'orders' && (orders.data?.length ? orders.data.map((o) => <div key={o._id} className="panel"><b>{o.qty}× {o.item}</b> <span className={'bd ' + (o.status === 'ready' ? 'n' : 'r')}>{o.status.replace('_', ' ')}</span><div className="meta">{o.pickup} · {o.slot} · {inr(o.total)}</div>
      {o.seller === user.id && NEXT[o.status] && <button className="btn sm" onClick={advance(o._id, NEXT[o.status])}>Mark {NEXT[o.status]}</button>}{o.buyer === user.id && o.status === 'ready' && <button className="btn ok sm" onClick={advance(o._id, 'picked_up')}>I picked it up</button>}</div>) : <Empty title="No orders yet." text="Order food for pickup and track it here." to="/" cta="Browse food" />)}
    {tab === 'notes' && (notes.data?.length ? notes.data.map((n) => <div key={n._id} className="panel" style={{ opacity: n.read ? 0.7 : 1 }}>{n.body.replace(/ \[[a-f0-9]{24}\]$/, '')}<div className="meta">{new Date(n.createdAt).toLocaleString()}</div></div>) : <Empty title="Quiet for now." text="Offers, matches and expiry reminders show up here." />)}</>)
}
