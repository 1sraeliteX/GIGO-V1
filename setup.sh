#!/bin/bash

# Tradora cPanel Setup Script
# Run this in cPanel Terminal

echo "=== Tradora Setup ==="
echo ""

# Navigate to subdomain document root
cd /home/wealthal/tradora.wealthallianceinvestments.com || {
    echo "ERROR: Directory not found. Check the path."
    exit 1
}

echo "Current directory: $(pwd)"
echo ""

# 1. Set permissions on cache folder
echo "1. Setting cache/ permissions to 755..."
chmod 755 cache/
echo "   Done."
echo ""

# 2. Verify .env exists
echo "2. Checking config/.env..."
if [ ! -f config/.env ]; then
    echo "   ERROR: config/.env not found!"
    exit 1
fi
echo "   Found."
echo ""

# 3. Run migrations
echo "3. Running database migrations..."
php migrate.php up
echo ""

# 4. Create admin user
echo "4. Creating admin user..."
php create-admin.php
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Visit: https://tradora.wealthallianceinvestments.com"
echo ""
echo "IMPORTANT: Delete migrate.php and create-admin.php for security:"
echo "  rm migrate.php create-admin.php"
