import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGet, inr, CATEGORIES, SUBS, EMO } from '../api.js'

export function Card({ l }) {
  const s = l.seller || {}
  return (<Link to={'/listing/' + l._id} className="card">
    <div className="ph">{l.images?.[0] ? <img src={l.images[0]} alt={l.title} /> : l.emoji || EMO[l.category] || '🛍'}</div>
    <div className="cb"><div className="pr">{inr(l.price)}{l.originalPrice ? <s>{inr(l.originalPrice)}</s> : null}</div><div>{l.title}</div>
      <div>{l.negotiable && <span className="bd">Negotiable</span>}{l.originalPrice && l.price <= l.originalPrice * 0.55 && <span className="bd n">💰 Great deal</span>}{l.status === 'reserved' && <span className="bd r">Reserved</span>}</div>
      <div className="meta"><b>{s.name}</b> {s.account === 'business' ? '· 🏪 Business' : [s.department, s.year && 'Yr ' + s.year].filter(Boolean).map((x) => '· ' + x).join(' ')}{s.verified ? ' · ✔ Verified' : ' · demo account'}</div>
      <div className="meta">{l.pickup}</div></div></Link>)
}
export const Empty = ({ title = 'Nothing here yet.', text, to, cta }) => (<div className="empty"><h3 style={{ color: 'var(--ink)' }}>{title}</h3>{text && <p>{text}</p>}{to && <Link className="btn" to={to}>{cta}</Link>}</div>)

export default function Home() {
  const [q, setQ] = useState(''), [applied, setApplied] = useState(''), [cat, setCat] = useState(''), [sub, setSub] = useState('')
  const [f, setF] = useState({ condition: '', max: '', neg: false, seller: '', sort: '' }), [open, setOpen] = useState(false)
  const qs = new URLSearchParams(Object.entries({ q: applied, category: cat, sub, ...f }).filter(([, v]) => v)).toString()
  const L = useGet('/listings?' + qs), fire = useGet('/fire'), reqs = useGet('/requests')
  const browsing = applied || cat || sub
  return (<>
    <h1 style={{ fontSize: 30, lineHeight: 1.1 }}>Everything your campus needs. All in one place.</h1>
    <form className="row" onSubmit={(e) => { e.preventDefault(); setApplied(q.trim()) }}><input style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="What are you looking for? e.g. cycle under 3000" list="sg" />
      <datalist id="sg">{['calculator', 'lab coat', 'biryani', 'ECE books'].map((x) => <option key={x} value={x} />)}</datalist><button className="btn">Search</button>
      <button type="button" className="btn g" onClick={() => setOpen(!open)}>⚙ Filters</button></form>
    {open && <div className="panel row">
      <select style={{ width: 'auto' }} value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })}><option value="">Any condition</option>{['New', 'Like new', 'Good', 'Fair', 'For parts'].map((c) => <option key={c}>{c}</option>)}</select>
      <input style={{ width: 120 }} type="number" placeholder="Max ₹" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
      <select style={{ width: 'auto' }} value={f.seller} onChange={(e) => setF({ ...f, seller: e.target.value })}><option value="">Anyone</option><option value="student">Students</option><option value="business">Businesses</option></select>
      <select style={{ width: 'auto' }} value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}><option value="">Newest</option><option value="low">Lowest price</option><option value="high">Highest price</option></select>
      <label style={{ margin: 0 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.neg} onChange={(e) => setF({ ...f, neg: e.target.checked })} /> Negotiable only</label></div>}
    <div className="chips"><button className={'chip ' + (!cat ? 'on' : '')} onClick={() => { setCat(''); setSub('') }}>All</button>
      {[...CATEGORIES.slice(0, 7), 'Beauty & Personal Care'].map((c) => <button key={c} className={'chip ' + (cat === c ? 'on' : '')} onClick={() => { setCat(c); setSub('') }}>{EMO[c] || ''} {c}</button>)}</div>
    {SUBS[cat] && <div className="chips">{SUBS[cat].map((s) => <button key={s} className={'chip ' + (sub === s ? 'on' : '')} onClick={() => setSub(sub === s ? '' : s)}>{s}</button>)}</div>}
    {!browsing && <>
      <h2>🔥 Campus Fire</h2><p className="meta">What students are looking for right now, from real requests, searches, saves, offers and views.</p>
      {fire.data?.length ? <div className="fire">{fire.data.map((d) => <button key={d.tag} className="fc" onClick={() => { setQ(d.tag); setApplied(d.tag) }}><b style={{ fontSize: 17 }}>🔥 {d.tag}</b><small style={{ display: 'block' }}>{d.level}{d.requests ? ` · ${d.requests} request${d.requests > 1 ? 's' : ''}` : ''}</small></button>)}</div>
        : <p className="meta">Nothing is heating up yet. Post a request to start it.</p>}
      <h2>🎯 Students are looking for</h2>
      {reqs.data?.slice(0, 3).map((r) => <div key={r._id} className="panel row" style={{ justifyContent: 'space-between' }}><div><b>{r.item}</b> <span className="bd">Up to {inr(r.budget)}</span><div className="meta">{r.requester?.name} · {r.pickup || 'campus'}</div></div>
        <Link className="btn sm f" to={'/sell?item=' + encodeURIComponent(r.item)}>I have this</Link></div>)}
      {reqs.data && !reqs.data.length && <Empty title="No requests yet." text="Ask for what you need." to="/requests" cta="Post a request" />}</>}
    <h2>{browsing ? 'Results' : 'Just added'}</h2>
    {L.loading && <><div className="sk" /><div className="sk" /></>}{L.error && <p className="err">{L.error} <button className="btn sm g" onClick={L.reload}>Try again</button></p>}
    {L.data && (L.data.length ? <div className="grid">{L.data.map((l) => <Card key={l._id} l={l} />)}</div> : <Empty text="Tell the campus what you need and sellers will see it." to="/requests" cta="Post a request" />)}</>)
}
