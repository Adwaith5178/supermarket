import sys
import json
from datetime import datetime

def calculate_price():
    try:
        # 1. Read the product JSON from Node.js
        product = json.loads(sys.argv[1])
        
        base_price = product['basePrice']
        stock_level = product.get('stockLevel', 100) # Default to 100 if not provided
        
        # 2. Extract date
        expiry_date_str = product['expiryDate'].split('T')[0]
        expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d')
        
        # 3. Calculate days left (Dynamic today)
        today = datetime.now()
        days_left = (expiry_date - today).days
        
        # Initialize discount factors
        time_discount = 1.0
        stock_discount = 1.0

        # 4. AI Pricing Logic - Time Trigger
        if days_left <= 3:
            time_discount = 0.70  # 30% OFF
        elif days_left <= 10:     # Increased to 10 to match your React filter
            time_discount = 0.90  # 10% OFF

        # 5. AI Pricing Logic - Stock Trigger (NEW)
        # If stock is low, apply an additional 5% clearance discount
        if 0 < stock_level <= 5:
            stock_discount = 0.95 

        # Apply the best discount found
        final_discount = min(time_discount, stock_discount)
        new_price = base_price * final_discount

        # 6. Output ONLY the number so Node.js can parse it
        print(round(new_price, 2))
        
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)

if __name__ == "__main__":
    calculate_price()