import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, useGet, inr, EMO } from '../api.js'
import { useApp } from '../App.jsx'
import { Card } from './Home.jsx'

function Chat({ listingId, buyerId }) {
  const [msgs, setMsgs] = useState([]), [t, setT] = useState(''), { user, say } = useApp()
  const url = `/listings/${listingId}/messages` + (buyerId ? '?buyer=' + buyerId : '')
  const load = () => api(url).then(setMsgs, () => {})
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i) }, [url])
  async function send(e) { e.preventDefault(); if (!t.trim()) return; try { await api(`/listings/${listingId}/messages`, { method: 'POST', body: { text: t, buyer: buyerId } }); setT(''); load() } catch (x) { say(x.message) } }
  return (<div className="panel"><h3>💬 Chat</h3>{msgs.length ? msgs.map((m) => <div key={m._id} className={'bub ' + (m.sender === user.id ? 'me' : '')}>{m.body}</div>) : <p className="meta">Your campus conversations will appear here.</p>}
    <form className="row" onSubmit={send}><input style={{ flex: 1 }} maxLength={1000} value={t} onChange={(e) => setT(e.target.value)} placeholder="Is this still available?" /><button className="btn">Send</button></form></div>)
}

export default function Listing() {
  const { id } = useParams(), nav = useNavigate(), { user, say } = useApp()
  const L = useGet('/listings/' + id), O = useGet('/offers/listing/' + id), T = useGet('/offers/transaction/' + id), th = useGet('/listings/' + id + '/threads')
  const [amt, setAmt] = useState(''), [qty, setQty] = useState(1), [slot, setSlot] = useState('Ready in 10 min'), [buyer, setBuyer] = useState(''), [sim, setSim] = useState([])
  const l = L.data
  useEffect(() => { if (l) { setAmt(String(Math.round(l.price * 0.9))); api('/listings?sub=' + (l.subcategory || '') + '&category=' + encodeURIComponent(l.category)).then((x) => setSim(x.filter((y) => y._id !== l._id).slice(0, 4)), () => {}) } }, [l?._id])
  if (L.loading) return <div className="sk" />
  if (L.error) return <><p className="err">{L.error}</p><Link to="/">Back to Home</Link></>
  const mine = l.seller._id === user.id, reload = () => { L.reload(); O.reload(); T.reload() }
  const run = (fn, ok) => async () => { try { await fn(); if (ok) say(ok); reload() } catch (x) { say(x.message) } }
  const food = l.category === 'Food & Homemade Items' && l.seller.account === 'business' && l.status === 'available'
  const open = O.data?.find((o) => ['pending', 'countered'].includes(o.status))
  return (<>
    <Link to="/" className="btn g sm">← Back</Link>
    <div className="panel"><div className="ph" style={{ fontSize: 90, borderRadius: 12, overflow: 'hidden' }}>{l.images?.[0] ? <img src={l.images[0]} alt={l.title} /> : l.emoji || EMO[l.category] || '🛍'}</div>
      <h1>{l.title}</h1><div className="pr" style={{ fontSize: 28 }}>{inr(l.price)}{l.originalPrice ? <s>{inr(l.originalPrice)}</s> : null}</div>
      <div><span className="bd">{l.condition}</span><span className="bd">{l.negotiable ? 'Negotiable' : 'Fixed price'}</span><span className={'bd ' + (l.status === 'available' ? 'n' : 'r')}>{l.status}</span></div>
      <p>{l.description}</p><p className="meta">Pickup: {l.pickup} (public campus spot) · Expires {new Date(l.expiresAt).toLocaleDateString()} · {l.views} views</p>
      <p className="meta">Seller: <b>{l.seller.name}</b> {l.seller.account === 'business' ? '· 🏪 Business' : [l.seller.department, l.seller.year && 'Yr ' + l.seller.year].filter(Boolean).map((x) => '· ' + x).join(' ')}{l.seller.verified ? ' · ✔ Verified' : ' · demo account'}
        · {l.sellerStats.rating ? `★ ${l.sellerStats.rating.toFixed(1)} (${l.sellerStats.ratings})` : 'No ratings yet'} · {l.sellerStats.sold} sold</p>
      {!mine && <div className="row">
        <button className="btn g" onClick={run(async () => { const r = await api(`/listings/${id}/save`, { method: 'POST' }); say(r.saved ? 'Saved to wishlist' : 'Removed') })}>♡ Save</button>
        <button className="btn g" onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(`Check this out on Campus Hustle:\n${l.title}\n${inr(l.price)}\n${l.negotiable ? 'Negotiable\n' : ''}Pickup: ${l.pickup}`), '_blank')}>Share to WhatsApp</button>
        <select style={{ width: 'auto' }} value="" onChange={(e) => e.target.value && run(() => api(`/listings/${id}/report`, { method: 'POST', body: { reason: e.target.value.split(':')[0], block: e.target.value.endsWith(':block') } }), 'Report sent')()}>
          <option value="">Report or block…</option>{['scam', 'misleading', 'spam', 'prohibited', 'already_sold', 'inappropriate', 'harassment', 'other'].map((r) => <option key={r} value={r}>Report: {r.replace('_', ' ')}</option>)}<option value="harassment:block">Report and block seller</option></select></div>}</div>

    {mine && <div className="panel"><h3>Manage your listing</h3><div className="row">
      {l.status === 'available' && <><button className="btn g sm" onClick={run(() => api('/listings/' + id, { method: 'PATCH', body: { extendDays: 7 } }), 'Kept active for 7 more days')}>Keep active</button>
        <button className="btn g sm" onClick={run(() => api('/listings/' + id, { method: 'PATCH', body: { status: 'sold' } }), 'Marked sold')}>Mark sold</button>
        <button className="btn g sm" onClick={run(() => api('/listings/' + id, { method: 'PATCH', body: { status: 'out_of_stock' } }), 'Marked out of stock')}>Out of stock</button></>}
      {['expired', 'out_of_stock'].includes(l.status) && <button className="btn sm" onClick={run(() => api('/listings/' + id, { method: 'PATCH', body: { status: 'available', extendDays: 7 } }), 'Reactivated')}>Reactivate</button>}</div></div>}

    {!mine && food && <div className="panel"><h3>🛍 Order for pickup</h3><div className="row"><input style={{ width: 90 }} type="number" min={1} max={10} value={qty} onChange={(e) => setQty(e.target.value)} />
      <select style={{ width: 'auto' }} value={slot} onChange={(e) => setSlot(e.target.value)}>{['Ready in 10 min', 'In 30 min', 'In 1 hour'].map((s) => <option key={s}>{s}</option>)}</select><b>{inr(qty * l.price)}</b>
      <button className="btn ok" onClick={run(async () => { await api('/offers/food', { method: 'POST', body: { listingId: id, qty: Number(qty), slot } }); nav('/me?tab=orders') }, 'Order placed')}>Place pickup order</button></div></div>}

    {!mine && l.negotiable && l.status === 'available' && !open && <div className="panel"><h3>Make an offer</h3><div className="row"><input style={{ width: 130 }} type="number" min={1} max={l.price} value={amt} onChange={(e) => setAmt(e.target.value)} />
      <button className="btn" onClick={run(() => api('/offers', { method: 'POST', body: { listingId: id, amount: Number(amt) } }), 'Offer sent')}>Send offer</button></div></div>}

    {O.data?.map((o) => { const iBuyer = o.buyer._id === user.id, myTurn = ['pending', 'countered'].includes(o.status) && (iBuyer ? o.lastActor === 'seller' : o.lastActor === 'buyer')
      return (<div key={o._id} className="panel"><b>{inr(o.amount)}</b> <span className={'bd ' + (o.status === 'accepted' ? 'n' : 'r')}>{o.status}</span> {!iBuyer && <span className="meta">from {o.buyer.name}</span>}
        {myTurn && <div className="row" style={{ marginTop: 8 }}><button className="btn ok sm" onClick={run(() => api(`/offers/${o._id}/respond`, { method: 'POST', body: { action: 'accept' } }), 'Accepted. Listing reserved')}>Accept</button>
          <input style={{ width: 100 }} type="number" min={1} max={l.price} value={amt} onChange={(e) => setAmt(e.target.value)} />
          <button className="btn sm" onClick={run(() => api(`/offers/${o._id}/respond`, { method: 'POST', body: { action: 'counter', amount: Number(amt) } }), 'Counter sent')}>Counter</button>
          <button className="btn g sm" onClick={run(() => api(`/offers/${o._id}/respond`, { method: 'POST', body: { action: 'reject' } }), 'Rejected')}>Reject</button></div>}
        {['pending', 'countered'].includes(o.status) && !myTurn && <p className="meta">Waiting for the other side.</p>}
        {o.status === 'accepted' && l.status === 'reserved' && <p><b>Agreed at {inr(o.amount)}.</b> Meet at {l.pickup}. <button className="btn ok sm" onClick={run(() => api(`/offers/${o._id}/complete`, { method: 'POST' }), 'Marked sold')}>Mark picked up and paid</button></p>}</div>) })}

    {T.data && !T.data.rated && <div className="panel"><h3>Rate this deal</h3><div className="row">{[1, 2, 3, 4, 5].map((n) => <button key={n} className="btn g sm" onClick={run(() => api(`/offers/transaction/${T.data._id}/rate`, { method: 'POST', body: { stars: n } }), 'Rating saved')}>{'★'.repeat(n)}</button>)}</div></div>}

    {mine ? <div className="panel"><h3>Messages from buyers</h3>{th.data?.length ? <><select value={buyer} onChange={(e) => setBuyer(e.target.value)}><option value="">Choose a buyer</option>{th.data.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select>{buyer && <Chat key={buyer} listingId={id} buyerId={buyer} />}</> : <p className="meta">Your campus conversations will appear here.</p>}</div>
      : <Chat listingId={id} />}
    {sim.length > 0 && <><h2>Similar listings</h2><div className="grid">{sim.map((x) => <Card key={x._id} l={x} />)}</div></>}</>)
}
