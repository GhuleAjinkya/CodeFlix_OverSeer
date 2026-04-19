import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Use decode_responses=True to get strings instead of bytes
try:
    r = redis.from_url(REDIS_URL, decode_responses=True)
except Exception as e:
    print(f"Warning: Could not connect to Redis: {e}")
    r = None

def get_cached(key):
    if not r:
        return None
    try:
        val = r.get(key)
        return json.loads(val) if val else None
    except Exception as e:
        print(f"Redis get error: {e}")
        return None

def set_cached(key, value, ttl_seconds=21600):  # 6 hours default
    if not r:
        return
    try:
        r.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception as e:
        print(f"Redis set error: {e}")
