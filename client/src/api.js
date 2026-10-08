import { useEffect, useState, useCallback } from 'react'
export async function api(path, { method = 'GET', body, form } = {}) {
  const o = { method, credentials: 'include', headers: {} }
  if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body) }
  if (form) o.body = form
  const r = await fetch('/api' + path, o); const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.')
  return d
}
// Loads data and gives back { data, loading, error, reload }.
export function useGet(path, deps = []) {
  const [s, set] = useState({ data: null, loading: true, error: '' })
  const load = useCallback(() => { set((x) => ({ ...x, loading: true })); api(path).then((data) => set({ data, loading: false, error: '' }), (e) => set({ data: null, loading: false, error: e.message })) }, [path, ...deps])
  useEffect(load, [load]); return { ...s, reload: load }
}
export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')
export const CATEGORIES = ['College Essentials', 'Hostel Essentials', 'Cycles & Mobility', 'Electronics & Gadgets', 'Books & Study Material', 'Fashion & Accessories', 'Food & Homemade Items', 'Services', 'Sports & Fitness', 'Free / Giveaway', 'Other']
export const PICKUP = ['Main Gate', 'Library', 'Cafeteria', 'Academic Block', 'Student Center', 'Hostel Block gate', 'Department Block']
export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair', 'For parts']
export const SUBS = { 'College Essentials': ['Stationery', 'Lab', 'Project'], 'Hostel Essentials': ['Room', 'Daily', 'Deals'], 'Food & Homemade Items': ['Biryani', 'Noodles', 'Snacks', 'Homemade', 'Breakfast', 'Desserts', 'Drinks', 'Combos'] }
export const EMO = { 'College Essentials': '📚', 'Hostel Essentials': '🏠', 'Cycles & Mobility': '🚲', 'Electronics & Gadgets': '💻', 'Books & Study Material': '📖', 'Food & Homemade Items': '🍜', 'Beauty & Personal Care': '💄' }
