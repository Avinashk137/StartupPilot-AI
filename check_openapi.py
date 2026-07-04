import urllib.request
import json
try:
    req = urllib.request.Request("http://127.0.0.1:8000/openapi.json", method="GET")
    response = urllib.request.urlopen(req)
    openapi = json.loads(response.read().decode())
    print(json.dumps(openapi["paths"]["/api/v1/settings"]["put"], indent=2))
except Exception as e:
    print("Error:", e)
