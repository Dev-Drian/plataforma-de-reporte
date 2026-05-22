"""
Script para inicializar la base de datos
Ejecuta migraciones y seeders en orden
Uso: python scripts/init_db.py
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from alembic.config import Config
from alembic import command
from app.seeders.seed_data import run_seeders
from app.core.config import settings


def run_migrations():
    """Ejecuta las migraciones de Alembic"""
    print("=" * 60)
    print("🔄 Running database migrations...")
    print("=" * 60)
    
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    
    try:
        command.upgrade(alembic_cfg, "head")
        print("✅ Migrations completed successfully!\n")
    except Exception as e:
        print(f"❌ Error running migrations: {str(e)}")
        raise


def main():
    """Función principal"""
    print(f"📊 Database URL: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'N/A'}\n")
    
    try:
        # Ejecutar migraciones
        run_migrations()
        
        # Ejecutar seeders
        run_seeders()
        
        print("\n" + "=" * 60)
        print("🎉 Database initialization completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during database initialization: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()

