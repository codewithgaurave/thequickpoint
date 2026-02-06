@echo off
setlocal enabledelayedexpansion

echo === Store Selection Checkout Test ===
echo Testing mobile: 9696559848 with OTP: 123456
echo.

set BASE_URL=http://localhost:5000

REM Step 1: Login
echo Step 1: User Login
curl -s -X POST %BASE_URL%/api/users/verify-otp ^
  -H "Content-Type: application/json" ^
  -d "{\"mobile\": \"9696559848\", \"otp\": \"123456\"}" > login_response.json

echo Login Response:
type login_response.json
echo.

REM Extract User ID (simplified - you may need to parse JSON properly)
for /f "tokens=2 delims=:" %%a in ('findstr "\"id\"" login_response.json') do (
    set USER_ID=%%a
    set USER_ID=!USER_ID:"=!
    set USER_ID=!USER_ID:,=!
    set USER_ID=!USER_ID: =!
)

echo Extracted User ID: !USER_ID!
if "!USER_ID!"=="" (
    echo ERROR: Login failed. Please check if server is running.
    pause
    exit /b 1
)
echo.

REM Step 2: Get Active Stores
echo Step 2: Get Active Stores for Selection
curl -s -X GET "%BASE_URL%/api/orders/stores/active" > stores_response.json
echo Active Stores Response:
type stores_response.json
echo.

REM Step 3: Get Current Cart
echo Step 3: Check Current Cart
curl -s -X GET "%BASE_URL%/api/cart?userId=!USER_ID!" > cart_response.json
echo Current Cart:
type cart_response.json
echo.

REM Step 4: Get Available Products
echo Step 4: Get Available Products
curl -s -X GET "%BASE_URL%/api/products" > products_response.json
echo Available Products Response:
type products_response.json | findstr "_id" | head -5
echo.

REM Step 5: Checkout with Store Selection (using a sample store ID)
echo Step 5: Checkout with Store Selection
echo Note: Replace STORE_ID_HERE with actual store ID from step 2
curl -s -X POST %BASE_URL%/api/orders/checkout-with-store-selection ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\": \"!USER_ID!\", \"selectedStoreId\": \"STORE_ID_HERE\", \"paymentMethod\": \"cod\", \"fullName\": \"Test User\", \"mobile\": \"9696559848\", \"email\": \"test@example.com\", \"addressLine1\": \"123 Test Street\", \"city\": \"Test City\", \"state\": \"Test State\", \"pincode\": \"123456\", \"country\": \"India\", \"notes\": \"Test order with store selection\"}" > checkout_response.json

echo Checkout Response:
type checkout_response.json
echo.

REM Step 6: Get User Orders
echo Step 6: Get User Orders
curl -s -X GET "%BASE_URL%/api/orders/my?userId=!USER_ID!" > orders_response.json
echo User Orders:
type orders_response.json
echo.

echo === Manual Testing Commands ===
echo.
echo 1. Login:
echo curl -X POST %BASE_URL%/api/users/verify-otp -H "Content-Type: application/json" -d "{\"mobile\": \"9696559848\", \"otp\": \"123456\"}"
echo.
echo 2. Get Active Stores:
echo curl -X GET "%BASE_URL%/api/orders/stores/active"
echo.
echo 3. Get Cart:
echo curl -X GET "%BASE_URL%/api/cart?userId=!USER_ID!"
echo.
echo 4. Checkout with Store Selection:
echo curl -X POST %BASE_URL%/api/orders/checkout-with-store-selection -H "Content-Type: application/json" -d "{\"userId\": \"!USER_ID!\", \"selectedStoreId\": \"YOUR_STORE_ID\", \"paymentMethod\": \"cod\", \"fullName\": \"Test User\", \"mobile\": \"9696559848\", \"email\": \"test@example.com\", \"addressLine1\": \"123 Test Street\", \"city\": \"Test City\", \"state\": \"Test State\", \"pincode\": \"123456\", \"country\": \"India\"}"
echo.
echo 5. Get Orders:
echo curl -X GET "%BASE_URL%/api/orders/my?userId=!USER_ID!"
echo.

REM Cleanup
del login_response.json stores_response.json cart_response.json products_response.json checkout_response.json orders_response.json 2>nul

echo === Test Complete ===
pause