"""
Servicio de cache con Redis
Optimiza las consultas a APIs externas y reduce latencia
Incluye fallback a memoria cuando Redis no está disponible
"""
import redis
import json
from typing import Optional, Any, Callable
from functools import wraps
from datetime import datetime, timedelta
from app.core.config import settings
import logging
import threading

logger = logging.getLogger(__name__)

# Cliente Redis global
_redis_client: Optional[redis.Redis] = None

# Fallback: Cache en memoria (para cuando Redis no está disponible)
_memory_cache: dict = {}
_memory_cache_lock = threading.Lock()


def _memory_cache_cleanup():
    """Limpia entradas expiradas del cache en memoria"""
    now = datetime.utcnow()
    with _memory_cache_lock:
        expired_keys = [k for k, v in _memory_cache.items() if v.get("expires_at") and v["expires_at"] < now]
        for key in expired_keys:
            del _memory_cache[key]


def get_redis_client() -> Optional[redis.Redis]:
    """Obtiene o crea el cliente Redis"""
    global _redis_client
    
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            _redis_client.ping()
            logger.info("✅ Redis conectado exitosamente")
        except Exception as e:
            logger.warning(f"⚠️ Redis no disponible: {str(e)}. Continuando sin cache.")
            _redis_client = None
    
    return _redis_client


def cache_key(prefix: str, *args, **kwargs) -> str:
    """Genera una clave de cache consistente"""
    key_parts = [prefix]
    
    # Agregar argumentos posicionales
    for arg in args:
        if arg is not None:
            key_parts.append(str(arg))
    
    # Agregar argumentos nombrados ordenados
    for key in sorted(kwargs.keys()):
        if kwargs[key] is not None:
            key_parts.append(f"{key}:{kwargs[key]}")
    
    return ":".join(key_parts)


def get_from_cache(key: str) -> Optional[Any]:
    """Obtiene un valor del cache (Redis o memoria)"""
    # Intentar Redis primero
    client = get_redis_client()
    if client:
        try:
            value = client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Error al obtener del cache Redis: {str(e)}")
    
    # Fallback a memoria
    _memory_cache_cleanup()
    with _memory_cache_lock:
        if key in _memory_cache:
            entry = _memory_cache[key]
            if entry.get("expires_at") and entry["expires_at"] > datetime.utcnow():
                logger.debug(f"Memory cache hit: {key}")
                return entry.get("value")
            else:
                # Expirado, eliminar
                del _memory_cache[key]
    
    return None


def set_to_cache(key: str, value: Any, ttl: int = 3600) -> bool:
    """Guarda un valor en el cache con TTL (Redis o memoria)"""
    # Intentar Redis primero
    client = get_redis_client()
    if client:
        try:
            client.setex(key, ttl, json.dumps(value))
            return True
        except Exception as e:
            logger.warning(f"Error al guardar en cache Redis: {str(e)}")
    
    # Fallback a memoria
    with _memory_cache_lock:
        _memory_cache[key] = {
            "value": value,
            "expires_at": datetime.utcnow() + timedelta(seconds=ttl)
        }
        logger.debug(f"Memory cache set: {key} (TTL: {ttl}s)")
    return True


def delete_from_cache(key: str) -> bool:
    """Elimina una clave del cache (Redis y memoria)"""
    deleted = False
    
    # Intentar Redis
    client = get_redis_client()
    if client:
        try:
            client.delete(key)
            deleted = True
        except Exception as e:
            logger.warning(f"Error al eliminar del cache Redis: {str(e)}")
    
    # También eliminar de memoria
    with _memory_cache_lock:
        if key in _memory_cache:
            del _memory_cache[key]
            deleted = True
    
    return deleted


def invalidate_cache_pattern(pattern: str) -> int:
    """Invalida todas las claves que coincidan con el patrón"""
    client = get_redis_client()
    if not client:
        return 0
    
    try:
        keys = client.keys(pattern)
        if keys:
            return client.delete(*keys)
        return 0
    except Exception as e:
        logger.warning(f"Error al invalidar cache: {str(e)}")
        return 0


def cached(prefix: str, ttl: int = 3600):
    """
    Decorador para cachear resultados de funciones
    
    Args:
        prefix: Prefijo para la clave de cache
        ttl: Tiempo de vida en segundos (default: 1 hora)
    
    Example:
        @cached(prefix="seo:metrics", ttl=1800)
        async def get_metrics(start_date, end_date, account_id):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generar clave de cache
            key = cache_key(prefix, *args, **kwargs)
            
            # Intentar obtener del cache
            cached_value = get_from_cache(key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {key}")
                return cached_value
            
            # Ejecutar función y cachear resultado
            logger.debug(f"Cache miss: {key}")
            result = await func(*args, **kwargs)
            
            # Solo cachear si el resultado es exitoso
            if result is not None:
                set_to_cache(key, result, ttl)
            
            return result
        
        return wrapper
    return decorator


def cached_sync(prefix: str, ttl: int = 3600):
    """
    Decorador para cachear resultados de funciones síncronas
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = cache_key(prefix, *args, **kwargs)
            
            cached_value = get_from_cache(key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {key}")
                return cached_value
            
            logger.debug(f"Cache miss: {key}")
            result = func(*args, **kwargs)
            
            if result is not None:
                set_to_cache(key, result, ttl)
            
            return result
        
        return wrapper
    return decorator





