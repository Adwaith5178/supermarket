const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String },
    wholesalePrice: { type: Number, required: true }, 
    basePrice: { type: Number, required: true },      
    currentPrice: { type: Number },
    stockLevel: { type: Number, required: true },
    unitsSold: { type: Number, default: 0 },         
    
    // Will automatically parse 'YYYY-MM-DD' from CSV
    expiryDate: { type: Date, required: true }, 
    
    salesVelocity: { type: Number, default: 0 },
    
    // IMPORTANT: Because these are required, your CSV MUST have these columns
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true },
    
    // --- NEW IMAGE FIELD ---
    image: { 
        type: String, 
        default: 'default-grocery.png' // This will store the image URL from your CSV
    },
    
    // --- NEW FESTIVE STRATEGY FIELDS ---
    isFestive: { 
        type: Boolean, 
        default: false 
    }, 
    
    festivalEndDate: { 
        type: Date 
    },

    // --- NEW WEDNESDAY MANIA FIELDS ---
    isOnMania: { 
        type: Boolean, 
        default: false 
    }, // Marks if the product is currently in the 24h flash sale

    maniaDiscount: { 
        type: Number, 
        default: 0 
    }, // The manual percentage discount set by Admin

    maniaActivatedAt: { 
        type: Date 
    }, // The timestamp used to calculate the 24-hour expiry

    // --- NEW LOYALTY & POINTS FIELDS ---
    pointsMultiplier: {
        type: Number,
        default: 1
    }, // Example: Set to 2 to offer "Double Points" on specific products

    eligibleForPointsRedemption: {
        type: Boolean,
        default: true
    }, // Set to false if you do NOT want customers using points to buy this specific item

    pointsPrice: {
        type: Number,
        default: 0
    } // Optional: Set a hard point price (e.g., "Buy this item for 200 points instead of cash")
});

module.exports = mongoose.model('Product', ProductSchema);