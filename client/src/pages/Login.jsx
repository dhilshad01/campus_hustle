import { useState } from 'react'
import { api } from '../api.js'
import { useApp } from '../App.jsx'

export default function Login() {
  const { setUser } = useApp(), [mode, setMode] = useState('in'), [acct, setAcct] = useState('student'), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const [f, setF] = useState({ email: '', password: '', name: '', department: '', year: '1', community: '', category: 'Campus food', description: '', hours: '', contact: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const body = mode === 'in' ? { email: f.email, password: f.password } : { email: f.email, password: f.password, name: f.name, account: acct,
        ...(acct === 'student' ? { department: f.department, year: f.year, community: f.community } : { business: { category: f.category, description: f.description, hours: f.hours, contact: f.contact } }) }
      setUser(await api(mode === 'in' ? '/auth/login' : '/auth/register', { method: 'POST', body }))
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (<main style={{ maxWidth: 440 }}>
    <h1 style={{ fontSize: 32, lineHeight: 1.05 }}>Welcome to your campus marketplace.</h1><p className="meta">Find it. Bargain for it. Meet on campus.</p>
    <div className="row"><button className={'btn ' + (mode === 'in' ? '' : 'g')} onClick={() => setMode('in')}>Log in</button><button className={'btn ' + (mode === 'up' ? '' : 'g')} onClick={() => setMode('up')}>Create account</button></div>
    <form onSubmit={submit} className="panel">
      {mode === 'up' && <>
        <div className="row"><button type="button" className={'btn ' + (acct === 'student' ? '' : 'g')} onClick={() => setAcct('student')}>🎓 I'm a student</button>
          <button type="button" className={'btn ' + (acct === 'business' ? 'f' : 'g')} onClick={() => setAcct('business')}>🏪 I'm a business person</button></div>
        <label>{acct === 'business' ? 'Business name' : 'Your name'}</label><input required maxLength={40} value={f.name} onChange={set('name')} />
        {acct === 'student' ? <>
          <label>Department</label><input maxLength={40} value={f.department} onChange={set('department')} />
          <label>Year</label><select value={f.year} onChange={set('year')}>{[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
          <label>Hostel / community (optional, private)</label><select value={f.community} onChange={set('community')}><option value="">Prefer not to say</option><option value="men">Men's</option><option value="women">Women's</option></select>
        </> : <>
          <label>What do you sell?</label><select value={f.category} onChange={set('category')}>{['Campus food', 'Stationery shop', 'Printing shop', 'Tech accessories', 'Cycle repair', 'Student services', 'Other'].map((c) => <option key={c}>{c}</option>)}</select>
          <label>Short description</label><textarea rows={2} maxLength={160} value={f.description} onChange={set('description')} />
          <label>Opening hours</label><input maxLength={30} value={f.hours} onChange={set('hours')} /><label>Contact (optional)</label><input maxLength={30} value={f.contact} onChange={set('contact')} />
        </>}
      </>}
      <label>Email</label><input type="email" required value={f.email} onChange={set('email')} />
      <label>Password</label><input type="password" required minLength={mode === 'up' ? 8 : 1} value={f.password} onChange={set('password')} />
      {err && <p className="err">{err}</p>}<p><button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Log in' : 'Create account'}</button></p>
      <p className="meta">Demo build: verification is not real. Never share delivery OTPs or room numbers.</p>
    </form></main>)
}
