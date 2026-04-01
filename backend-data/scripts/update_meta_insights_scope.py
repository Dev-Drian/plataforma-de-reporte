"""Script para actualizar los scopes de Meta OAuth con read_insights"""
import json
from app.core.database import SessionLocal
from app.models import OAuthConfig

def main():
    db = SessionLocal()
    try:
        config = db.query(OAuthConfig).filter(OAuthConfig.platform == 'meta').first()
        
        if not config:
            print("❌ No se encontró configuración de Meta OAuth")
            return
        
        # Scopes correctos para Facebook Ads
        new_scopes = [
            "ads_read",              # Leer anuncios y métricas
            "ads_management",        # Gestionar anuncios
            "business_management",   # Acceso a Business Manager
            "pages_show_list",       # Listar páginas
            "pages_read_engagement", # Leer contenido de páginas
            "read_insights"          # CRÍTICO: Leer insights/métricas de Ads
        ]
        
        config.scopes = json.dumps(new_scopes)
        db.commit()
        
        print("✅ Scopes actualizados exitosamente")
        print(f"   Nuevos scopes: {new_scopes}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
