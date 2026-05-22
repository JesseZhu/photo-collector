#!/bin/sh
set -e

# Fix permissions for volume-mounted directories (host ownership overrides Dockerfile)
mkdir -p /app/data /app/uploads
chown -R nextjs:nodejs /app/data /app/uploads

# Drop privileges and run the app
exec su -s /bin/sh nextjs -c "node /app/server.js"
