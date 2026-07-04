import urllib.request
try:
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/settings", method="GET")
    response = urllib.request.urlopen(req)
    print("Status:", response.status)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.reason)
except Exception as e:
    print("Error:", e)
