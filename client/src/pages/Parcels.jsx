import { useState } from 'react'
import { api, useGet, PICKUP } from '../api.js'
import { useApp } from '../App.jsx'
import { Empty } from './Home.jsx'

const LABEL = { open: 'Open', claimed: 'Claimed', collected: 'Collected', waiting: 'Waiting for owner', handed_over: 'Handed over' }
export default function Parcels() {
  const P = useGet('/parcels'), { user, say } = useApp(), [kind, setKind] = useState(''), [filter, setFilter] = useState('all'), [err, setErr] = useState('')
  const [f, setF] = useState({ firstName: '', courier: 'Amazon', window: 'Today 3-6pm', spot: PICKUP[5], tip: 0, note: '' }), set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function post(e) { e.preventDefault(); setErr(''); try { await api('/parcels', { method: 'POST', body: { ...f, kind, firstName: kind === 'need' ? user.name.split(' ')[0] : f.firstName, tip: Number(f.tip) } }); say('Posted to Parcel Help'); setKind(''); P.reload() } catch (x) { setErr(x.message) } }
  const step = (id, action) => async () => { try { await api(`/parcels/${id}/step`, { method: 'POST', body: { action } }); P.reload() } catch (x) { say(x.message) } }
  const list = P.data?.filter((p) => filter === 'all' || (filter === 'mine' ? p.poster === user.id || p.helper?._id === user.id : p.kind === filter))
  return (<><h2>📦 Parcel Help</h2><p className="meta">Missed your delivery because you were in class? Ask a hostel mate to collect it, or post a parcel you collected. One board for every parcel.</p>
    <div className="row"><button className="btn f" onClick={() => setKind('need')}>📦 Collect mine for me</button><button className="btn" onClick={() => setKind('got')}>🙋 I collected a parcel</button></div>
    {kind && <form className="panel" onSubmit={post}><h3>{kind === 'need' ? 'Need a collector' : 'I collected a parcel'}</h3>
      {kind === 'got' && <><label>Name on parcel (first name only)</label><input required maxLength={20} value={f.firstName} onChange={set('firstName')} /></>}
      <label>Courier / app</label><select value={f.courier} onChange={set('courier')}>{['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Swiggy / Zomato', 'Courier', 'Other'].map((c) => <option key={c}>{c}</option>)}</select>
      {kind === 'need' && <><label>Expected delivery</label><select value={f.window} onChange={set('window')}>{['Today morning', 'Today 12-3pm', 'Today 3-6pm', 'Tonight', 'Tomorrow'].map((c) => <option key={c}>{c}</option>)}</select>
        <label>Optional thank-you (paid in person)</label><select value={f.tip} onChange={set('tip')}>{[0, 10, 20, 50].map((t) => <option key={t} value={t}>{t ? '₹' + t : 'None'}</option>)}</select></>}
      <label>{kind === 'need' ? 'Hand over at' : 'Keeping it at'}</label><select value={f.spot} onChange={set('spot')}>{PICKUP.map((c) => <option key={c}>{c}</option>)}</select>
      <label>Note (no phone numbers or room numbers)</label><input maxLength={80} value={f.note} onChange={set('note')} />{err && <p className="err">{err}</p>}<p><button className="btn">Post</button> <button type="button" className="btn g" onClick={() => setKind('')}>Cancel</button></p></form>}
    <div className="chips">{[['all', 'All'], ['need', 'Need a collector'], ['got', 'Waiting for owner'], ['mine', 'Mine']].map(([k, l]) => <button key={k} className={'chip ' + (filter === k ? 'on' : '')} onClick={() => setFilter(k)}>{l}</button>)}</div>
    {P.loading && <div className="sk" />}{P.error && <p className="err">{P.error}</p>}
    {list?.map((p) => { const mine = p.poster === user.id; return (<div key={p._id} className="panel"><b>{p.kind === 'need' ? `${p.firstName} needs a collector` : `Collected for ${p.firstName}`}</b> <span className={'bd ' + (['collected', 'handed_over'].includes(p.status) ? 'n' : 'r')}>{LABEL[p.status]}</span>
      <div className="meta">{p.courier} parcel · {p.window || 'Collected today'} · {p.spot}{p.tip ? ` · optional thank-you ₹${p.tip}` : ''}</div>{p.note && <div className="meta">{p.note}</div>}{p.helper && <div className="meta">Collector: {p.helper.name}</div>}
      <div className="row" style={{ marginTop: 8 }}>
        {p.kind === 'need' && p.status === 'open' && !mine && <button className="btn f sm" onClick={step(p._id, 'claim')}>I'll collect it</button>}
        {p.status === 'claimed' && p.helper?._id === user.id && <button className="btn ok sm" onClick={step(p._id, 'collect')}>I have it</button>}
        {p.kind === 'need' && p.status === 'collected' && mine && <button className="btn ok sm" onClick={step(p._id, 'handover')}>Got it, thanks</button>}
        {p.kind === 'got' && p.status === 'waiting' && !mine && <button className="btn ok sm" onClick={step(p._id, 'handover')}>That's mine, handed over</button>}
        {mine && ['open', 'waiting'].includes(p.status) && <button className="btn g sm" onClick={step(p._id, 'cancel')}>Cancel</button>}</div></div>) })}
    {list && !list.length && <Empty text="Post a parcel and hostel mates will see it." />}
    <div className="panel meta">Safety: share only a first name and the courier app. Never share delivery OTPs, phone numbers or room numbers. Hand over at a public campus spot.</div></>)
}
