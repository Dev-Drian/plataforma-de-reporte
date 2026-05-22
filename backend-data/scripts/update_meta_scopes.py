"""
Script para actualizar los scopes de Meta OAuth
Ejecutar con: docker exec marketing-seo-backend-data-dev python scripts/update_meta_scopes.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models import OAuthConfig
import json

def update_meta_scopes():
    """Actualiza los scopes de Meta Ads para incluir todos los permisos necesarios"""
    db = SessionLocal()
    try:
        # Buscar configuración de Meta
        meta_config = db.query(OAuthConfig).filter(
            OAuthConfig.platform == "meta"
        ).first()
        
        if not meta_config:
            print("❌ No se encontró configuración OAuth para Meta")
            return
        
        # Scopes actualizados con todos los permisos necesarios
        new_scopes = [
            "ads_read",
            "ads_management", 
            "business_management",
            "pages_show_list",
            "pages_read_engagement",
            "read_insights"  # IMPORTANTE: Necesario para leer insights
        ]
        
        meta_config.scopes = json.dumps(new_scopes)
        db.commit()
        
        print(f"✅ Scopes de Meta actualizados:")
        print(f"   {', '.join(new_scopes)}")
        print(f"\n⚠️  IMPORTANTE:")
        print(f"   1. Ve a https://developers.facebook.com/apps/{meta_config.client_id}/settings/basic/")
        print(f"   2. En 'App Domains' agrega: localhost")
        print(f"   3. En 'Valid OAuth Redirect URIs' verifica: http://localhost:3000/oauth/callback")
        print(f"   4. En la pestaña 'App Review' > 'Permissions and Features':")
        print(f"      - Solicita aprobación para: ads_read, ads_management")
        print(f"      - O cambia el modo de la app a 'Live' (Development mode solo permite tus cuentas)")
        print(f"\n📋 Permisos necesarios:")
        print(f"   - ads_read: Leer datos de anuncios")
        print(f"   - ads_management: Gestionar anuncios")
        print(f"   - business_management: Gestionar cuentas empresariales")
        print(f"   - read_insights: Leer insights/métricas (CRÍTICO)")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_meta_scopes()
