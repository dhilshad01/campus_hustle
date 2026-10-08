const r = require('express').Router(), { z } = require('zod')
const { Request, Listing, Saved, Offer, Transaction, SearchEvent, ViewEvent, Parcel, Notification, PICKUP, PUBLIC_USER } = require('../models')
const { auth, wrap, notify } = require('../middleware')
r.use(auth)

// ----- Requests ("I need this") -----
r.get('/requests', wrap(async (req, res) => res.json(await Request.find({ campus: req.user.campus, status: 'open' }).sort({ createdAt: -1 }).limit(60).populate('requester', 'name'))))
r.post('/requests', wrap(async (req, res) => {
  const b = z.object({ item: z.string().trim().min(2).max(80), category: z.string().max(40).optional(), budget: z.coerce.number().min(1).max(1000000),
    neededBy: z.string().max(30).optional(), pickup: z.enum(PICKUP).optional(), description: z.string().max(300).optional() }).parse(req.body)
  const tag = b.item.toLowerCase().split(' ').pop(), u = req.user
  const q = await Request.create({ ...b, tag, requester: u._id, campus: u.campus })
  const n = await Listing.countDocuments({ tag, status: 'available', campus: u.campus, price: { $lte: b.budget }, seller: { $ne: u._id } })
  if (n) await notify(u._id, 'match', `🎯 ${n} listing(s) already match "${b.item}"`)
  res.status(201).json({ ...q.toObject(), matches: n })
}))
r.post('/requests/:id/close', wrap(async (req, res) => { await Request.updateOne({ _id: req.params.id, requester: req.user._id }, { status: 'closed' }); res.json({ ok: true }) }))

// ----- Campus Fire: demand from real activity; recent activity counts more -----
r.get('/fire', wrap(async (req, res) => {
  const since = new Date(Date.now() - 30 * 864e5), c = req.user.campus, score = {}, reqs = {}
  const w = (d) => { const age = (Date.now() - +d) / 864e5; return age < 3 ? 1.5 : age < 14 ? 1 : 0.3 }
  const add = (tag, pts, at) => { if (tag) score[tag] = (score[tag] || 0) + pts * w(at) }
  const [rq, se, sv, of, vw, tx] = await Promise.all([
    Request.find({ campus: c, status: 'open' }), SearchEvent.find({ createdAt: { $gte: since } }).populate('user', 'campus'),
    Saved.find({ createdAt: { $gte: since } }).populate('listing', 'tag campus'), Offer.find({ createdAt: { $gte: since } }).populate('listing', 'tag campus'),
    ViewEvent.find({ createdAt: { $gte: since } }).limit(5000).populate('listing', 'tag campus'), Transaction.find({ createdAt: { $gte: since } }).populate('listing', 'tag campus')])
  rq.forEach((x) => { add(x.tag, 5, x.createdAt); reqs[x.tag] = (reqs[x.tag] || 0) + 1 })
  se.filter((x) => x.user?.campus === c).forEach((x) => add(x.tag, 2, x.createdAt))
  sv.filter((x) => x.listing?.campus === c).forEach((x) => add(x.listing.tag, 2, x.createdAt))
  of.filter((x) => x.listing?.campus === c).forEach((x) => add(x.listing.tag, 3, x.createdAt))
  vw.filter((x) => x.listing?.campus === c).forEach((x) => add(x.listing.tag, 1, x.createdAt))
  tx.filter((x) => x.listing?.campus === c).forEach((x) => add(x.listing.tag, 4, x.createdAt))
  res.json(Object.entries(score).map(([tag, s]) => ({ tag, requests: reqs[tag] || 0, score: Math.round(s * 10) / 10, level: s >= 40 ? 'High demand' : s >= 20 ? 'Trending' : 'Normal' }))
    .sort((a, b) => b.score - a.score).slice(0, 12))
}))

// ----- Parcel Help -----
r.get('/parcels', wrap(async (req, res) => res.json(await Parcel.find({ campus: req.user.campus, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).limit(60).populate('helper', 'name'))))
r.post('/parcels', wrap(async (req, res) => {
  const b = z.object({ kind: z.enum(['need', 'got']), firstName: z.string().trim().min(1).max(20), courier: z.string().max(30), window: z.string().max(30).optional(),
    spot: z.enum(PICKUP), tip: z.coerce.number().refine((n) => [0, 10, 20, 50].includes(n)).default(0), note: z.string().max(80).optional() }).parse(req.body)
  res.status(201).json(await Parcel.create({ ...b, poster: req.user._id, campus: req.user.campus, status: b.kind === 'need' ? 'open' : 'waiting' }))
}))
r.post('/parcels/:id/step', wrap(async (req, res) => {
  const { action } = z.object({ action: z.enum(['claim', 'collect', 'handover', 'cancel']) }).parse(req.body)
  const p = await Parcel.findOne({ _id: req.params.id, campus: req.user.campus }); if (!p) return res.status(404).json({ error: 'Parcel not found' })
  const me = String(req.user._id), mine = String(p.poster) === me
  if (action === 'claim' && p.kind === 'need' && p.status === 'open' && !mine) { p.status = 'claimed'; p.helper = req.user._id }
  else if (action === 'collect' && p.status === 'claimed' && String(p.helper) === me) p.status = 'collected'
  else if (action === 'handover' && ((p.kind === 'need' && p.status === 'collected' && mine) || (p.kind === 'got' && p.status === 'waiting' && !mine))) p.status = 'handed_over'
  else if (action === 'cancel' && mine && ['open', 'waiting'].includes(p.status)) p.status = 'cancelled'
  else return res.status(400).json({ error: 'That step is not allowed' })
  await p.save(); res.json(p)
}))

// ----- Notifications -----
r.get('/notifications', wrap(async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50))))
r.post('/notifications/read', wrap(async (req, res) => { await Notification.updateMany({ user: req.user._id }, { read: true }); res.json({ ok: true }) }))
module.exports = r
