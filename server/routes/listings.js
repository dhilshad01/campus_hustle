const r = require('express').Router(), { z } = require('zod')
const { Listing, Saved, Report, Block, Message, SearchEvent, ViewEvent, Request, Transaction, Rating, User, PICKUP, CONDITIONS, PUBLIC_USER } = require('../models')
const { auth, wrap, notify, visible } = require('../middleware')
r.use(auth)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

r.get('/', wrap(async (req, res) => {
  const q = req.query, u = req.user, f = { ...(await visible(u)), status: { $in: ['available', 'reserved'] } }
  let text = String(q.q || '').slice(0, 80).trim(); const m = text.match(/under\s*₹?(\d+)/i)
  let max = q.max ? Number(q.max) : null; if (m) { max = Number(m[1]); text = text.replace(m[0], '').trim() }
  if (text) {
    const rx = new RegExp(esc(text), 'i'); f.$or = [{ title: rx }, { tag: rx }, { category: rx }, { subcategory: rx }]
    await SearchEvent.create({ user: u._id, term: text, tag: text.toLowerCase().split(' ').pop() })   // feeds Campus Fire
  }
  if (q.category) f.category = String(q.category); if (q.sub) f.subcategory = String(q.sub)
  if (CONDITIONS.includes(q.condition)) f.condition = q.condition
  if (q.neg === 'true') f.negotiable = true
  if (max !== null && !isNaN(max)) f.price = { ...(f.price || {}), $lte: max }
  if (q.min && !isNaN(Number(q.min))) f.price = { ...(f.price || {}), $gte: Number(q.min) }
  const sort = q.sort === 'low' ? { price: 1 } : q.sort === 'high' ? { price: -1 } : { createdAt: -1 }
  let items = await Listing.find(f).sort(sort).limit(60).populate('seller', PUBLIC_USER)
  if (q.seller === 'business' || q.seller === 'student') items = items.filter((l) => l.seller.account === q.seller)
  res.json(items)
}))
r.get('/mine', wrap(async (req, res) => res.json(await Listing.find({ seller: req.user._id }).sort({ createdAt: -1 }))))
r.get('/saved', wrap(async (req, res) => {
  const s = await Saved.find({ user: req.user._id }).populate({ path: 'listing', populate: { path: 'seller', select: PUBLIC_USER } })
  res.json(s.map((x) => x.listing).filter(Boolean))
}))

const body = z.object({ title: z.string().trim().min(3).max(80), description: z.string().max(1000).optional(), category: z.string().max(40), subcategory: z.string().max(40).optional(),
  price: z.coerce.number().min(0).max(1000000), originalPrice: z.coerce.number().min(0).optional(), condition: z.enum(CONDITIONS).default('Good'),
  negotiable: z.coerce.boolean().default(true), quantity: z.coerce.number().int().min(1).max(100).default(1), pickup: z.enum(PICKUP),
  images: z.array(z.string().regex(/^\/uploads\/[\w-]+\.(jpg|png|webp)$/)).max(6).default([]), days: z.coerce.number().int().min(1).max(30).default(7), emoji: z.string().max(4).optional() })

r.post('/', wrap(async (req, res) => {
  const b = body.parse(req.body), u = req.user
  const l = await Listing.create({ ...b, seller: u._id, campus: u.campus, tag: b.title.toLowerCase().split(' ').pop(), expiresAt: new Date(Date.now() + b.days * 864e5) })
  const hits = await Request.find({ status: 'open', tag: l.tag, campus: u.campus, budget: { $gte: l.price }, requester: { $ne: u._id } })   // request <-> listing matching
  await Promise.all(hits.map((h) => notify(h.requester, 'match', `🎯 Match found: ${l.title} for ₹${l.price}`)))
  res.status(201).json(l)
}))
r.get('/:id', wrap(async (req, res) => {
  const l = await Listing.findOne({ _id: req.params.id, ...(await visible(req.user)) }).populate('seller', PUBLIC_USER)
  if (!l) return res.status(404).json({ error: 'Listing not found' })
  if (String(l.seller._id) !== String(req.user._id)) { l.views++; await l.save(); await ViewEvent.create({ listing: l._id, user: req.user._id }) }
  const [done, ratings] = await Promise.all([Transaction.countDocuments({ seller: l.seller._id }), Rating.find({ ratee: l.seller._id })])
  res.json({ ...l.toObject(), sellerStats: { sold: done, ratings: ratings.length, rating: ratings.length ? ratings.reduce((a, x) => a + x.stars, 0) / ratings.length : null } })
}))
r.patch('/:id', wrap(async (req, res) => {          // only the owner, only safe fields; "reserved" can never be set here
  const l = await Listing.findOne({ _id: req.params.id, seller: req.user._id }); if (!l) return res.status(404).json({ error: 'Listing not found' })
  const b = body.partial().extend({ status: z.enum(['available', 'sold', 'out_of_stock']).optional(), extendDays: z.coerce.number().int().min(1).max(30).optional() }).parse(req.body)
  if (b.status && l.status === 'sold' && await Transaction.exists({ listing: l._id })) return res.status(400).json({ error: 'A completed sale cannot be reactivated' })
  const { days, extendDays, ...rest } = b; Object.assign(l, rest)
  if (extendDays) { l.expiresAt = new Date(Math.max(Date.now(), +l.expiresAt) + extendDays * 864e5); if (l.status === 'expired') l.status = 'available' }
  await l.save(); res.json(l)
}))
r.delete('/:id', wrap(async (req, res) => { await Listing.deleteOne({ _id: req.params.id, seller: req.user._id, status: { $ne: 'reserved' } }); res.json({ ok: true }) }))

r.post('/:id/save', wrap(async (req, res) => {
  const k = { user: req.user._id, listing: req.params.id }
  if (await Saved.findOneAndDelete(k)) return res.json({ saved: false })
  await Saved.create(k); res.json({ saved: true })
}))
r.post('/:id/report', wrap(async (req, res) => {
  const { reason, block } = z.object({ reason: z.enum(['scam', 'misleading', 'spam', 'prohibited', 'already_sold', 'inappropriate', 'harassment', 'other']), block: z.boolean().optional() }).parse(req.body)
  const l = await Listing.findById(req.params.id); if (!l) return res.status(404).json({ error: 'Listing not found' })
  await Report.create({ reporter: req.user._id, listing: l._id, reportedUser: l.seller, reason })
  if (block && String(l.seller) !== String(req.user._id)) await Block.updateOne({ blocker: req.user._id, blocked: l.seller }, {}, { upsert: true })
  res.json({ ok: true })
}))

// Chat: one thread per (listing, buyer). A seller can only message buyers who have already participated.
async function thread(req, l) {
  const isSeller = String(l.seller) === String(req.user._id)
  const buyer = isSeller ? req.query.buyer || req.body.buyer : req.user._id
  if (!buyer) return null
  if (isSeller) {
    const existing = await Message.exists({ listing: l._id, buyer })
    if (!existing) return null
  }
  return { buyer, isSeller }
}
r.get('/:id/threads', wrap(async (req, res) => {       // seller: who has messaged me about this listing
  const l = await Listing.findOne({ _id: req.params.id, seller: req.user._id }); if (!l) return res.json([])
  res.json(await User.find({ _id: { $in: await Message.distinct('buyer', { listing: l._id }) } }).select('name department year'))
}))
r.get('/:id/messages', wrap(async (req, res) => {
  const l = await Listing.findOne({ _id: req.params.id, ...(await visible(req.user)) }); if (!l) return res.status(404).json({ error: 'Listing not found' })
  const t = await thread(req, l); if (!t) return res.json([])
  res.json(await Message.find({ listing: l._id, buyer: t.buyer }).sort({ createdAt: 1 }).limit(200))
}))
r.post('/:id/messages', wrap(async (req, res) => {
  const l = await Listing.findOne({ _id: req.params.id, ...(await visible(req.user)) }); if (!l) return res.status(404).json({ error: 'Listing not found' })
  const t = await thread(req, l); if (!t) return res.status(400).json({ error: 'Choose a buyer' })
  const { text } = z.object({ text: z.string().trim().min(1).max(1000) }).parse(req.body)
  const m = await Message.create({ listing: l._id, buyer: t.buyer, sender: req.user._id, body: text })
  await notify(t.isSeller ? t.buyer : l.seller, 'message', `New message about ${l.title}`); res.status(201).json(m)
}))
module.exports = r
