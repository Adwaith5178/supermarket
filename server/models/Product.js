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
    }, // Checkbox to mark specific items for hike
    
    festivalEndDate: { 
        type: Date 
    } // The date after which the price starts dropping
});

module.exports = mongoose.model('Product', ProductSchema);