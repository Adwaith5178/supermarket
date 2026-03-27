const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true }, // Added for password change logic
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    
    // --- NEW LOYALTY SYSTEM FIELDS ---
    loyaltyPoints: { 
        type: Number, 
        default: 0, // Updated to 0 so new users start with zero points
        min: 0        // CRITICAL: Prevents points from ever dropping below zero in the database
    },
    
    // --- EXISTING FIELDS ---
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);