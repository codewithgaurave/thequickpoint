# Store Selection Checkout Testing Guide

## Overview
This guide demonstrates the new store selection functionality where users can:
1. Add items to cart (both global and store-specific)
2. Select any store during checkout
3. Place order with selected store

## Prerequisites
- Server running on localhost:5000
- User mobile: 9696559848
- OTP: 123456

## Step 1: User Login

### Request Login OTP
```bash
curl -X POST http://localhost:5000/api/users/request-otp/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9696559848"
  }'
```

### Verify OTP and Get Token
```bash
curl -X POST http://localhost:5000/api/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9696559848",
    "otp": "123456"
  }'
```

**Save the userId from response for next steps**

## Step 2: Get Available Stores

### Get Active Stores for Selection
```bash
curl -X GET "http://localhost:5000/api/orders/stores/active"
```

**Save a storeId from response for checkout**

## Step 3: Add Items to Cart

### Add Product to Cart (Example)
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "productId": "PRODUCT_ID_HERE",
    "quantity": 2
  }'
```

### Get Cart Contents
```bash
curl -X GET "http://localhost:5000/api/cart?userId=YOUR_USER_ID_HERE"
```

## Step 4: Checkout with Store Selection

### Method 1: Checkout with Store Selection (New Feature)
This allows selecting any store for the entire cart regardless of individual item store assignments.

```bash
curl -X POST http://localhost:5000/api/orders/checkout-with-store-selection \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "selectedStoreId": "SELECTED_STORE_ID_HERE",
    "paymentMethod": "cod",
    "fullName": "Test User",
    "mobile": "9696559848",
    "email": "test@example.com",
    "addressLine1": "123 Test Street",
    "city": "Test City",
    "state": "Test State",
    "pincode": "123456",
    "country": "India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "notes": "Test order with store selection"
  }'
```

### Method 2: Traditional Store-Specific Checkout
```bash
curl -X POST http://localhost:5000/api/orders/store/STORE_ID_HERE/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID_HERE",
    "paymentMethod": "cod",
    "fullName": "Test User",
    "mobile": "9696559848",
    "email": "test@example.com",
    "addressLine1": "123 Test Street",
    "city": "Test City",
    "state": "Test State",
    "pincode": "123456",
    "country": "India"
  }'
```

## Step 5: Verify Order

### Get User Orders
```bash
curl -X GET "http://localhost:5000/api/orders/my?userId=YOUR_USER_ID_HERE"
```

### Get Store-Specific Orders
```bash
curl -X GET "http://localhost:5000/api/orders/my/store/STORE_ID_HERE?userId=YOUR_USER_ID_HERE"
```

## Complete Test Script

Replace placeholders and run:

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Store Selection Checkout Test ===${NC}"

# Step 1: Login
echo -e "${GREEN}Step 1: User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9696559848",
    "otp": "123456"
  }')

USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "User ID: $USER_ID"

if [ -z "$USER_ID" ]; then
  echo -e "${RED}Login failed. Please check credentials.${NC}"
  exit 1
fi

# Step 2: Get Active Stores
echo -e "${GREEN}Step 2: Get Active Stores${NC}"
STORES_RESPONSE=$(curl -s -X GET "http://localhost:5000/api/orders/stores/active")
echo "Active Stores Response:"
echo $STORES_RESPONSE | jq '.'

# Extract first store ID (you may need to adjust this based on your data)
STORE_ID=$(echo $STORES_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Selected Store ID: $STORE_ID"

if [ -z "$STORE_ID" ]; then
  echo -e "${RED}No active stores found. Please create a store first.${NC}"
  exit 1
fi

# Step 3: Get Cart
echo -e "${GREEN}Step 3: Get Cart Contents${NC}"
CART_RESPONSE=$(curl -s -X GET "http://localhost:5000/api/cart?userId=$USER_ID")
echo "Cart Response:"
echo $CART_RESPONSE | jq '.'

# Step 4: Checkout with Store Selection
echo -e "${GREEN}Step 4: Checkout with Store Selection${NC}"
CHECKOUT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/orders/checkout-with-store-selection \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"selectedStoreId\": \"$STORE_ID\",
    \"paymentMethod\": \"cod\",
    \"fullName\": \"Test User\",
    \"mobile\": \"9696559848\",
    \"email\": \"test@example.com\",
    \"addressLine1\": \"123 Test Street\",
    \"city\": \"Test City\",
    \"state\": \"Test State\",
    \"pincode\": \"123456\",
    \"country\": \"India\",
    \"latitude\": 28.6139,
    \"longitude\": 77.2090,
    \"notes\": \"Test order with store selection\"
  }")

echo "Checkout Response:"
echo $CHECKOUT_RESPONSE | jq '.'

# Step 5: Verify Orders
echo -e "${GREEN}Step 5: Get User Orders${NC}"
ORDERS_RESPONSE=$(curl -s -X GET "http://localhost:5000/api/orders/my?userId=$USER_ID")
echo "Orders Response:"
echo $ORDERS_RESPONSE | jq '.'

echo -e "${YELLOW}=== Test Complete ===${NC}"
```

## Key Features Tested

1. **Store Selection During Checkout**: Users can select any active store during checkout
2. **Mixed Cart Handling**: Cart can contain both global and store-specific items
3. **Store Assignment**: All items in the order get assigned to the selected store
4. **SMS Notifications**: Order confirmation SMS with collection OTP
5. **Payment Integration**: COD payment handling with automatic cart clearing

## Expected Behavior

- Cart items (regardless of original store assignment) get ordered to selected store
- Order gets assigned to selected store
- SMS notification sent with collection OTP
- Cart gets cleared after successful COD order
- Store manager receives order for their store

## Error Scenarios Tested

- Invalid store selection
- Empty cart checkout
- Invalid user ID
- Inactive store selection
- Missing required fields