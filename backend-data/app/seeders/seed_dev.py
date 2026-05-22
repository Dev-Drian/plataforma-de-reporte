"""
Seeder específico para desarrollo
Usa variables de entorno para configurar callbacks OAuth según el entorno
Ejecutar con: python -m app.seeders.seed_dev
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.config import settings
from app.models import Organization, OAuthProvider, OAuthConfig
import json


def seed_dev_oauth_configs(db: Session):
    """Crea/actualiza configuraciones OAuth para desarrollo usando FRONTEND_URL"""
    print("🌱 Seeding OAuth configs for DEV...")
    
    # Obtener URL base del frontend desde configuración
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    print(f"  📍 Using FRONTEND_URL: {frontend_url}")
    
    # Obtener la primera organización
    org = db.query(Organization).first()
    if not org:
        print("  ⚠ No organizations found. Please run main seeders first.")
        return
    
    # Obtener providers
    google_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "google").first()
    meta_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "meta").first()
    linkedin_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "linkedin").first()
    tiktok_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "tiktok").first()
    
    # Configuración OAuth de Google
    if google_provider:
        oauth_config_data = {
            "organization_id": org.id,
            "provider_id": google_provider.id,
            "platform": "google",
            "client_id": settings.GOOGLE_CLIENT_ID or "1089121468667-7hnk5tql2pe2gur6vrvogvrqgr53qqp7.apps.googleusercontent.com",
            "client_secret": settings.GOOGLE_CLIENT_SECRET or "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",
            "redirect_uri": f"{frontend_url}/oauth/callback",
            "scopes": json.dumps([
                "https://www.googleapis.com/auth/adwords",
                "https://www.googleapis.com/auth/webmasters.readonly",
                "https://www.googleapis.com/auth/analytics.readonly"
            ]),
            "developer_token": "1iLDTpzJ31nqo4u-G42t1g",
            "is_active": True
        }
        
        existing_config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == org.id,
            OAuthConfig.platform == "google"
        ).first()
        
        if existing_config:
            for key, value in oauth_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            print(f"  ⊙ Updated OAuth config for Google")
            print(f"    - Redirect URI: {existing_config.redirect_uri}")
        else:
            oauth_config = OAuthConfig(**oauth_config_data)
            db.add(oauth_config)
            db.commit()
            print(f"  ✓ Created OAuth config for Google")
            print(f"    - Redirect URI: {oauth_config.redirect_uri}")
    
    # Configuración OAuth de Meta (Facebook)
    if meta_provider:
        meta_config_data = {
            "organization_id": org.id,
            "provider_id": meta_provider.id,
            "platform": "meta",
            "client_id": settings.GOOGLE_CLIENT_ID or "1570716334048996",
            "client_secret": settings.GOOGLE_CLIENT_SECRET or "1e338b61ad3d67e16065818153c15faf",
            "redirect_uri": f"{frontend_url}/oauth/callback",
            "scopes": json.dumps([
                "ads_read",
                "ads_management",
                "business_management"
            ]),
            "is_active": True
        }
        
        existing_config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == org.id,
            OAuthConfig.platform == "meta"
        ).first()
        
        if existing_config:
            for key, value in meta_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            print(f"  ⊙ Updated OAuth config for Meta")
            print(f"    - Redirect URI: {existing_config.redirect_uri}")
        else:
            oauth_config = OAuthConfig(**meta_config_data)
            db.add(oauth_config)
            db.commit()
            print(f"  ✓ Created OAuth config for Meta")
            print(f"    - Redirect URI: {oauth_config.redirect_uri}")
    
    # Configuración OAuth de LinkedIn
    if linkedin_provider:
        linkedin_config_data = {
            "organization_id": org.id,
            "provider_id": linkedin_provider.id,
            "platform": "linkedin",
            "client_id": settings.LINKEDIN_CLIENT_ID or "7828fyexpeo40b",
            "client_secret": settings.LINKEDIN_CLIENT_SECRET or "WPL_AP1.qQOn6uXaX8yByZYB.39uVRw==",
            "redirect_uri": f"{frontend_url}/api/oauth/callback/linkedin",
            "scopes": json.dumps([
                "openid",
                "profile",
                "email"
            ]),
            "is_active": True
        }
        
        existing_config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == org.id,
            OAuthConfig.platform == "linkedin"
        ).first()
        
        if existing_config:
            for key, value in linkedin_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            print(f"  ⊙ Updated OAuth config for LinkedIn")
            print(f"    - Redirect URI: {existing_config.redirect_uri}")
        else:
            oauth_config = OAuthConfig(**linkedin_config_data)
            db.add(oauth_config)
            db.commit()
            print(f"  ✓ Created OAuth config for LinkedIn")
            print(f"    - Redirect URI: {oauth_config.redirect_uri}")
    
    # Configuración OAuth de TikTok
    if tiktok_provider:
        tiktok_config_data = {
            "organization_id": org.id,
            "provider_id": tiktok_provider.id,
            "platform": "tiktok",
            "client_id": settings.TIKTOK_CLIENT_ID or "sbawys0hliiz85vp6x",
            "client_secret": settings.TIKTOK_CLIENT_SECRET or "wvpOSOcrSoZ1lTijIA8DnisNz50gJbYS",
            "redirect_uri": f"{frontend_url}/oauth/callback",
            "scopes": json.dumps([
                "user.info.basic",
                "ad.account",
                "ad.report.basic",
                "ad.report.ad",
                "ad.report.creative"
            ]),
            "is_active": True
        }
        
        existing_config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == org.id,
            OAuthConfig.platform == "tiktok"
        ).first()
        
        if existing_config:
            for key, value in tiktok_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            print(f"  ⊙ Updated OAuth config for TikTok")
            print(f"    - Redirect URI: {existing_config.redirect_uri}")
        else:
            oauth_config = OAuthConfig(**tiktok_config_data)
            db.add(oauth_config)
            db.commit()
            print(f"  ✓ Created OAuth config for TikTok")
            print(f"    - Redirect URI: {oauth_config.redirect_uri}")
    
    print("✅ OAuth configs for DEV seeded successfully\n")


def run_dev_seeder():
    """Ejecuta el seeder de desarrollo"""
    print("=" * 60)
    print("🌱 Starting DEV database seeding...")
    print("=" * 60 + "\n")
    
    db = SessionLocal()
    try:
        seed_dev_oauth_configs(db)
        print("=" * 60)
        print("🎉 DEV seeding completed!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error during DEV seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_dev_seeder()
