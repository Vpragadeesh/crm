#!/bin/bash

echo "================================================================================"
echo "  GOOGLE OAUTH CONFIGURATION VERIFICATION"
echo "================================================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check backend .env
echo "📋 Checking Backend Configuration..."
echo ""

if [ ! -f "/home/pragadeesh/crm/backend/.env" ]; then
    echo -e "${RED}❌ Backend .env file NOT FOUND${NC}"
    exit 1
fi

# Check GOOGLE_CLIENT_ID
if grep -q "^GOOGLE_CLIENT_ID=" /home/pragadeesh/crm/backend/.env; then
    CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" /home/pragadeesh/crm/backend/.env | cut -d'=' -f2)
    if [ -n "$CLIENT_ID" ]; then
        echo -e "${GREEN}✅ GOOGLE_CLIENT_ID is set${NC}"
        echo "   Value: ${CLIENT_ID:0:20}..."
    else
        echo -e "${RED}❌ GOOGLE_CLIENT_ID is empty${NC}"
    fi
else
    echo -e "${RED}❌ GOOGLE_CLIENT_ID is missing${NC}"
fi

# Check GOOGLE_CLIENT_SECRET
if grep -q "^GOOGLE_CLIENT_SECRET=" /home/pragadeesh/crm/backend/.env; then
    CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" /home/pragadeesh/crm/backend/.env | cut -d'=' -f2)
    if [ -n "$CLIENT_SECRET" ]; then
        echo -e "${GREEN}✅ GOOGLE_CLIENT_SECRET is set${NC}"
        echo "   Value: ${CLIENT_SECRET:0:10}... (hidden)"
    else
        echo -e "${RED}❌ GOOGLE_CLIENT_SECRET is empty${NC}"
    fi
else
    echo -e "${RED}❌ GOOGLE_CLIENT_SECRET is missing${NC}"
fi

# Check GOOGLE_REDIRECT_URI
if grep -q "^GOOGLE_REDIRECT_URI=" /home/pragadeesh/crm/backend/.env; then
    REDIRECT_URI=$(grep "^GOOGLE_REDIRECT_URI=" /home/pragadeesh/crm/backend/.env | cut -d'=' -f2)
    if [ -n "$REDIRECT_URI" ]; then
        echo -e "${GREEN}✅ GOOGLE_REDIRECT_URI is set${NC}"
        echo "   Value: $REDIRECT_URI"
    else
        echo -e "${RED}❌ GOOGLE_REDIRECT_URI is empty${NC}"
    fi
else
    echo -e "${RED}❌ GOOGLE_REDIRECT_URI is missing${NC}"
fi

echo ""
echo "📋 Checking Frontend Configuration..."
echo ""

# Check frontend .env
if [ ! -f "/home/pragadeesh/crm/frontend/.env" ]; then
    echo -e "${RED}❌ Frontend .env file NOT FOUND${NC}"
    echo -e "${YELLOW}💡 Creating frontend .env file...${NC}"
    
    cat > /home/pragadeesh/crm/frontend/.env << 'EOF'
# =====================================================
# CRM Frontend Environment Variables
# =====================================================

# Backend API URL
VITE_API_URL=http://localhost:3000/api

# Google OAuth Client ID (for frontend Google Sign-In)
VITE_GOOGLE_CLIENT_ID=524949519880-4u1hto3g5s54383rcb6pvo7dvtjl6vir.apps.googleusercontent.com

# LiveKit URL fallback (used if backend call-token response has no livekitUrl)
VITE_LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
EOF
    
    echo -e "${GREEN}✅ Frontend .env file created${NC}"
fi

# Check VITE_GOOGLE_CLIENT_ID
if grep -q "^VITE_GOOGLE_CLIENT_ID=" /home/pragadeesh/crm/frontend/.env; then
    VITE_CLIENT_ID=$(grep "^VITE_GOOGLE_CLIENT_ID=" /home/pragadeesh/crm/frontend/.env | cut -d'=' -f2)
    if [ -n "$VITE_CLIENT_ID" ]; then
        echo -e "${GREEN}✅ VITE_GOOGLE_CLIENT_ID is set${NC}"
        echo "   Value: ${VITE_CLIENT_ID:0:20}..."
    else
        echo -e "${RED}❌ VITE_GOOGLE_CLIENT_ID is empty${NC}"
    fi
else
    echo -e "${RED}❌ VITE_GOOGLE_CLIENT_ID is missing${NC}"
fi

echo ""
echo "================================================================================"
echo "  VERIFICATION COMPLETE"
echo "================================================================================"
echo ""

# Check if both client IDs match
if [ "$CLIENT_ID" = "$VITE_CLIENT_ID" ]; then
    echo -e "${GREEN}✅ Backend and Frontend Client IDs MATCH${NC}"
else
    echo -e "${YELLOW}⚠️  Backend and Frontend Client IDs DO NOT MATCH${NC}"
    echo "   Backend:  $CLIENT_ID"
    echo "   Frontend: $VITE_CLIENT_ID"
fi

echo ""
echo "📝 Next Steps:"
echo "   1. Restart backend:  cd backend && npm run dev"
echo "   2. Restart frontend: cd frontend && npm run dev"
echo "   3. Test login at:    http://localhost:5173/login"
echo ""
