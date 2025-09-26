import time
import json
import hashlib
from typing import Any, Optional, Dict, Tuple

class _TTLCache:
    def __init__(self, ttl_s: int = 900, max_items: int = 5000):
        self.ttl = ttl_s
        self.max = max_items
        self.store: Dict[str, Tuple[float, Any]] = {}

    def get(self, k: str) -> Optional[Any]:
        v = self.store.get(k)
        if not v: return None
        ts, val = v
        if time.time() - ts > self.ttl:
            self.store.pop(k, None)
            return None
        return val

    def set(self, k: str, v: Any):
        if len(self.store) >= self.max:
            # drop oldest
            oldest = min(self.store.items(), key=lambda x: x[1][0])[0]
            self.store.pop(oldest, None)
        self.store[k] = (time.time(), v)

def make_key(prefix: str, payload: Any) -> str:
    """Generate cache key from prefix and payload"""
    return f"{prefix}:{hashlib.md5(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()}"

CACHE = _TTLCache()
