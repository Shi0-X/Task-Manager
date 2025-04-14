### Hexlet tests and linter status:
 [![Actions Status](https://github.com/Shi0-X/fullstack-javascript-project-141/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Shi0-X/fullstack-javascript-project-141/actions)

# 🗂️ Task Manager

**Task Manager** es una aplicación web que Permite gestionar tareas de manera colaborativa, con funcionalidades como registro de usuarios, asignación de responsables, definición de estados y filtrado avanzado.

Este proyecto refleja una arquitectura backend moderna, utilizando Fastify, PostgreSQL, autenticación y enrutamiento limpio. Está preparado para escalar y seguir buenas prácticas de DevOps y despliegue continuo.

---

## 🚀 Enlace a la aplicación

🌐 [Ver Task Manager en Render](https://task-manager-bvbg.onrender.com/)

---

## 🛠️ Tecnologías utilizadas

- **Node.js**
- **Fastify**
- **PostgreSQL**
- **Knex.js**
- **Pug (para vistas)**
- **Passport.js (autenticación)**
- **dotenv**
- **Render (despliegue en producción)**
- **Jest (pruebas automatizadas)**

## Instalacion y uso local

# Clona el proyecto
git clone https://github.com/tu-usuario/task-manager.git
cd task-manager

# Instala dependencias
npm install

# Crea un archivo .env basado en .env.example
cp .env.example .env

# Inicia el servidor en desarrollo
npm run dev

# Accede en tu navegador
http://localhost:3000