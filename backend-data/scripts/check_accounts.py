#!/usr/bin/env python3
"""
Script para verificar y corregir cuentas en la base de datos
"""
import sys
import os

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models import Account, Organization
from sqlalchemy.orm import joinedload

def check_accounts():
    """Verifica todas las cuentas y muestra información detallada"""
    db = SessionLocal()
    try:
        accounts = db.query(Account).options(
            joinedload(Account.organization)
        ).all()
        
        print("\n" + "="*80)
        print("REPORTE DE CUENTAS")
        print("="*80 + "\n")
        
        if not accounts:
            print("No hay cuentas en la base de datos.")
            return
        
        for account in accounts:
            org = account.organization
            print(f"ID: {account.id}")
            print(f"  Organización: {org.name if org else 'N/A'} (ID: {account.organization_id})")
            print(f"  Plataforma: {account.platform}")
            print(f"  Tipo: {account.account_type}")
            print(f"  Account ID: {account.account_id}")
            print(f"  Nombre: {account.account_name or 'N/A'}")
            print(f"  Email: {account.user_email or 'N/A'}")
            print(f"  Activa: {'Sí' if account.is_active else 'No'}")
            print(f"  Tiene Access Token: {'Sí' if account.access_token else 'No'}")
            print(f"  Tiene Refresh Token: {'Sí' if account.refresh_token else 'No'}")
            print(f"  Token Expira: {account.token_expires_at or 'N/A'}")
            print(f"  Última Sincronización: {account.last_sync or 'Nunca'}")
            print(f"  Estado Última Sync: {account.last_sync_status or 'N/A'}")
            print(f"  Creada: {account.created_at}")
            print(f"  Actualizada: {account.updated_at}")
            
            # Verificar problemas
            issues = []
            if account.account_id.startswith('unknown_'):
                issues.append("⚠️  Account ID parece ser un placeholder")
            if not account.access_token:
                issues.append("⚠️  No tiene access token")
            if not account.refresh_token:
                issues.append("⚠️  No tiene refresh token")
            if account.token_expires_at and account.token_expires_at < account.updated_at:
                issues.append("⚠️  Token expirado")
            
            if issues:
                print(f"  PROBLEMAS DETECTADOS:")
                for issue in issues:
                    print(f"    {issue}")
            else:
                print(f"  ✅ Cuenta parece estar correcta")
            
            print("-" * 80)
        
        print(f"\nTotal de cuentas: {len(accounts)}")
        
    finally:
        db.close()


def delete_account(account_id: int):
    """Elimina una cuenta por ID"""
    db = SessionLocal()
    try:
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            print(f"❌ No se encontró la cuenta con ID {account_id}")
            return
        
        print(f"\n⚠️  ADVERTENCIA: Estás a punto de eliminar la cuenta:")
        print(f"   ID: {account.id}")
        print(f"   Plataforma: {account.platform}")
        print(f"   Tipo: {account.account_type}")
        print(f"   Account ID: {account.account_id}")
        print(f"   Nombre: {account.account_name}")
        
        confirm = input("\n¿Estás seguro? (escribe 'SI' para confirmar): ")
        if confirm != 'SI':
            print("Operación cancelada.")
            return
        
        db.delete(account)
        db.commit()
        print(f"✅ Cuenta {account_id} eliminada exitosamente.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al eliminar cuenta: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "delete" and len(sys.argv) > 2:
            account_id = int(sys.argv[2])
            delete_account(account_id)
        else:
            print("Uso:")
            print("  python scripts/check_accounts.py           # Ver todas las cuentas")
            print("  python scripts/check_accounts.py delete 3 # Eliminar cuenta con ID 3")
    else:
        check_accounts()





