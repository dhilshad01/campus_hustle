const r = require('express').Router(), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), { z } = require('zod')
const { User } = require('../models'), { auth, wrap } = require('../middleware')
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 864e5 }
const issue = (res, u) => res.cookie('token', jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOpts)
const shape = (u) => ({ id: u._id, email: u.email, name: u.name, account: u.account, department: u.department, year: u.year, verified: u.verified, campus: u.campus, community: u.community, business: u.business })

r.post('/register', wrap(async (req, res) => {
  const b = z.object({ email: z.string().email(), password: z.string().min(8).max(100), name: z.string().trim().min(1).max(40),
    account: z.enum(['student', 'business']).default('student'), department: z.string().max(40).optional(), year: z.coerce.number().int().min(1).max(6).optional(),
    community: z.enum(['men', 'women']).optional().or(z.literal('').transform(() => undefined)),
    business: z.object({ category: z.string().max(40), description: z.string().max(160).optional(), hours: z.string().max(30).optional(), contact: z.string().max(30).optional() }).optional() }).parse(req.body)
  if (await User.exists({ email: b.email })) return res.status(409).json({ error: 'That email is already registered' })
  const u = await User.create({ ...b, passwordHash: await bcrypt.hash(b.password, 10) })   // "verified" can never come from the client
  issue(res, u); res.status(201).json(shape(u))
}))
r.post('/login', wrap(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().max(100) }).parse(req.body)
  const u = await User.findOne({ email }).select('+passwordHash +community')
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return res.status(401).json({ error: 'Wrong email or password' })
  issue(res, u); res.json(shape(u))
}))
r.post('/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }) })
r.get('/me', auth, (req, res) => res.json(shape(req.user)))
module.exports = r
