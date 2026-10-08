const mongoose = require('mongoose')
const { Schema, model } = mongoose
const ref = (n) => ({ type: Schema.Types.ObjectId, ref: n, required: true })
const PICKUP = ['Main Gate', 'Library', 'Cafeteria', 'Academic Block', 'Student Center', 'Hostel Block gate', 'Department Block']
const CONDITIONS = ['New', 'Like new', 'Good', 'Fair', 'For parts']
const PUBLIC_USER = 'name department year verified account business createdAt'

const User = model('User', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  account: { type: String, enum: ['student', 'business'], default: 'student' },
  name: { type: String, required: true, maxlength: 40, trim: true },
  department: { type: String, maxlength: 40 }, year: { type: Number, min: 1, max: 6 },
  community: { type: String, enum: ['men', 'women'], select: false },      // private: never sent to other users
  verified: { type: Boolean, default: false },                                // only an admin can set this
  campus: { type: String, default: 'Demo University' },
  business: { category: String, description: { type: String, maxlength: 160 }, hours: { type: String, maxlength: 30 }, contact: { type: String, maxlength: 30 } },
}, { timestamps: true }))

const listingSchema = new Schema({
  seller: ref('User'), campus: { type: String, required: true },
  title: { type: String, required: true, minlength: 3, maxlength: 80, trim: true },
  description: { type: String, maxlength: 1000 }, category: { type: String, required: true }, subcategory: String, tag: String,
  emoji: String, price: { type: Number, required: true, min: 0, max: 1000000 }, originalPrice: { type: Number, min: 0 },
  condition: { type: String, enum: CONDITIONS, default: 'Good' }, negotiable: { type: Boolean, default: true },
  quantity: { type: Number, default: 1, min: 1, max: 100 }, pickup: { type: String, enum: PICKUP, required: true },
  status: { type: String, enum: ['available', 'reserved', 'sold', 'expired', 'out_of_stock'], default: 'available' },
  images: { type: [String], validate: (v) => v.length <= 6 }, expiresAt: { type: Date, required: true }, views: { type: Number, default: 0 },
}, { timestamps: true })
listingSchema.index({ campus: 1, status: 1, createdAt: -1 })
const Listing = model('Listing', listingSchema)

const Offer = model('Offer', new Schema({
  listing: ref('Listing'), buyer: ref('User'), seller: ref('User'), amount: { type: Number, required: true, min: 1 },
  lastActor: { type: String, enum: ['buyer', 'seller'], required: true },
  status: { type: String, enum: ['pending', 'countered', 'accepted', 'rejected', 'expired'], default: 'pending' },
  history: [{ by: String, action: String, amount: Number, message: { type: String, maxlength: 200 }, at: { type: Date, default: Date.now } }],
}, { timestamps: true }))

const txSchema = new Schema({ listing: { ...ref('Listing'), unique: true }, offer: ref('Offer'), buyer: ref('User'), seller: ref('User'), price: Number }, { timestamps: true })
const Transaction = model('Transaction', txSchema)
const rSchema = new Schema({ transaction: ref('Transaction'), rater: ref('User'), ratee: ref('User'),
  stars: { type: Number, min: 1, max: 5, required: true }, comment: { type: String, maxlength: 300 } }, { timestamps: true })
rSchema.index({ transaction: 1, rater: 1 }, { unique: true })
const Rating = model('Rating', rSchema)

const Request = model('Request', new Schema({
  requester: ref('User'), campus: String, item: { type: String, required: true, minlength: 2, maxlength: 80 }, tag: String, category: String,
  budget: { type: Number, required: true, min: 1, max: 1000000 }, neededBy: { type: String, maxlength: 30 },
  pickup: { type: String, enum: PICKUP }, description: { type: String, maxlength: 300 },
  status: { type: String, enum: ['open', 'fulfilled', 'closed'], default: 'open' } }, { timestamps: true }))

const savedSchema = new Schema({ user: ref('User'), listing: ref('Listing') }, { timestamps: true })
savedSchema.index({ user: 1, listing: 1 }, { unique: true })
const Saved = model('Saved', savedSchema)
const Notification = model('Notification', new Schema({ user: ref('User'), kind: String, body: { type: String, required: true }, read: { type: Boolean, default: false } }, { timestamps: true }))
const Message = model('Message', new Schema({ listing: ref('Listing'), buyer: ref('User'), sender: ref('User'), body: { type: String, required: true, minlength: 1, maxlength: 1000 } }, { timestamps: true }))
const Report = model('Report', new Schema({ reporter: ref('User'), listing: { type: Schema.Types.ObjectId, ref: 'Listing' }, reportedUser: { type: Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String, enum: ['scam', 'misleading', 'spam', 'prohibited', 'already_sold', 'inappropriate', 'harassment', 'other'], required: true },
  status: { type: String, default: 'open' } }, { timestamps: true }))
const bSchema = new Schema({ blocker: ref('User'), blocked: ref('User') }); bSchema.index({ blocker: 1, blocked: 1 }, { unique: true })
const Block = model('Block', bSchema)
const SearchEvent = model('SearchEvent', new Schema({ user: ref('User'), term: { type: String, maxlength: 80 }, tag: String }, { timestamps: true }))
const ViewEvent = model('ViewEvent', new Schema({ listing: ref('Listing'), user: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true }))
const Parcel = model('Parcel', new Schema({
  campus: String, poster: ref('User'), kind: { type: String, enum: ['need', 'got'], required: true }, firstName: { type: String, required: true, maxlength: 20 },
  courier: { type: String, maxlength: 30 }, window: { type: String, maxlength: 30 }, spot: { type: String, enum: PICKUP, required: true },
  tip: { type: Number, enum: [0, 10, 20, 50], default: 0 }, note: { type: String, maxlength: 80, validate: (v) => !/\d{6,}/.test(v || '') },
  status: { type: String, enum: ['open', 'claimed', 'collected', 'waiting', 'handed_over', 'cancelled'], required: true },
  helper: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true }))
const FoodOrder = model('FoodOrder', new Schema({ buyer: ref('User'), seller: ref('User'), listing: ref('Listing'), item: String, qty: { type: Number, min: 1, max: 10 },
  slot: String, total: Number, pickup: String, status: { type: String, enum: ['placed', 'preparing', 'ready', 'picked_up'], default: 'placed' } }, { timestamps: true }))

module.exports = { User, Listing, Offer, Transaction, Rating, Request, Saved, Notification, Message, Report, Block, SearchEvent, ViewEvent, Parcel, FoodOrder, PICKUP, CONDITIONS, PUBLIC_USER }
