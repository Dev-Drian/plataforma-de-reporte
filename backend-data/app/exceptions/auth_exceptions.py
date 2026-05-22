"""Excepciones personalizadas para autenticación"""
from fastapi import HTTPException, status


class AuthenticationError(HTTPException):
    """Error de autenticación"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class InvalidCredentialsError(AuthenticationError):
    """Credenciales inválidas"""
    def __init__(self):
        super().__init__(detail="Incorrect email or password")


class UserNotFoundError(HTTPException):
    """Usuario no encontrado"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )


class UserInactiveError(HTTPException):
    """Usuario inactivo"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )


class EmailAlreadyExistsError(HTTPException):
    """Email ya registrado"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )




