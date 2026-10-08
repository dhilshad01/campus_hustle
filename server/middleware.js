const jwt = require('jsonwebtoken')
const { User, Block } = require('./models')
const auth = async (req, res, next) => {
  try {
    const t = req.cookies.token; if (!t) return res.status(401).json({ error: 'Please log in' })
    const { id } = jwt.verify(t, process.env.JWT_SECRET)
    const u = await User.findById(id).select('+community'); if (!u) throw new Error('no user')
    req.user = u; next()
  } catch { res.status(401).json({ error: 'Please log in' }) }
}
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next)
const notify = (user, kind, body) => require('./models').Notification.create({ user, kind, body })
// Listings this user may see: same campus, not blocked either way, beauty only for the women's community.
async function visible(u) {
  const bl = await Block.find({ $or: [{ blocker: u._id }, { blocked: u._id }] })
  const hidden = bl.map((b) => String(b.blocker) === String(u._id) ? b.blocked : b.blocker)
  const f = { campus: u.campus, seller: { $nin: hidden } }
  if (u.community !== 'women') f.category = { $ne: 'Beauty & Personal Care' }
  return f
}
module.exports = { auth, wrap, notify, visible }
