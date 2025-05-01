# Makefile

# 1) Preparar el .env y dependencies, luego migrar la BD
setup: prepare install db-migrate

install:
	npm install

db-migrate:
	npx knex migrate:latest --knexfile knexfile.js

# 2) Si necesitas compilar assets con webpack, lo metes aquí
build:
	npm run build

# 3) Levantar la app en producción (Render invocará `make start`)
start:
	npm start

# Limpieza de build
clean:
	rm -rf dist

# Testing
test:
	cross-env NODE_ENV=test SQLITE_MEMORY=true jest --verbose --runInBand
