const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Adjust path if needed
require('dotenv').config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = new User({
    username: 'admin',
    email: 'admin@nexus.com',
    password: hashedPassword,
    role: 'admin'
  });

  await admin.save();
  console.log("✅ Admin user added to Database!");
  process.exit();
};

seed();