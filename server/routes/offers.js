const r = require('express').Router(), { z } = require('zod')
const { Offer, Listing, Transaction, Rating, FoodOrder, PUBLIC_USER } = require('../models')
const { auth, wrap, notify, visible } = require('../middleware')
r.use(auth)
const bad = (res, m) => res.status(400).json({ error: m })

r.get('/mine', wrap(async (req, res) => res.json(await Offer.find({ $or: [{ buyer: req.user._id }, { seller: req.user._id }] }).sort({ updatedAt: -1 }).populate('listing', 'title price status emoji images').populate('buyer seller', 'name'))))
r.get('/listing/:id', wrap(async (req, res) => res.json(await Offer.find({ listing: req.params.id, $or: [{ buyer: req.user._id }, { seller: req.user._id }] }).sort({ createdAt: -1 }).populate('buyer', 'name department year'))))

r.post('/', wrap(async (req, res) => {
  const { listingId, amount, message } = z.object({ listingId: z.string(), amount: z.coerce.number().int().min(1), message: z.string().max(200).optional() }).parse(req.body)
  const l = await Listing.findOne({ _id: listingId, status: 'available', ...(await visible(req.user)) }); if (!l) return bad(res, 'Listing is not available')
  if (String(l.seller) === String(req.user._id)) return bad(res, 'You cannot offer on your own listing')
  if (!l.negotiable) return bad(res, 'This price is fixed'); if (amount > l.price) return bad(res, 'Offer must be at or below the listed price')
  if (await Offer.exists({ listing: l._id, buyer: req.user._id, status: { $in: ['pending', 'countered'] } })) return bad(res, 'You already have an open offer')
  const o = await Offer.create({ listing: l._id, buyer: req.user._id, seller: l.seller, amount, lastActor: 'buyer', history: [{ by: 'buyer', action: 'offer', amount, message }] })
  await notify(l.seller, 'offer', `New offer of ₹${amount} on ${l.title}`); res.status(201).json(o)
}))
r.post('/:id/respond', wrap(async (req, res) => {
  const { action, amount } = z.object({ action: z.enum(['accept', 'reject', 'counter']), amount: z.coerce.number().int().min(1).optional() }).parse(req.body)
  const o = await Offer.findById(req.params.id).populate('listing'); if (!o) return res.status(404).json({ error: 'Offer not found' })
  const isBuyer = String(o.buyer) === String(req.user._id), isSeller = String(o.seller) === String(req.user._id)
  if (!isBuyer && !isSeller) return res.status(403).json({ error: 'Not your offer' })
  if (!['pending', 'countered'].includes(o.status)) return bad(res, 'This offer is closed')
  const actor = isBuyer ? 'buyer' : 'seller'; if (actor === o.lastActor) return bad(res, 'Waiting for the other side')
  const l = o.listing, other = isBuyer ? o.seller : o.buyer
  if (action === 'accept') {
    const got = await Listing.findOneAndUpdate({ _id: l._id, status: 'available' }, { status: 'reserved' })   // atomic: two accepts cannot both win
    if (!got) return bad(res, 'Listing is no longer available')
    o.status = 'accepted'; await Offer.updateMany({ listing: l._id, _id: { $ne: o._id }, status: { $in: ['pending', 'countered'] } }, { status: 'rejected' })
  } else if (action === 'reject') o.status = 'rejected'
  else { if (!amount || amount > l.price) return bad(res, 'Counter must be between 1 and the listed price'); o.status = 'countered'; o.amount = amount; o.lastActor = actor }
  o.history.push({ by: actor, action, amount }); await o.save()
  await notify(other, 'offer', `Offer ${{ accept: 'accepted', reject: 'rejected', counter: 'countered' }[action]} on ${l.title}`); res.json(o)
}))
r.post('/:id/complete', wrap(async (req, res) => {
  const o = await Offer.findById(req.params.id).populate('listing'); if (!o) return res.status(404).json({ error: 'Offer not found' })
  if (![String(o.buyer), String(o.seller)].includes(String(req.user._id))) return res.status(403).json({ error: 'Not your deal' })
  if (o.status !== 'accepted' || o.listing.status !== 'reserved') return bad(res, 'Nothing to complete')
  await Listing.updateOne({ _id: o.listing._id }, { status: 'sold' })
  const t = await Transaction.create({ listing: o.listing._id, offer: o._id, buyer: o.buyer, seller: o.seller, price: o.amount })
  await notify(o.buyer, 'sold', `${o.listing.title} is complete. Rate the seller.`); await notify(o.seller, 'sold', `${o.listing.title} is sold. Rate the buyer.`)
  res.json(t)
}))
r.get('/transaction/:listingId', wrap(async (req, res) => {
  const t = await Transaction.findOne({ listing: req.params.listingId, $or: [{ buyer: req.user._id }, { seller: req.user._id }] })
  res.json(t ? { ...t.toObject(), rated: !!(await Rating.exists({ transaction: t._id, rater: req.user._id })) } : null)
}))
r.post('/transaction/:id/rate', wrap(async (req, res) => {
  const { stars, comment } = z.object({ stars: z.coerce.number().int().min(1).max(5), comment: z.string().max(300).optional() }).parse(req.body)
  const t = await Transaction.findById(req.params.id); const me = String(req.user._id)
  if (!t || ![String(t.buyer), String(t.seller)].includes(me)) return res.status(403).json({ error: 'Not your transaction' })
  try { await Rating.create({ transaction: t._id, rater: me, ratee: me === String(t.buyer) ? t.seller : t.buyer, stars, comment }) }
  catch { return bad(res, 'You already rated this deal') }
  res.json({ ok: true })
}))

// Food pickup orders (businesses only)
r.post('/food', wrap(async (req, res) => {
  const { listingId, qty, slot } = z.object({ listingId: z.string(), qty: z.coerce.number().int().min(1).max(10), slot: z.string().max(30) }).parse(req.body)
  const l = await Listing.findOne({ _id: listingId, category: 'Food & Homemade Items', status: 'available', ...(await visible(req.user)) }).populate('seller', 'account')
  if (!l || l.seller.account !== 'business') return bad(res, 'This item cannot be ordered')
  const o = await FoodOrder.create({ buyer: req.user._id, seller: l.seller._id, listing: l._id, item: l.title, qty, slot, total: qty * l.price, pickup: l.pickup })
  await notify(l.seller._id, 'order', `New order: ${qty}× ${l.title}`); res.status(201).json(o)
}))
r.get('/food/mine', wrap(async (req, res) => res.json(await FoodOrder.find({ $or: [{ buyer: req.user._id }, { seller: req.user._id }] }).sort({ createdAt: -1 }).limit(50))))
r.post('/food/:id/status', wrap(async (req, res) => {
  const { status } = z.object({ status: z.enum(['preparing', 'ready', 'picked_up']) }).parse(req.body)
  const o = await FoodOrder.findById(req.params.id); if (!o) return res.status(404).json({ error: 'Order not found' })
  const me = String(req.user._id), flow = { placed: 'preparing', preparing: 'ready', ready: 'picked_up' }
  const allowed = status === 'picked_up' ? me === String(o.buyer) : me === String(o.seller)     // shop updates progress, buyer confirms pickup
  if (!allowed || flow[o.status] !== status) return bad(res, 'That step is not allowed')
  o.status = status; await o.save(); await notify(status === 'picked_up' ? o.seller : o.buyer, 'order', `Order ${o.item}: ${status.replace('_', ' ')}`); res.json(o)
}))
module.exports = r
