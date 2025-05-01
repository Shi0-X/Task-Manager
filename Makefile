# Makefile

SHELL := cmd.exe

# 1) Preparar el entorno: copiar .env.example → .env si no existe
prepare:
	@node -e "const fs = require('fs'); if (!fs.existsSync('.env')) fs.copyFileSync('.env.example', '.env');"

# 2) Instalar dependencias
install:
	npm install

# 3) Ejecutar migraciones de la base de datos
db-migrate:
	npx knex migrate:latest --knexfile knexfile.js

# Tarea que engloba los pasos de preparación, instalación y migración
setup: prepare install db-migrate

# 4) Compilar los assets con Webpack
build:
	npm run build

# 5) Levantar la aplicación
start:
	npm start

# 6) Levantar sólo el backend con watch (requiere script apropiado en package.json)
watch-backend:
	npm run start -- --watch --verbose-watch --ignore-watch="node_modules .git .sqlite"

# 7) Levantar sólo el frontend con watch
watch-frontend:
	npx webpack --watch --progress

# 8) Lint
lint:
	npx eslint .

# 9) Tests
test:
	npm test -s
