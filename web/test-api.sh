#!/bin/bash

API_URL="http://localhost:3001"
EMAIL="test\$(date +%s)@example.com"
PASSWORD="testpassword123"

echo "Testing ZigZag API"
echo "================="
echo ""

# Health check
echo "1. Health Check"
curl -s \$API_URL/health | python3 -m json.tool
echo ""

# Register
echo "2. Register User"
REGISTER_RESPONSE=\$(curl -s -X POST \$API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\\"email\\":\\"\$EMAIL\\",\\"password\\":\\"\$PASSWORD\\",\\"name\\":\\"Test User\\"}")
echo \$REGISTER_RESPONSE | python3 -m json.tool
TOKEN=\$(echo \$REGISTER_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")
echo "Token: \$TOKEN"
echo ""

# Login
echo "3. Login User"
LOGIN_RESPONSE=\$(curl -s -X POST \$API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\\"email\\":\\"\$EMAIL\\",\\"password\\":\\"\$PASSWORD\\"}")
echo \$LOGIN_RESPONSE | python3 -m json.tool
echo ""

# Verify token
echo "4. Verify Token"
curl -s -X GET \$API_URL/api/auth/verify \
  -H "Authorization: Bearer \$TOKEN" | python3 -m json.tool
echo ""

# Create space
echo "5. Create Space"
SPACE_RESPONSE=\$(curl -s -X POST \$API_URL/api/spaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer \$TOKEN" \
  -d "{\\"name\\":\\"Test Space\\",\\"description\\":\\"A test ZigZag space\\"}")
echo \$SPACE_RESPONSE | python3 -m json.tool
SPACE_ID=\$(echo \$SPACE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "Space ID: \$SPACE_ID"
echo ""

# Get spaces
echo "6. Get User Spaces"
curl -s -X GET \$API_URL/api/spaces \
  -H "Authorization: Bearer \$TOKEN" | python3 -m json.tool
echo ""

# Create cell
echo "7. Create Cell"
CELL_RESPONSE=\$(curl -s -X POST \$API_URL/api/spaces/\$SPACE_ID/cells \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer \$TOKEN" \
  -d "{\\"content\\":\\"Test cell content\\",\\"metadata\\":{\\"type\\":\\"text\\"},\\"position\\":{\\"x\\":0,\\"y\\":0}}")
echo \$CELL_RESPONSE | python3 -m json.tool
CELL_ID=\$(echo \$CELL_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "Cell ID: \$CELL_ID"
echo ""

# Get cells
echo "8. Get Space Cells"
curl -s -X GET \$API_URL/api/spaces/\$SPACE_ID/cells \
  -H "Authorization: Bearer \$TOKEN" | python3 -m json.tool
echo ""

echo "All API tests completed!"
