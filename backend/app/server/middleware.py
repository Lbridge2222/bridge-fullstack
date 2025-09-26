"""
Request ID middleware for telemetry tracking
"""
import uuid
import contextvars
from starlette.middleware.base import BaseHTTPMiddleware

_request_id = contextvars.ContextVar("request_id", default=None)

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        _request_id.set(rid)
        resp = await call_next(request)
        resp.headers["X-Request-ID"] = rid
        return resp

def get_request_id() -> str:
    """Get current request ID from context"""
    rid = _request_id.get()
    return rid or str(uuid.uuid4())
