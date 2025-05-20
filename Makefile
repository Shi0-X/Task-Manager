setup: prepare install db-migrate
install:
	npm install
prepare:
	cp -n .env.example .env || true
db-migrate:
	npx knex migrate:latest
build:
	npm run build
start-backend:
	npm start -- --watch --verbose-watch --ignore-watch='node_modules .git .sqlite'
start-frontend:
	npx webpack --watch --progress
start:
	heroku local -f Procfile.dev
test:
	npm test -s
test-coverage:
	npm test -- --coverage
lint:
	npx eslint .

# Regla .PHONY para declarar objetivos que no son archivos
.PHONY: setup install prepare db-migrate build start-backend start-frontend start test test-coverage lint