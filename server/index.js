require('dotenv').config()
const express = require('express'), mongoose = require('mongoose'), helmet = require('helmet'), cookieParser = require('cookie-parser'), path = require('path'), fs = require('fs'), crypto = require('crypto')
const rateLimit = require('express-rate-limit'), sanitize = require('express-mongo-sanitize'), multer = require('multer'), { ZodError } = require('zod')
const { Listing, Notification } = require('./models'), { auth, wrap } = require('./middleware')
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) { console.error('Set MONGODB_URI and JWT_SECRET in server/.env'); process.exit(1) }

const app = express(), prod = process.env.NODE_ENV === 'production'
app.set('trust proxy', 1)
app.use(helmet({ contentSecurityPolicy: false })); app.use(express.json({ limit: '50kb' })); app.use(cookieParser()); app.use(sanitize())
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 })); app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300 }))

const dir = path.join(__dirname, 'uploads'); fs.mkdirSync(dir, { recursive: true })
const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const upload = multer({ limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  storage: multer.diskStorage({ destination: dir, filename: (req, f, cb) => cb(null, crypto.randomUUID() + '.' + ext[f.mimetype]) }),
  fileFilter: (req, f, cb) => cb(ext[f.mimetype] ? null : new Error('Photo must be a JPG, PNG or WebP'), !!ext[f.mimetype]) })
app.use('/uploads', express.static(dir, { setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }))   // uploaded files are served as images only, never executed
app.post('/api/upload', auth, upload.single('photo'), (req, res) => res.json({ url: '/uploads/' + req.file.filename }))

app.use('/api/auth', require('./routes/auth')); app.use('/api/listings', require('./routes/listings'))
app.use('/api/offers', require('./routes/offers')); app.use('/api', require('./routes/community'))
if (prod) { const dist = path.join(__dirname, '../client/dist'); app.use(express.static(dist)); app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html'))) }
app.use((e, req, res, next) => {
  if (e instanceof ZodError) return res.status(400).json({ error: e.issues[0].path.join('.') + ': ' + e.issues[0].message })
  if (e.name === 'ValidationError' || e.name === 'CastError' || e.message?.startsWith('Photo')) return res.status(400).json({ error: e.message })
  if (e.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Photo must be under 3 MB' })
  console.error(e); res.status(500).json({ error: 'Something went wrong. Please try again.' })
})

// Hourly: warn sellers one day before expiry, then move unconfirmed listings to expired.
async function expire() {
  const soon = await Listing.find({ status: 'available', expiresAt: { $gt: new Date(), $lt: new Date(Date.now() + 864e5) } })
  for (const l of soon) if (!(await Notification.exists({ user: l.seller, kind: 'expiring', body: new RegExp(l._id) }))) await Notification.create({ user: l.seller, kind: 'expiring', body: `Is "${l.title}" still available? Keep it active or mark it sold. [${l._id}]` })
  await Listing.updateMany({ status: 'available', expiresAt: { $lt: new Date() } }, { status: 'expired' })
}
mongoose.connect(process.env.MONGODB_URI).then(() => {
  app.listen(process.env.PORT || 5000, () => console.log('Campus Hustle API on port', process.env.PORT || 5000)); expire(); setInterval(() => expire().catch(console.error), 36e5)
}).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1) })
