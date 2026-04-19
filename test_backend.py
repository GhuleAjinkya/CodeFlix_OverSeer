import sys
import os

# Set DATABASE_URL to SQLite to avoid Postgres dependency during testing
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from fastapi.testclient import TestClient
from backend.main import app
from backend.services import health_service

def run_tests():
    print("Initializing TestClient...")
    client = TestClient(app)
    
    results = {"passed": 0, "failed": 0, "details": []}
    
    def assert_test(name, condition, error_msg):
        if condition:
            results["passed"] += 1
            results["details"].append(f"PASS {name}")
        else:
            results["failed"] += 1
            results["details"].append(f"FAIL {name} - {error_msg}")

    print("\n--- Running Endpoint Tests ---")
    
    # 1. GET /auth/github
    resp = client.get("/auth/github", follow_redirects=False)
    # Could be 307 (FastAPI default redirect) or 302
    assert_test("GET /auth/github redirects", resp.status_code in (302, 307), f"Got status {resp.status_code}")
    
    # 2. GET /repos
    resp = client.get("/repos")
    assert_test("GET /repos returns 401 without session", resp.status_code == 401, f"Got status {resp.status_code}")
    
    # 3. GET /health-score
    resp = client.get("/health-score?repo=test/test")
    assert_test("GET /health-score returns 401 without session", resp.status_code == 401, f"Got status {resp.status_code}")
    
    # 4. GET /summary
    resp = client.get("/summary?repo=test/test")
    assert_test("GET /summary returns 401 without session", resp.status_code == 401, f"Got status {resp.status_code}")
    
    # 5. GET /recommendations
    resp = client.get("/recommendations?repo=test/test&issue_id=1")
    assert_test("GET /recommendations returns 401 without session", resp.status_code == 401, f"Got status {resp.status_code}")
    
    print("\n--- Running Model Tests ---")
    
    # 6. Check XGBoost model loads
    model_loaded = health_service.model is not None
    assert_test("XGBoost model loads from file", model_loaded, "health_service.model is None")
    
    # 7. Check heuristic fallback works
    # We call compute_health_score directly to test this logic
    # First, test what happens if model loaded: it will try to predict.
    # To strictly test the fallback, we can temporarily disable the model.
    original_model = health_service.model
    health_service.model = None
    
    fallback_result = health_service.compute_health_score(issues=[], prs=[], commits=[], contributors=[])
    assert_test("Heuristic fallback computes score", isinstance(fallback_result.get("score"), (int, float)), "Score is not a number")
    assert_test("Heuristic fallback assigns grade", "grade" in fallback_result, "No grade assigned")
    
    # Restore model
    health_service.model = original_model
    
    print("\n=== Test Summary ===")
    for detail in results["details"]:
        print(detail)
    print(f"\nTotal Passed: {results['passed']}, Total Failed: {results['failed']}")

if __name__ == "__main__":
    run_tests()

