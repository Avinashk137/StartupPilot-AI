"""
Auth system integration tests.
Run from project root: python -m backend.test_auth
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import json
import time
import urllib.request
import urllib.error

BASE = "http://localhost:8000/api/v1/auth"

PASS_EMAIL = "kasiavinashkande@gmail.com"
PASS_PASSWORD = "Avinash@137"
NEW_EMAIL = f"test_new_{int(time.time())}@example.com"
NEW_PASSWORD = "TestPass@123"

RESULTS = []


def post(path: str, body: dict, token: str | None = None):
    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as f:
            return f.status, json.loads(f.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, {"error": str(e)}


def get(path: str, token: str | None = None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as f:
            return f.status, json.loads(f.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        return 0, {"error": str(e)}


def check(name: str, condition: bool, details: str = ""):
    status = "✅ PASS" if condition else "❌ FAIL"
    msg = f"{status}  {name}"
    if details:
        msg += f"\n        {details}"
    print(msg)
    RESULTS.append((name, condition))
    return condition


print("\n" + "="*60)
print("  StartupPilot AI — Auth System Test Suite")
print("="*60 + "\n")

# ── Test 1: Register with duplicate email ──────────────────────
print("── Registration Tests ──")
code, body = post("/register", {"email": PASS_EMAIL, "password": "Test@1234", "full_name": "Test User"})
# Exception handler wraps detail into {"error": "...", "status_code": 400}
error_msg = body.get("error") or body.get("detail", "")
check(
    "Duplicate email -> specific error message",
    code == 400 and "already" in error_msg.lower(),
    f"HTTP {code}: {error_msg}"
)

# ── Test 2: Register with weak password ───────────────────────
code, body = post("/register", {"email": NEW_EMAIL, "password": "weak", "full_name": "Test"})
check(
    "Weak password → validation error",
    code in (400, 422),
    f"HTTP {code}: {body}"
)

# ── Test 3: Register with invalid email ───────────────────────
code, body = post("/register", {"email": "not-an-email", "password": "Test@1234", "full_name": "Test"})
check(
    "Invalid email format → validation error",
    code == 422,
    f"HTTP {code}: {body}"
)

# ── Test 4: Register with empty full name ─────────────────────
code, body = post("/register", {"email": NEW_EMAIL, "password": "Test@1234", "full_name": " "})
check(
    "Empty full name → validation error",
    code == 422,
    f"HTTP {code}: {body}"
)

# ── Test 5: Login with correct credentials ────────────────────
print("\n── Login Tests ──")
code, body = post("/login", {"email": PASS_EMAIL, "password": PASS_PASSWORD})
login_ok = check(
    "Valid credentials → tokens returned",
    code == 200 and "access_token" in body and "user" in body,
    f"HTTP {code}: user={body.get('user', {}).get('email', body)}"
)
access_token = body.get("access_token", "") if login_ok else ""
refresh_token_val = body.get("refresh_token", "") if login_ok else ""

# ── Test 6: User data correct ─────────────────────────────────
if login_ok:
    user = body.get("user", {})
    check(
        "User.id is string (UUID)",
        isinstance(user.get("id"), str) and len(user.get("id", "")) == 36,
        f"id={user.get('id')}"
    )
    check(
        "User.email matches",
        user.get("email") == PASS_EMAIL,
        f"email={user.get('email')}"
    )
    check(
        "User has full_name",
        bool(user.get("full_name")),
        f"full_name={user.get('full_name')}"
    )

# ── Test 7: Login with wrong password ─────────────────────────
code, body = post("/login", {"email": PASS_EMAIL, "password": "wrongpassword"})
error_msg = body.get("error") or body.get("detail", "")
check(
    "Wrong password -> 401 with specific message",
    code == 401 and bool(error_msg) and error_msg != "Internal server error",
    f"HTTP {code}: {error_msg}"
)

# -- Test 8: Login with non-existent email -----------------
code, body = post("/login", {"email": "nonexistent_xyz@example.com", "password": "Test@1234"})
error_msg = body.get("error") or body.get("detail", "")
check(
    "Non-existent email -> 401 with specific message",
    code == 401 and bool(error_msg),
    f"HTTP {code}: {error_msg}"
)

# ── Test 9: /auth/me with valid token ─────────────────────────
print("\n── Session & Token Tests ──")
if access_token:
    code, body = get("/me", token=access_token)
    check(
        "/auth/me with valid token → 200 + user data",
        code == 200 and body.get("success") and "data" in body,
        f"HTTP {code}: email={body.get('data', {}).get('email')}"
    )
else:
    check("/auth/me with valid token → 200 + user data", False, "Skipped — no token from login")

# ── Test 10: /auth/me with invalid token ──────────────────────
code, body = get("/me", token="invalid.token.here")
check(
    "/auth/me with invalid token → 401",
    code == 401,
    f"HTTP {code}: {body.get('detail')}"
)

# ── Test 11: /auth/me without token ───────────────────────────
code, body = get("/me")
check(
    "/auth/me without token → 401 or 403",
    code in (401, 403),
    f"HTTP {code}"
)

# ── Test 12: Token refresh ────────────────────────────────────
if refresh_token_val:
    code, body = post("/refresh", {"refresh_token": refresh_token_val})
    check(
        "Token refresh → new access token",
        code == 200 and "access_token" in body,
        f"HTTP {code}: has_token={'access_token' in body}"
    )
else:
    check("Token refresh → new access token", False, "Skipped — no refresh token")

# ── Test 13: Invalid refresh token ───────────────────────────
code, body = post("/refresh", {"refresh_token": "invalid_refresh_token"})
check(
    "Invalid refresh token → 401",
    code == 401,
    f"HTTP {code}: {body.get('detail')}"
)

# ── Test 14: Forgot password ──────────────────────────────────
print("\n── Password Reset Tests ──")
code, body = post("/forgot-password", {"email": PASS_EMAIL})
check(
    "Forgot password → 200 (always, prevents enumeration)",
    code == 200 and body.get("success"),
    f"HTTP {code}: {body.get('message', '')[:60]}"
)

# ── Test 15: Forgot password with non-existent email ─────────
code, body = post("/forgot-password", {"email": "doesnotexist@example.com"})
check(
    "Forgot password (non-existent email) → 200 (prevents enumeration)",
    code == 200,
    f"HTTP {code}"
)

# ── Test 16: Logout ───────────────────────────────────────────
print("\n── Logout Tests ──")
if access_token:
    code, body = post("/logout", {}, token=access_token)
    check(
        "Logout with valid token → 200",
        code == 200 and body.get("success"),
        f"HTTP {code}: {body.get('message')}"
    )
else:
    check("Logout with valid token → 200", False, "Skipped — no token")

# ── Summary ───────────────────────────────────────────────────
print("\n" + "="*60)
passed = sum(1 for _, ok in RESULTS if ok)
total = len(RESULTS)
print(f"  Results: {passed}/{total} tests passed")
if passed == total:
    print("  🎉 ALL TESTS PASSED — Auth system is production ready!")
else:
    failed = [(name, ok) for name, ok in RESULTS if not ok]
    print(f"  ⚠️  {len(failed)} test(s) failed:")
    for name, _ in failed:
        print(f"     • {name}")
print("="*60 + "\n")

sys.exit(0 if passed == total else 1)
