#!/bin/bash
# Script para ejecutar el seeder de desarrollo
# Actualiza los callbacks OAuth según FRONTEND_URL configurado

echo "🌱 Ejecutando seeder de desarrollo..."
echo "📍 FRONTEND_URL será usado para configurar callbacks OAuth"
echo ""

python -m app.seeders.seed_dev
