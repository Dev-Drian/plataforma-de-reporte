"""
Seeder para datos iniciales del sistema
Ejecutar con: python -m app.seeders.seed_data
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.config import settings
from app.models import (
    Organization, User, Role, UserRole, OrganizationSetting, Keyword, City, OAuthProvider, OAuthConfig
)
from app.core.security import get_password_hash
import json


def seed_roles(db: Session):
    """Crea los roles iniciales del sistema"""
    print("🌱 Seeding roles...")
    
    roles_data = [
        {
            "name": "admin",
            "description": "Administrador con acceso total al sistema",
            "permissions": json.dumps({
                "organizations": ["create", "read", "update", "delete"],
                "users": ["create", "read", "update", "delete"],
                "settings": ["create", "read", "update", "delete"],
                "metrics": ["read", "export"],
                "accounts": ["create", "read", "update", "delete", "sync"],
            })
        },
        {
            "name": "user",
            "description": "Usuario estándar con acceso a métricas y configuración básica",
            "permissions": json.dumps({
                "organizations": ["read"],
                "users": ["read"],
                "settings": ["read", "update"],
                "metrics": ["read", "export"],
                "accounts": ["read", "sync"],
            })
        },
        {
            "name": "viewer",
            "description": "Usuario de solo lectura",
            "permissions": json.dumps({
                "organizations": ["read"],
                "users": ["read"],
                "settings": ["read"],
                "metrics": ["read"],
                "accounts": ["read"],
            })
        },
    ]
    
    for role_data in roles_data:
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing_role:
            role = Role(**role_data)
            db.add(role)
            print(f"  ✓ Created role: {role_data['name']}")
        else:
            print(f"  ⊙ Role already exists: {role_data['name']}")
    
    db.commit()
    print("✅ Roles seeded successfully\n")


def seed_organizations(db: Session):
    """Crea organizaciones de ejemplo"""
    print("🌱 Seeding organizations...")
    
    organizations_data = [
        {
            "name": "Demo Organization",
            "slug": "demo-org",
            "description": "Organización de demostración",
            "is_active": True,
            "plan": "pro"
        },
    ]
    
    organizations = []
    for org_data in organizations_data:
        existing_org = db.query(Organization).filter(Organization.slug == org_data["slug"]).first()
        if not existing_org:
            org = Organization(**org_data)
            db.add(org)
            db.flush()  # Para obtener el ID
            organizations.append(org)
            print(f"  ✓ Created organization: {org_data['name']}")
        else:
            organizations.append(existing_org)
            print(f"  ⊙ Organization already exists: {org_data['name']}")
    
    db.commit()
    print("✅ Organizations seeded successfully\n")
    return organizations


def seed_users(db: Session, organizations: list):
    """Crea usuarios iniciales"""
    print("🌱 Seeding users...")
    
    users_data = [
        {
            "organization_id": organizations[0].id if organizations else None,
            "email": "admin@demo.com",
            "password_hash": get_password_hash("admin123"),  # Cambiar en producción
            "first_name": "Admin",
            "last_name": "User",
            "is_active": True,
            "is_verified": True,
        },
        {
            "organization_id": organizations[0].id if organizations else None,
            "email": "user@demo.com",
            "password_hash": get_password_hash("user123"),  # Cambiar en producción
            "first_name": "Demo",
            "last_name": "User",
            "is_active": True,
            "is_verified": True,
        },
    ]
    
    users = []
    for user_data in users_data:
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            user = User(**user_data)
            db.add(user)
            db.flush()  # Para obtener el ID
            users.append(user)
            print(f"  ✓ Created user: {user_data['email']}")
        else:
            users.append(existing_user)
            print(f"  ⊙ User already exists: {user_data['email']}")
    
    db.commit()
    print("✅ Users seeded successfully\n")
    return users


def seed_user_roles(db: Session, users: list):
    """Asigna roles a usuarios"""
    print("🌱 Seeding user roles...")
    
    # Obtener roles
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    user_role = db.query(Role).filter(Role.name == "user").first()
    
    if not admin_role or not user_role:
        print("  ⚠ Roles not found. Please seed roles first.")
        return
    
    user_roles_data = [
        {"user_email": "admin@demo.com", "role": admin_role},
        {"user_email": "user@demo.com", "role": user_role},
    ]
    
    for ur_data in user_roles_data:
        user = next((u for u in users if u.email == ur_data["user_email"]), None)
        if not user:
            continue
        
        existing_ur = db.query(UserRole).filter(
            UserRole.user_id == user.id,
            UserRole.role_id == ur_data["role"].id
        ).first()
        
        if not existing_ur:
            user_role_obj = UserRole(user_id=user.id, role_id=ur_data["role"].id)
            db.add(user_role_obj)
            print(f"  ✓ Assigned role '{ur_data['role'].name}' to {ur_data['user_email']}")
        else:
            print(f"  ⊙ Role already assigned: {ur_data['user_email']} -> {ur_data['role'].name}")
    
    db.commit()
    print("✅ User roles seeded successfully\n")


def seed_organization_settings(db: Session, organizations: list):
    """Crea configuraciones iniciales para organizaciones"""
    print("🌱 Seeding organization settings...")
    
    if not organizations:
        print("  ⚠ No organizations found. Skipping settings.")
        return
    
    org = organizations[0]
    
    # Colores del tema (azul)
    theme_colors = {
        "primary": "#0ea5e9",      # sky-500 (azul)
        "secondary": "#3b82f6",    # blue-500
        "accent": "#06b6d4",       # cyan-500
        "background": "#f9fafb",   # gray-50
        "surface": "#ffffff",      # white
        "text": "#111827",         # gray-900
        "textSecondary": "#6b7280", # gray-500
        "border": "#e5e7eb",       # gray-200
        "success": "#10b981",      # green-500
        "warning": "#f59e0b",      # amber-500
        "error": "#ef4444",        # red-500
    }
    
    settings_data = [
        {
            "organization_id": org.id,
            "key": "timezone",
            "value": "America/Mexico_City",
            "description": "Zona horaria de la organización"
        },
        {
            "organization_id": org.id,
            "key": "currency",
            "value": "MXN",
            "description": "Moneda por defecto"
        },
        {
            "organization_id": org.id,
            "key": "sync_frequency",
            "value": "daily",
            "description": "Frecuencia de sincronización (daily, weekly, monthly)"
        },
        {
            "organization_id": org.id,
            "key": "theme_colors",
            "value": json.dumps(theme_colors),
            "description": "Theme colors configuration (azul)"
        },
    ]
    
    for setting_data in settings_data:
        existing_setting = db.query(OrganizationSetting).filter(
            OrganizationSetting.organization_id == setting_data["organization_id"],
            OrganizationSetting.key == setting_data["key"]
        ).first()
        
        if not existing_setting:
            setting = OrganizationSetting(**setting_data)
            db.add(setting)
            print(f"  ✓ Created setting: {setting_data['key']}")
        else:
            # Actualizar el valor si ya existe (especialmente para theme_colors)
            existing_setting.value = setting_data["value"]
            existing_setting.description = setting_data.get("description", existing_setting.description)
            print(f"  ⊙ Updated setting: {setting_data['key']}")
    
    db.commit()
    print("✅ Organization settings seeded successfully\n")


def seed_keywords(db: Session, organizations: list):
    """Crea keywords de ejemplo"""
    print("🌱 Seeding keywords...")
    
    if not organizations:
        print("  ⚠ No organizations found. Skipping keywords.")
        return
    
    org = organizations[0]
    keywords_data = [
        {"keyword": "marketing digital", "category": "general", "is_active": True},
        {"keyword": "seo servicios", "category": "seo", "is_active": True},
        {"keyword": "publicidad online", "category": "ads", "is_active": True},
    ]
    
    for kw_data in keywords_data:
        existing_kw = db.query(Keyword).filter(
            Keyword.organization_id == org.id,
            Keyword.keyword == kw_data["keyword"]
        ).first()
        
        if not existing_kw:
            keyword = Keyword(organization_id=org.id, **kw_data)
            db.add(keyword)
            print(f"  ✓ Created keyword: {kw_data['keyword']}")
        else:
            print(f"  ⊙ Keyword already exists: {kw_data['keyword']}")
    
    db.commit()
    print("✅ Keywords seeded successfully\n")


def seed_cities(db: Session, organizations: list):
    """Crea ciudades de ejemplo"""
    print("🌱 Seeding cities...")
    
    if not organizations:
        print("  ⚠ No organizations found. Skipping cities.")
        return
    
    org = organizations[0]
    cities_data = [
        {
            "name": "Ciudad de México",
            "country": "México",
            "state": "CDMX",
            "latitude": 19.4326,
            "longitude": -99.1332,
            "is_active": True
        },
        {
            "name": "Guadalajara",
            "country": "México",
            "state": "Jalisco",
            "latitude": 20.6597,
            "longitude": -103.3496,
            "is_active": True
        },
        {
            "name": "Monterrey",
            "country": "México",
            "state": "Nuevo León",
            "latitude": 25.6866,
            "longitude": -100.3161,
            "is_active": True
        },
    ]
    
    for city_data in cities_data:
        existing_city = db.query(City).filter(
            City.organization_id == org.id,
            City.name == city_data["name"]
        ).first()
        
        if not existing_city:
            city = City(organization_id=org.id, **city_data)
            db.add(city)
            print(f"  ✓ Created city: {city_data['name']}")
        else:
            print(f"  ⊙ City already exists: {city_data['name']}")
    
    db.commit()
    print("✅ Cities seeded successfully\n")


def seed_oauth_providers(db: Session):
    """Crea los proveedores OAuth disponibles en el sistema"""
    print("🌱 Seeding OAuth providers...")
    
    providers_data = [
        {
            "name": "google",
            "display_name": "Google",
            "icon": "🔍",
            "color": "bg-blue-500",
            "required_fields": json.dumps({
                "client_id": {
                    "type": "text",
                    "label": "Client ID",
                    "required": True,
                    "placeholder": "tu-client-id.apps.googleusercontent.com",
                    "helper_text": "Obtén este valor desde Google Cloud Console"
                },
                "client_secret": {
                    "type": "password",
                    "label": "Client Secret",
                    "required": True,
                    "placeholder": "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",
                    "helper_text": "Mantén este valor seguro y privado"
                },
                "redirect_uri": {
                    "type": "hidden",
                    "label": "Redirect URI",
                    "required": False,
                    "default_value": "/oauth/callback",
                    "helper_text": "Se configurará automáticamente"
                },
                "scopes": {
                    "type": "hidden",
                    "label": "Scopes (Permisos)",
                    "required": False,
                    "default_value": "https://www.googleapis.com/auth/webmasters.readonly,https://www.googleapis.com/auth/analytics.readonly",
                    "helper_text": "Permisos predefinidos para Google Search Console y Analytics"
                }
            }),
            "is_active": True
        },
        {
            "name": "meta",
            "display_name": "Meta (Facebook)",
            "icon": "📘",
            "color": "bg-blue-600",
            "required_fields": json.dumps({
                "client_id": {
                    "type": "text",
                    "label": "App ID",
                    "required": True,
                    "placeholder": "1234567890123456",
                    "helper_text": "Obtén este valor desde Meta for Developers"
                },
                "client_secret": {
                    "type": "password",
                    "label": "App Secret",
                    "required": True,
                    "placeholder": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    "helper_text": "Mantén este valor seguro y privado"
                },
                "redirect_uri": {
                    "type": "hidden",
                    "label": "Redirect URI",
                    "required": False,
                    "default_value": "/oauth/callback",
                    "helper_text": "Se configurará automáticamente"
                },
                "scopes": {
                    "type": "hidden",
                    "label": "Scopes (Permisos)",
                    "required": False,
                    "default_value": "ads_read,ads_management,business_management",
                    "helper_text": "Permisos predefinidos para Meta Ads"
                }
            }),
            "is_active": True
        },
        {
            "name": "linkedin",
            "display_name": "LinkedIn",
            "icon": "💼",
            "color": "bg-blue-700",
            "required_fields": json.dumps({
                "client_id": {
                    "type": "text",
                    "label": "Client ID",
                    "required": True,
                    "placeholder": "7828fyexpeo40b",
                    "helper_text": "Obtén este valor desde LinkedIn Developers > App credentials"
                },
                "client_secret": {
                    "type": "password",
                    "label": "Primary Client Secret",
                    "required": True,
                    "placeholder": "WPL_AP1.xxxxxxxxxxxx",
                    "helper_text": "Mantén este valor seguro y privado - Visible solo una vez en LinkedIn"
                },
                "redirect_uri": {
                    "type": "url",
                    "label": "Authorized Redirect URL",
                    "required": True,
                    "placeholder": "https://tu-dominio.com/api/oauth/callback/linkedin",
                    "helper_text": "Debe estar registrada exactamente en LinkedIn App Settings"
                },
                "scopes": {
                    "type": "hidden",
                    "label": "Scopes (Permisos)",
                    "required": False,
                    "default_value": "openid profile email",
                    "helper_text": "Permisos solicitados: Identidad + Perfil + Email (r_ads y r_ads_reporting requieren autorización especial de LinkedIn)"
                },
                "access_token_ttl": {
                    "type": "hidden",
                    "label": "Access Token TTL",
                    "required": False,
                    "default_value": "5184000",
                    "helper_text": "Tiempo de vida del token en segundos (2 meses por defecto)"
                }
            }),
            "is_active": True
        },
        {
            "name": "tiktok",
            "display_name": "TikTok",
            "icon": "🎵",
            "color": "bg-black",
            "required_fields": json.dumps({
                "client_id": {
                    "type": "text",
                    "label": "Client Key",
                    "required": True,
                    "placeholder": "xxxxxxxxxxxxxxxxxxxxx",
                    "helper_text": "Obtén este valor desde TikTok for Developers"
                },
                "client_secret": {
                    "type": "password",
                    "label": "Client Secret",
                    "required": True,
                    "placeholder": "xxxxxxxxxxxxxxxxxxxxx",
                    "helper_text": "Mantén este valor seguro y privado"
                },
                "redirect_uri": {
                    "type": "hidden",
                    "label": "Redirect URI",
                    "required": False,
                    "default_value": "/oauth/callback",
                    "helper_text": "Se configurará automáticamente"
                },
                "scopes": {
                    "type": "hidden",
                    "label": "Scopes (Permisos)",
                    "required": False,
                    "default_value": "user.info.basic,video.list,ad_management",
                    "helper_text": "Permisos predefinidos para TikTok Ads"
                }
            }),
            "is_active": True
        }
    ]
    
    for provider_data in providers_data:
        existing_provider = db.query(OAuthProvider).filter(
            OAuthProvider.name == provider_data["name"]
        ).first()
        
        if not existing_provider:
            provider = OAuthProvider(**provider_data)
            db.add(provider)
            print(f"  ✓ Created provider: {provider_data['display_name']}")
        else:
            # Actualizar campos si ya existe
            existing_provider.display_name = provider_data["display_name"]
            existing_provider.required_fields = provider_data["required_fields"]
            existing_provider.is_active = provider_data["is_active"]
            if "icon" in provider_data:
                existing_provider.icon = provider_data["icon"]
            if "color" in provider_data:
                existing_provider.color = provider_data["color"]
            print(f"  ⊙ Updated provider: {provider_data['display_name']}")
    
    db.commit()
    print("✅ OAuth providers seeded successfully\n")


def seed_oauth_configs(db: Session, organizations: list):
    """Crea configuraciones OAuth de ejemplo para las organizaciones"""
    print("🌱 Seeding OAuth configs...")
    
    if not organizations:
        print("  ⚠ No organizations found. Skipping OAuth configs.")
        return
    
    org = organizations[0]
    
    # Obtener URL base del frontend desde configuración
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    
    # Obtener providers
    google_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "google").first()
    meta_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "meta").first()
    linkedin_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "linkedin").first()
    
    # Configuración OAuth de Google
    if google_provider:
        oauth_config_data = {
            "organization_id": org.id,
            "provider_id": google_provider.id,
            "platform": "google",
            "client_id": "1089121468667-7hnk5tql2pe2gur6vrvogvrqgr53qqp7.apps.googleusercontent.com",
            "client_secret": "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",
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
        
        if not existing_config:
            oauth_config = OAuthConfig(**oauth_config_data)
            db.add(oauth_config)
            db.commit()
            db.refresh(oauth_config)
            print(f"  ✓ Created OAuth config for Google")
            print(f"    - Developer Token: {oauth_config.developer_token[:10] if oauth_config.developer_token else 'None'}...")
        else:
            # Actualizar configuración existente
            for key, value in oauth_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            db.refresh(existing_config)
            print(f"  ⊙ Updated OAuth config for Google")
            print(f"    - Developer Token: {existing_config.developer_token[:10] if existing_config.developer_token else 'None'}...")
    else:
        print("  ⚠ Google provider not found. Skipping Google OAuth config.")
    
    # Configuración OAuth de Meta (Facebook)
    if meta_provider:
        meta_config_data = {
            "organization_id": org.id,
            "provider_id": meta_provider.id,
            "platform": "meta",
            "client_id": "1570716334048996",
            "client_secret": "1e338b61ad3d67e16065818153c15faf",
            "redirect_uri": f"{frontend_url}/oauth/callback",
            "scopes": json.dumps([
                "ads_read",              # Leer estadísticas de anuncios
                "ads_management",        # Administrar anuncios y obtener métricas
                "business_management"    # Acceso a Business Manager
            ]),
            "is_active": True
        }
        
        existing_config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == org.id,
            OAuthConfig.platform == "meta"
        ).first()
        
        if not existing_config:
            oauth_config = OAuthConfig(**meta_config_data)
            db.add(oauth_config)
            db.commit()
            db.refresh(oauth_config)
            print(f"  ✓ Created OAuth config for Meta (Facebook)")
            print(f"    - App ID: {oauth_config.client_id}")
        else:
            # Actualizar configuración existente
            for key, value in meta_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            db.refresh(existing_config)
            print(f"  ⊙ Updated OAuth config for Meta (Facebook)")
            print(f"    - App ID: {existing_config.client_id}")
    else:
        print("  ⚠ Meta provider not found. Skipping Meta OAuth config.")
    
    # Configuración OAuth de LinkedIn
    if linkedin_provider:
        linkedin_config_data = {
            "organization_id": org.id,
            "provider_id": linkedin_provider.id,
            "platform": "linkedin",
            "client_id": "7828fyexpeo40b",
            "client_secret": "WPL_AP1.qQOn6uXaX8yByZYB.39uVRw==",
            "redirect_uri": f"{frontend_url}/api/oauth/callback/linkedin",
            "scopes": json.dumps([
                "openid",                # Use your name and photo
                "profile",               # Use your name and photo
                "email"                  # Use the primary email address
                # Nota: r_ads y r_ads_reporting requieren autorización especial de LinkedIn
                # Se pueden solicitar más tarde si es necesario
            ]),
            "is_active": True
        }
        
        existing_config = db.query(OAuthConfig).filter(
            OAuthConfig.organization_id == org.id,
            OAuthConfig.platform == "linkedin"
        ).first()
        
        if not existing_config:
            oauth_config = OAuthConfig(**linkedin_config_data)
            db.add(oauth_config)
            db.commit()
            db.refresh(oauth_config)
            print(f"  ✓ Created OAuth config for LinkedIn")
            print(f"    - Client ID: {oauth_config.client_id}")
        else:
            # Actualizar configuración existente
            for key, value in linkedin_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            db.refresh(existing_config)
            print(f"  ⊙ Updated OAuth config for LinkedIn")
            print(f"    - Client ID: {existing_config.client_id}")
    else:
        print("  ⚠ LinkedIn provider not found. Skipping LinkedIn OAuth config.")
    
    # Configuración OAuth de TikTok
    tiktok_provider = db.query(OAuthProvider).filter(OAuthProvider.name == "tiktok").first()
    if tiktok_provider:
        tiktok_config_data = {
            "organization_id": org.id,
            "provider_id": tiktok_provider.id,
            "platform": "tiktok",
            "client_id": "sbawys0hliiz85vp6x",
            "client_secret": "wvpOSOcrSoZ1lTijIA8DnisNz50gJbYS",
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
        if not existing_config:
            oauth_config = OAuthConfig(**tiktok_config_data)
            db.add(oauth_config)
            db.commit()
            db.refresh(oauth_config)
            print(f"  ✓ Created OAuth config for TikTok")
            print(f"    - Client Key: {oauth_config.client_id}")
        else:
            for key, value in tiktok_config_data.items():
                if key != "organization_id" and key != "platform":
                    setattr(existing_config, key, value)
            db.commit()
            db.refresh(existing_config)
            print(f"  ⊙ Updated OAuth config for TikTok")
            print(f"    - Client Key: {existing_config.client_id}")
    else:
        print("  ⚠ TikTok provider not found. Skipping TikTok OAuth config.")
    print("✅ OAuth configs seeded successfully\n")


def run_seeders():
    """Ejecuta todos los seeders"""
    print("=" * 60)
    print("🌱 Starting database seeding...")
    print("=" * 60 + "\n")
    
    # Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Ejecutar seeders en orden
        seed_roles(db)
        organizations = seed_organizations(db)
        users = seed_users(db, organizations)
        seed_user_roles(db, users)
        seed_organization_settings(db, organizations)
        seed_keywords(db, organizations)
        seed_cities(db, organizations)
        seed_oauth_providers(db)
        seed_oauth_configs(db, organizations)
        
        print("=" * 60)
        print("✅ Database seeding completed successfully!")
        print("=" * 60)
        print("\n📝 Default credentials:")
        print("   Admin: admin@demo.com / admin123")
        print("   User:  user@demo.com / user123")
        print("\n⚠️  IMPORTANT: Change these passwords in production!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seeders()

