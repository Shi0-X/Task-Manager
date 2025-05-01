# Makefile (cross-platform)

# Default shell for make (use node for scripting)
SHELL := "$(shell which node)"

setup: prepare install db-migrate

install:
	npm install

# Run database migrations
db-migrate:
	npx knex migrate:latest --knexfile knexfile.js

# Build assets
build:
	npm run build

# Prepare environment file (cross-platform)
prepare:
	node -e "const fs = require('fs'); if (!fs.existsSync('.env')) fs.copyFileSync('.env.example', '.env');"

# Start backend and frontend (adjust as needed)
start:
	npm start

start-backend:
	npm run dev

start-frontend:
	npm run build -- --watch

lint:
	npm run lint

test:
	npm test -s
