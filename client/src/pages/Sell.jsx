import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, CATEGORIES, PICKUP, CONDITIONS, SUBS, EMO } from '../api.js'
import { useApp } from '../App.jsx'

export default function Sell() {
  const nav = useNavigate(), [sp] = useSearchParams(), { user, say } = useApp()
  const cats = user.community === 'women' ? [...CATEGORIES, 'Beauty & Personal Care'] : CATEGORIES
  const [f, setF] = useState({ title: sp.get('item') || '', price: '', originalPrice: '', category: cats[0], subcategory: '', condition: 'Good', pickup: PICKUP[1], negotiable: true, days: '7', description: '' })
  const [file, setFile] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      let images = []
      if (file) { const fd = new FormData(); fd.append('photo', file); images = [(await api('/upload', { method: 'POST', form: fd })).url] }
      const l = await api('/listings', { method: 'POST', body: { ...f, price: Number(f.price), originalPrice: f.originalPrice ? Number(f.originalPrice) : undefined, days: Number(f.days), images, emoji: EMO[f.category] } })
      say('Published'); nav('/listing/' + l._id)
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (<form onSubmit={submit} style={{ maxWidth: 520 }}><h2>➕ Sell something</h2>
    {sp.get('item') && <div className="panel">🔥 Students are looking for <b>{sp.get('item')}</b>. Your listing will be matched to their requests.</div>}
    <label>Photo (JPG, PNG or WebP, up to 3 MB)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0] || null)} />
    <label>Title</label><input required minLength={3} maxLength={80} value={f.title} onChange={set('title')} />
    <label>Category</label><select value={f.category} onChange={set('category')}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
    {SUBS[f.category] && <><label>Sub-category</label><select value={f.subcategory} onChange={set('subcategory')}><option value="">Choose</option>{SUBS[f.category].map((s) => <option key={s}>{s}</option>)}</select></>}
    <div className="row"><div style={{ flex: 1 }}><label>Price (₹)</label><input type="number" required min={0} value={f.price} onChange={set('price')} /></div><div style={{ flex: 1 }}><label>Original price</label><input type="number" min={0} value={f.originalPrice} onChange={set('originalPrice')} /></div></div>
    <label>Condition</label><select value={f.condition} onChange={set('condition')}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
    <label>Pickup (public campus spot)</label><select value={f.pickup} onChange={set('pickup')}>{PICKUP.map((c) => <option key={c}>{c}</option>)}</select>
    <label>Expires in</label><select value={f.days} onChange={set('days')}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
    <label><input type="checkbox" style={{ width: 'auto' }} checked={f.negotiable} onChange={set('negotiable')} /> Negotiable</label>
    <label>Description</label><textarea rows={3} maxLength={1000} value={f.description} onChange={set('description')} />
    {err && <p className="err">{err}</p>}<p><button className="btn" disabled={busy}>{busy ? 'Publishing…' : 'Publish listing'}</button></p></form>)
}
