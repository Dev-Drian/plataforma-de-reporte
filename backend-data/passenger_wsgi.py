"""
Passenger WSGI file for cPanel deployment
This file is required for Python applications in cPanel
"""
import sys
import os

# Agregar el directorio actual al path
sys.path.insert(0, os.path.dirname(__file__))

# Importar la aplicación FastAPI
from main import app

# Passenger espera una variable 'application'
application = app
