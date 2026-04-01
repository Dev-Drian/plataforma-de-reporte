"""
Modelo estándar de respuesta para todas las APIs
Diseñado para SaaS multi-tenant
"""
from typing import Optional, Any, Dict
from datetime import datetime
from fastapi import Response
from fastapi.responses import JSONResponse


class ApiResponse:
    """Modelo estándar de respuesta"""
    
    def __init__(
        self,
        success: bool,
        status_code: int,
        message: str,
        data: Optional[Any] = None,
        error: Optional[str] = None,
        path: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        self.success = success
        self.status_code = status_code
        self.message = message
        self.data = data
        self.error = error
        self.timestamp = datetime.utcnow().isoformat()
        self.path = path
        self.request_id = request_id
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte la respuesta a diccionario"""
        response = {
            "success": self.success,
            "statusCode": self.status_code,
            "message": self.message,
            "timestamp": self.timestamp,
        }
        
        if self.data is not None:
            response["data"] = self.data
        
        if self.error:
            response["error"] = self.error
        
        if self.path:
            response["path"] = self.path
        
        if self.request_id:
            response["requestId"] = self.request_id
        
        return response


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    path: Optional[str] = None
) -> JSONResponse:
    """Crea una respuesta exitosa"""
    response = ApiResponse(
        success=True,
        status_code=status_code,
        message=message,
        data=data,
        path=path
    )
    return JSONResponse(
        status_code=status_code,
        content=response.to_dict()
    )


def error_response(
    message: str,
    status_code: int = 500,
    error: Optional[str] = None,
    path: Optional[str] = None
) -> JSONResponse:
    """Crea una respuesta de error"""
    response = ApiResponse(
        success=False,
        status_code=status_code,
        message=message,
        error=error or message,
        path=path
    )
    return JSONResponse(
        status_code=status_code,
        content=response.to_dict()
    )


def created_response(
    data: Any,
    message: str = "Resource created successfully",
    path: Optional[str] = None
) -> JSONResponse:
    """Crea una respuesta de creación (201)"""
    return success_response(data, message, 201, path)


def no_content_response() -> Response:
    """Crea una respuesta sin contenido (204)"""
    return Response(status_code=204)




