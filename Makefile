# Makefile

# Preparar archivos de configuración iniciales - Compatible con Windows y Linux
prepare:
	npm run prepare:env

# 1) Preparar el .env y dependencias, luego migrar la BD
setup: prepare install db-migrate

install:
	npm install

db-migrate:
	npm run db:migrate

# 2) Compilar assets con webpack
build:
	npm run build

# 3) Levantar la app en producción
start:
	npm start

# Limpieza de build
clean:
	npm run clean

# Testing
test:
	npm test

# Regla .PHONY para declarar objetivos que no son archivos
.PHONY: prepare setup install db-migrate build start clean test