#!/usr/bin/env python3
"""
Script para limpiar completamente la base de datos y ejecutar seeders
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine, Base
from sqlalchemy import text

def reset_database():
    """Elimina todas las tablas y recrea el esquema"""
    print("🗑️  Limpiando base de datos...")
    
    try:
        # Eliminar todas las tablas
        Base.metadata.drop_all(bind=engine)
        print("✅ Todas las tablas eliminadas")
        
        # Recrear todas las tablas
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas recreadas")
        
    except Exception as e:
        print(f"❌ Error al limpiar base de datos: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    if reset_database():
        print("\n✅ Base de datos limpiada exitosamente")
        print("📝 Ahora ejecuta: python -m app.seeders.seed_data")
    else:
        print("\n❌ Error al limpiar la base de datos")
        sys.exit(1)
