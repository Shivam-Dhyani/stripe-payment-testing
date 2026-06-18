"""Test script to validate all backend endpoints."""
import requests
import json
import sys
import time

BASE = "http://localhost:8006/api"

def test(name, condition, detail=""):
    status = "OK" if condition else "FAIL"
    print(f"  [{status}] {name}" + (f" - {detail}" if detail else ""))
    return condition

def main():
    passed = 0
    failed = 0

    # Login to get admin token
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@ecommerce.com", "password": "admin123"})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("=== Health ===")
    r = requests.get(f"{BASE}/health")
    if test("Health check", r.status_code == 200, r.json().get("status")):
        passed += 1
    else:
        failed += 1

    print("\n=== Categories ===")
    r = requests.get(f"{BASE}/categories")
    if test("No trailing slash redirect", r.status_code == 200, f"status={r.status_code}"):
        passed += 1
    else:
        failed += 1

    cats = r.json()
    if test("Returns list of categories", isinstance(cats, list) and len(cats) == 5, f"count={len(cats)}"):
        passed += 1
    else:
        failed += 1

    cat = cats[0]
    if test("Has sub_categories field", "sub_categories" in cat, f"keys={list(cat.keys())}"):
        passed += 1
    else:
        failed += 1

    if test("sub_categories is a list", isinstance(cat.get("sub_categories"), list)):
        passed += 1
    else:
        failed += 1

    print("\n=== Subcategories ===")
    r = requests.get(f"{BASE}/subcategories")
    if test("No trailing slash redirect", r.status_code == 200):
        passed += 1
    else:
        failed += 1

    subs = r.json()
    if test("Returns list", isinstance(subs, list) and len(subs) == 15, f"count={len(subs)}"):
        passed += 1
    else:
        failed += 1

    # Filter by category
    cat_id = cats[0]["id"]
    r = requests.get(f"{BASE}/subcategories", params={"category_id": cat_id})
    filtered_subs = r.json()
    if test("Filter by category_id", isinstance(filtered_subs, list) and len(filtered_subs) == 3, f"count={len(filtered_subs)}"):
        passed += 1
    else:
        failed += 1

    print("\n=== Products ===")
    r = requests.get(f"{BASE}/products", params={"size": 5})
    if test("No trailing slash redirect", r.status_code == 200):
        passed += 1
    else:
        failed += 1

    data = r.json()
    if test("Paginated response structure", all(k in data for k in ["items", "total", "page", "size", "pages"])):
        passed += 1
    else:
        failed += 1

    if test("Has 5 items", len(data["items"]) == 5):
        passed += 1
    else:
        failed += 1

    if test("Total is 50", data["total"] == 50):
        passed += 1
    else:
        failed += 1

    p = data["items"][0]
    if test("Price is float/int (not string)", isinstance(p["price"], (int, float)), f"type={type(p['price']).__name__}, val={p['price']}"):
        passed += 1
    else:
        failed += 1

    if test("Has sub_category field", "sub_category" in p, f"keys={list(p.keys())}"):
        passed += 1
    else:
        failed += 1

    if p.get("sub_category"):
        sc = p["sub_category"]
        if test("sub_category has id, name, category_id", all(k in sc for k in ["id", "name", "category_id"])):
            passed += 1
        else:
            failed += 1
    else:
        test("sub_category populated", False, "sub_category is None")
        failed += 1

    print("\n=== Auth ===")
    # Login
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@ecommerce.com", "password": "admin123"})
    if test("Login returns token", "access_token" in r.json() and "token_type" in r.json()):
        passed += 1
    else:
        failed += 1

    # Register
    r = requests.post(f"{BASE}/auth/register", json={
        "email": "testuser_audit@example.com",
        "password": "testpass123",
        "first_name": "Audit",
        "last_name": "Test"
    })
    if test("Register returns token", r.status_code == 201 and "access_token" in r.json(), f"status={r.status_code}, keys={list(r.json().keys())}"):
        passed += 1
    else:
        failed += 1

    new_token = r.json().get("access_token", token)
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # GET /me
    r = requests.get(f"{BASE}/auth/me", headers=new_headers)
    if test("GET /me returns user", r.status_code == 200 and r.json().get("email") == "testuser_audit@example.com"):
        passed += 1
    else:
        failed += 1

    # PUT /me
    r = requests.put(f"{BASE}/auth/me", headers=new_headers, json={"first_name": "Updated"})
    if test("PUT /me updates user", r.status_code == 200 and r.json().get("first_name") == "Updated"):
        passed += 1
    else:
        failed += 1

    print("\n=== Auth Addresses ===")
    # GET /auth/addresses
    r = requests.get(f"{BASE}/auth/addresses", headers=new_headers)
    if test("GET /auth/addresses works", r.status_code == 200 and isinstance(r.json(), list)):
        passed += 1
    else:
        failed += 1

    # POST /auth/addresses
    r = requests.post(f"{BASE}/auth/addresses", headers=new_headers, json={
        "label": "Home",
        "street": "123 Test St",
        "city": "TestCity",
        "state": "TS",
        "zip_code": "12345",
        "country": "US",
        "is_default": True
    })
    if test("POST /auth/addresses creates address", r.status_code == 201 and "id" in r.json()):
        passed += 1
    else:
        failed += 1

    addr_id = r.json().get("id", "")

    # PUT /auth/addresses/{id}
    r = requests.put(f"{BASE}/auth/addresses/{addr_id}", headers=new_headers, json={"label": "Updated Home"})
    if test("PUT /auth/addresses/{id} works", r.status_code == 200 and r.json().get("label") == "Updated Home"):
        passed += 1
    else:
        failed += 1

    # Also check /addresses endpoint still works
    r = requests.get(f"{BASE}/addresses", headers=new_headers)
    if test("GET /addresses also works", r.status_code == 200 and isinstance(r.json(), list)):
        passed += 1
    else:
        failed += 1

    print("\n=== Cart ===")
    r = requests.get(f"{BASE}/cart", headers=new_headers)
    if test("GET /cart works (no trailing slash)", r.status_code == 200 and isinstance(r.json(), list)):
        passed += 1
    else:
        failed += 1

    # Add item to cart
    first_product_id = requests.get(f"{BASE}/products", params={"size": 1}).json()["items"][0]["id"]
    r = requests.post(f"{BASE}/cart", headers=new_headers, json={"product_id": first_product_id, "quantity": 2})
    if test("POST /cart adds item", r.status_code == 201):
        passed += 1
    else:
        failed += 1

    cart_item = r.json()
    if test("Cart item has product details", cart_item.get("product") is not None, f"product={cart_item.get('product')}"):
        passed += 1
    else:
        failed += 1

    if cart_item.get("product"):
        if test("Cart product price is float", isinstance(cart_item["product"]["price"], (int, float))):
            passed += 1
        else:
            failed += 1
    else:
        failed += 1

    cart_item_id = cart_item["id"]
    r = requests.put(f"{BASE}/cart/{cart_item_id}", headers=new_headers, json={"quantity": 3})
    if test("PUT /cart/{id} updates quantity", r.status_code == 200 and r.json().get("quantity") == 3):
        passed += 1
    else:
        failed += 1

    print("\n=== Orders ===")
    r = requests.get(f"{BASE}/orders", headers=new_headers)
    if test("GET /orders works (no trailing slash)", r.status_code == 200 and isinstance(r.json(), list)):
        passed += 1
    else:
        failed += 1

    # Admin endpoints
    r = requests.get(f"{BASE}/orders/all", headers=headers)
    if test("GET /orders/all works for admin", r.status_code == 200 and isinstance(r.json(), list)):
        passed += 1
    else:
        failed += 1

    orders = r.json()
    if orders and "items" in orders[0]:
        if test("Orders have items field", True, f"first order has {len(orders[0]['items'])} items"):
            passed += 1
        else:
            failed += 1

        if test("Order total is float", isinstance(orders[0]["total"], (int, float))):
            passed += 1
        else:
            failed += 1

        if orders[0]["items"]:
            if test("Order item price is float", isinstance(orders[0]["items"][0]["product_price"], (int, float))):
                passed += 1
            else:
                failed += 1
        else:
            passed += 1  # no items to check is ok
    else:
        test("Orders have items", False, f"keys={list(orders[0].keys()) if orders else 'no orders'}")
        failed += 3

    # PUT /orders/{id}/status
    first_order_id = orders[0]["id"]
    r = requests.put(f"{BASE}/orders/{first_order_id}/status", headers=headers, json={"status": "shipped"})
    if test("PUT /orders/{id}/status works", r.status_code == 200 and r.json().get("status") == "shipped"):
        passed += 1
    else:
        failed += 1

    print("\n=== Dashboard ===")
    r = requests.get(f"{BASE}/dashboard/stats", headers=headers)
    if test("GET /dashboard/stats", r.status_code == 200):
        passed += 1
    else:
        failed += 1

    stats = r.json()
    if test("Stats fields", all(k in stats for k in ["total_revenue", "total_orders", "total_products", "total_customers"])):
        passed += 1
    else:
        failed += 1

    r = requests.get(f"{BASE}/dashboard/revenue", headers=headers)
    if test("GET /dashboard/revenue (frontend path)", r.status_code == 200 and isinstance(r.json(), list)):
        passed += 1
    else:
        failed += 1

    rev = r.json()
    if rev:
        if test("Revenue data has date/revenue", "date" in rev[0] and "revenue" in rev[0]):
            passed += 1
        else:
            failed += 1
    else:
        passed += 1

    r = requests.get(f"{BASE}/dashboard/top-products", headers=headers)
    if test("GET /dashboard/top-products", r.status_code == 200):
        passed += 1
    else:
        failed += 1

    tp = r.json()
    if tp:
        if test("Top product has name/total_sold", "name" in tp[0] and "total_sold" in tp[0]):
            passed += 1
        else:
            failed += 1
    else:
        passed += 1

    r = requests.get(f"{BASE}/dashboard/category-distribution", headers=headers)
    if test("GET /dashboard/category-distribution", r.status_code == 200):
        passed += 1
    else:
        failed += 1

    cd = r.json()
    if cd:
        if test("Category dist has name/value", "name" in cd[0] and "value" in cd[0], f"keys={list(cd[0].keys())}"):
            passed += 1
        else:
            failed += 1
    else:
        passed += 1

    r = requests.get(f"{BASE}/dashboard/order-trends", headers=headers)
    if test("GET /dashboard/order-trends", r.status_code == 200):
        passed += 1
    else:
        failed += 1

    ot = r.json()
    if ot:
        if test("Order trend has date/orders", "date" in ot[0] and "orders" in ot[0], f"keys={list(ot[0].keys())}"):
            passed += 1
        else:
            failed += 1
    else:
        passed += 1

    r = requests.get(f"{BASE}/dashboard/recent-orders", headers=headers)
    if test("GET /dashboard/recent-orders", r.status_code == 200):
        passed += 1
    else:
        failed += 1

    ro = r.json()
    if ro:
        if test("Recent orders have items", "items" in ro[0] and isinstance(ro[0]["items"], list)):
            passed += 1
        else:
            failed += 1
    else:
        passed += 1

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed, {passed+failed} total")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
