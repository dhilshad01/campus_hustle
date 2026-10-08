import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, useGet, inr, PICKUP } from '../api.js'
import { useApp } from '../App.jsx'
import { Empty } from './Home.jsx'

export default function Requests() {
  const R = useGet('/requests'), { user, say } = useApp(), [f, setF] = useState({ item: '', budget: '', neededBy: '', pickup: PICKUP[1], description: '' }), [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function post(e) {
    e.preventDefault(); setErr('')
    try { const r = await api('/requests', { method: 'POST', body: { ...f, budget: Number(f.budget) } }); say(r.matches ? '🎯 Match found' : 'Request posted. Campus Fire updated'); setF({ ...f, item: '', budget: '', description: '' }); R.reload() } catch (x) { setErr(x.message) }
  }
  return (<><h2>🎯 Requests</h2>
    <form className="panel" onSubmit={post}><h3>I need this</h3><label>Item</label><input required minLength={2} maxLength={80} value={f.item} onChange={set('item')} placeholder="Casio calculator" />
      <label>Budget (₹)</label><input type="number" required min={1} value={f.budget} onChange={set('budget')} /><label>Required by</label><input maxLength={30} value={f.neededBy} onChange={set('neededBy')} placeholder="Friday" />
      <label>Preferred pickup</label><select value={f.pickup} onChange={set('pickup')}>{PICKUP.map((p) => <option key={p}>{p}</option>)}</select>
      <label>Details</label><textarea rows={2} maxLength={300} value={f.description} onChange={set('description')} />{err && <p className="err">{err}</p>}<p><button className="btn">Post request</button></p></form>
    <h2>What students want</h2>{R.loading && <div className="sk" />}{R.error && <p className="err">{R.error}</p>}
    {R.data?.map((r) => <div key={r._id} className="panel row" style={{ justifyContent: 'space-between' }}><div><b>{r.item}</b> <span className="bd">Up to {inr(r.budget)}</span><div className="meta">{r.requester?.name} · by {r.neededBy || 'soon'} · {r.pickup}</div></div>
      {r.requester?._id === user.id ? <button className="btn g sm" onClick={async () => { await api(`/requests/${r._id}/close`, { method: 'POST' }); R.reload() }}>Close</button> : <Link className="btn sm f" to={'/sell?item=' + encodeURIComponent(r.item)}>I have this</Link>}</div>)}
    {R.data && !R.data.length && <Empty title="No requests yet." text="Be the first to say what you need." />}</>)
}
