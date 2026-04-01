from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
from app.core.config import settings

# Configuración de JWT
SECRET_KEY = getattr(settings, "JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si una contraseña coincide con el hash"""
    if not plain_password or not hashed_password:
        return False
    return get_password_hash(plain_password) == hashed_password


def get_password_hash(password: str) -> str:
    """Genera el hash de una contraseña usando SHA256"""
    if not password:
        raise ValueError("Password cannot be empty")
    
    # Asegurar que es string
    if not isinstance(password, str):
        password = str(password)
    
    # Hashear con SHA256
    password_bytes = password.encode('utf-8')
    hash_obj = hashlib.sha256(password_bytes)
    return hash_obj.hexdigest()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decodifica y valida un token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        # Log del error para debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"JWT decode error: {str(e)}")
        return None
    except Exception as e:
        # Log de otros errores
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Token decode error: {str(e)}")
        return None

