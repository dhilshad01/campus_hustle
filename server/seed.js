// Demo data. Run once: npm run seed   (all demo accounts use the password "password123")
require('dotenv').config()
const mongoose = require('mongoose'), bcrypt = require('bcryptjs')
const { User, Listing, Request } = require('./models')
const FOOD = 'Food & Homemade Items', CE = 'College Essentials', HE = 'Hostel Essentials'
const people = [['Meera K.', 'ECE', 3], ['Rohit S.', 'ECE', 4], ['Naveen T.', 'Mechanical', 2], ['Divya R.', 'Civil', 3], ['Karthik P.', 'EEE', 2], ['Sana M.', 'Mechanical', 1], ['Arjun V.', 'CSE', 3], ['Ananya R.', 'CSE', 2, 'women'], ['Fatima S.', 'ECE', 2, 'women']]
const shops = [['Campus Bites', 'Campus food'], ['Midnight Munchies', 'Campus food'], ['Chai & Co', 'Campus food'], ['Campus Stationery Hub', 'Stationery shop'], ['Hostel Essentials Store', 'Hostel supplies'], ['Tech Accessories Hub', 'Tech accessories']]
// [title, tag, price, original, condition, negotiable, category, subcategory, seller name, pickup, emoji]
const items = [
 ['Casio fx-991 calculator', 'calculator', 900, 1400, 'Good', 1, CE, 'Stationery', 'Meera K.', 'Library', '🧮'], ['ECE Engineering Mathematics book', 'book', 350, 720, 'Good', 1, 'Books & Study Material', 'Textbooks', 'Rohit S.', 'Academic Block', '📘'],
 ['Hero cycle, 21-speed', 'cycle', 2800, 6500, 'Good', 1, 'Cycles & Mobility', 'Bicycles', 'Naveen T.', 'Main Gate', '🚲'], ['Lab coat (size M)', 'coat', 250, 500, 'Like new', 0, CE, 'Lab', 'Divya R.', 'Academic Block', '🥼'],
 ['Desk lamp, LED', 'lamp', 400, 900, 'Like new', 1, HE, 'Room', 'Karthik P.', 'Hostel Block gate', '💡'], ['Engineering drawing instruments', 'instruments', 500, 800, 'Good', 1, CE, 'Lab', 'Sana M.', 'Library', '📐'],
 ['Boat earphones', 'earphones', 500, 1200, 'Good', 1, 'Electronics & Gadgets', 'Earphones', 'Arjun V.', 'Student Center', '🎧'], ['Second-hand laptop, i5 8GB', 'laptop', 25000, 52000, 'Fair', 1, 'Electronics & Gadgets', 'Laptops', 'Tech Accessories Hub', 'Student Center', '💻'],
 ['Geometry box', 'box', 90, 150, 'Good', 1, CE, 'Stationery', 'Meera K.', 'Library', '📏'], ['Notebooks (pack of 5)', 'notebooks', 150, 200, 'New', 0, CE, 'Stationery', 'Campus Stationery Hub', 'Library', '📓'],
 ['Breadboard + jumper wires kit', 'kit', 250, 450, 'Like new', 1, CE, 'Project', 'Fatima S.', 'Academic Block', '🔌'], ['Foldable study table', 'table', 700, 1800, 'Good', 1, HE, 'Room', 'Rohit S.', 'Hostel Block gate', '🪵'],
 ['Bedsheet set', 'set', 300, 700, 'Like new', 1, HE, 'Room', 'Fatima S.', 'Hostel Block gate', '🛏'], ['Towels (2 pcs)', 'towels', 200, 0, 'New', 0, HE, 'Daily', 'Hostel Essentials Store', 'Hostel Block gate', '🧻'],
 ['Electric kettle', 'kettle', 450, 900, 'Good', 1, HE, 'Deals', 'Karthik P.', 'Hostel Block gate', '🫖'], ['Hair accessories set (20 pcs)', 'set', 150, 400, 'New', 1, 'Beauty & Personal Care', 'Hair', 'Ananya R.', 'Hostel Block gate', '🎀'],
 ['Table mirror with organizer', 'organizer', 300, 650, 'Like new', 1, 'Beauty & Personal Care', 'Mirrors', 'Fatima S.', 'Student Center', '🪞'],
 ['Chicken biryani (lunch)', 'biryani', 100, 0, 'New', 0, FOOD, 'Biryani', 'Campus Bites', 'Cafeteria', '🍛'], ['Veg noodles', 'noodles', 60, 0, 'New', 0, FOOD, 'Noodles', 'Campus Bites', 'Cafeteria', '🍜'],
 ['Masala maggi', 'maggi', 40, 0, 'New', 0, FOOD, 'Noodles', 'Midnight Munchies', 'Hostel Block gate', '🍜'], ['Samosa (2 pcs)', 'samosa', 30, 0, 'New', 0, FOOD, 'Snacks', 'Chai & Co', 'Main Gate', '🥟'],
 ['Cold coffee', 'coffee', 50, 0, 'New', 0, FOOD, 'Drinks', 'Chai & Co', 'Library', '🧋'], ['Masala dosa', 'dosa', 50, 0, 'New', 0, FOOD, 'Breakfast', 'Campus Bites', 'Cafeteria', '🥞'],
 ['Chocolate brownie', 'brownie', 60, 0, 'New', 0, FOOD, 'Desserts', 'Midnight Munchies', 'Student Center', '🍫'], ['Exam-night combo: maggi + coffee + chips', 'combo', 99, 130, 'New', 0, FOOD, 'Combos', 'Midnight Munchies', 'Hostel Block gate', '🌙'],
 ['Homemade chapati + curry', 'curry', 90, 0, 'New', 1, FOOD, 'Homemade', 'Fatima S.', 'Hostel Block gate', '🍲']]
;(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  await Promise.all([User, Listing, Request].map((m) => m.deleteMany({})))
  const hash = await bcrypt.hash('password123', 10), by = {}
  for (const [name, department, year, community] of people) by[name] = await User.create({ email: name.split(' ')[0].toLowerCase() + '@demo.test', passwordHash: hash, name, department, year, community })
  for (const [name, category] of shops) by[name] = await User.create({ email: name.toLowerCase().replace(/[^a-z]/g, '') + '@shop.demo.test', passwordHash: hash, name, account: 'business', business: { category, description: 'Campus shop on Campus Hustle.', hours: '9am to 6pm' } })
  const me = await User.create({ email: 'student@demo.test', passwordHash: hash, name: 'Aarav', department: 'ECE', year: 2 })
  for (const [title, tag, price, originalPrice, condition, negotiable, category, subcategory, seller, pickup, emoji] of items)
    await Listing.create({ title, tag, price, originalPrice: originalPrice || undefined, condition, negotiable: !!negotiable, category, subcategory, seller: by[seller]._id, campus: 'Demo University', pickup, emoji, expiresAt: new Date(Date.now() + 14 * 864e5) })
  await Request.insertMany([['Casio calculator', 'calculator', 1000, 'Library'], ['Calculator for exams', 'calculator', 800, 'Library'], ['Second-hand cycle', 'cycle', 3000, 'Main Gate'], ['Lab coat', 'coat', 300, 'Academic Block'], ['Late-night maggi', 'maggi', 50, 'Hostel Block gate']]
    .map(([item, tag, budget, pickup]) => ({ item, tag, budget, pickup, requester: me._id, campus: 'Demo University', neededBy: 'Friday' })))
  console.log('Seeded. Log in as student@demo.test / password123 (student) or campusbites@shop.demo.test (business). Women\'s-community demo: ananya@demo.test.'); process.exit(0)
})()
