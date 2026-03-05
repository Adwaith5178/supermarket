const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String },
    wholesalePrice: { type: Number, required: true }, 
    basePrice: { type: Number, required: true },      
    currentPrice: { type: Number },
    stockLevel: { type: Number, required: true },
    unitsSold: { type: Number, default: 0 },         
    expiryDate: { type: Date, required: true },
    salesVelocity: { type: Number, default: 0 },
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true },
    
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
    } // The timestamp used to calculate the 24-hour expiry
});

module.exports = mongoose.model('Product', ProductSchema);