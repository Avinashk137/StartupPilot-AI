from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# We need to mock the get_current_user dependency
from backend.api.auth import get_current_user
app.dependency_overrides[get_current_user] = lambda: {"id": "8547b32d-098f-49eb-b135-2fa2b14ea42b"}

response = client.put("/api/v1/settings", json={"theme": "dark"})
print(response.status_code)
print(response.json())
