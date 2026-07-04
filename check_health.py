import urllib.request
try:
    req = urllib.request.Request("http://127.0.0.1:8000/api/health")
    response = urllib.request.urlopen(req)
    print("Health check status:", response.status)
    print("Response:", response.read().decode())
except Exception as e:
    print("Error:", e)
