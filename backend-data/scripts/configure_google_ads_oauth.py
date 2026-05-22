"""
Script para configurar OAuth de Google Ads
Configura los datos de OAuth y Developer Token para Google Ads API

Uso: python scripts/configure_google_ads_oauth.py
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import OAuthConfig, OAuthProvider, Organization
import json

# Datos de configuración
OAUTH_CONFIG = {
    "client_id": "1089121468667-7hnk5tql2pe2gur6vrvogvrqgr53qqp7.apps.googleusercontent.com",
    "client_secret": "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",
    "redirect_uri": "http://localhost:3000/oauth/callback",
    "developer_token": "1iLDTpzJ31nqo4u-G42t1g",
    "scopes": [
        "https://www.googleapis.com/auth/adwords"
    ]
}


def configure_google_ads_oauth(db: Session, organization_id: int = None):
    """
    Configura OAuth para Google Ads
    
    Args:
        db: Sesión de base de datos
        organization_id: ID de la organización (si None, usa la primera disponible)
    """
    print("=" * 60)
    print("🔧 Configurando OAuth de Google Ads...")
    print("=" * 60)
    
    # Obtener organización
    if organization_id:
        organization = db.query(Organization).filter(Organization.id == organization_id).first()
        if not organization:
            print(f"❌ Organización con ID {organization_id} no encontrada")
            return False
    else:
        # Usar la primera organización disponible
        organization = db.query(Organization).filter(Organization.is_active == True).first()
        if not organization:
            print("❌ No se encontró ninguna organización activa")
            print("   Por favor, ejecuta primero los seeders: python scripts/init_db.py")
            return False
    
    print(f"📋 Organización: {organization.name} (ID: {organization.id})")
    
    # Obtener OAuth Provider de Google
    provider = db.query(OAuthProvider).filter(
        OAuthProvider.name == "google",
        OAuthProvider.is_active == True
    ).first()
    
    if not provider:
        print("❌ OAuth Provider de Google no encontrado")
        print("   Por favor, ejecuta primero los seeders: python scripts/init_db.py")
        return False
    
    print(f"📋 Provider: {provider.display_name} (ID: {provider.id})")
    
    # Verificar si ya existe configuración
    existing_config = db.query(OAuthConfig).filter(
        OAuthConfig.organization_id == organization.id,
        OAuthConfig.platform == "google"
    ).first()
    
    if existing_config:
        print(f"\n⚠️  Ya existe una configuración OAuth para Google")
        print(f"   ID: {existing_config.id}")
        print(f"   Actualizando configuración existente...")
        
        # Actualizar configuración existente
        existing_config.client_id = OAUTH_CONFIG["client_id"]
        existing_config.client_secret = OAUTH_CONFIG["client_secret"]
        existing_config.redirect_uri = OAUTH_CONFIG["redirect_uri"]
        existing_config.scopes = json.dumps(OAUTH_CONFIG["scopes"])
        existing_config.developer_token = OAUTH_CONFIG["developer_token"]
        existing_config.is_active = True
        existing_config.provider_id = provider.id
        
        db.commit()
        db.refresh(existing_config)
        
        print("✅ Configuración OAuth actualizada exitosamente")
        print_config_details(existing_config)
        return True
    else:
        print(f"\n➕ Creando nueva configuración OAuth...")
        
        # Crear nueva configuración
        new_config = OAuthConfig(
            organization_id=organization.id,
            provider_id=provider.id,
            platform="google",
            client_id=OAUTH_CONFIG["client_id"],
            client_secret=OAUTH_CONFIG["client_secret"],
            redirect_uri=OAUTH_CONFIG["redirect_uri"],
            scopes=json.dumps(OAUTH_CONFIG["scopes"]),
            developer_token=OAUTH_CONFIG["developer_token"],
            is_active=True
        )
        
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        
        print("✅ Configuración OAuth creada exitosamente")
        print_config_details(new_config)
        return True


def print_config_details(config: OAuthConfig):
    """Imprime los detalles de la configuración"""
    scopes = json.loads(config.scopes) if config.scopes else []
    
    print("\n" + "-" * 60)
    print("📝 Detalles de la configuración:")
    print("-" * 60)
    print(f"ID: {config.id}")
    print(f"Organización ID: {config.organization_id}")
    print(f"Platform: {config.platform}")
    print(f"Client ID: {config.client_id[:50]}...")
    print(f"Client Secret: {'*' * 20}...")
    print(f"Redirect URI: {config.redirect_uri}")
    print(f"Developer Token: {config.developer_token[:20]}...")
    print(f"Scopes: {', '.join(scopes)}")
    print(f"Estado: {'✅ Activo' if config.is_active else '❌ Inactivo'}")
    print("-" * 60)


def main():
    """Función principal"""
    db = SessionLocal()
    
    try:
        success = configure_google_ads_oauth(db)
        
        if success:
            print("\n" + "=" * 60)
            print("🎉 Configuración completada exitosamente!")
            print("=" * 60)
            print("\n📌 Próximos pasos:")
            print("1. La configuración OAuth está lista para usar")
            print("2. Los usuarios pueden conectar sus cuentas de Google Ads")
            print("3. Usa POST /api/oauth/init para iniciar el flujo OAuth")
        else:
            print("\n❌ Error al configurar OAuth")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()



