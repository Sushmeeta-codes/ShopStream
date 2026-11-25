from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime, timezone
import os

from database import init_db, mongo


load_dotenv()

app = Flask(__name__)

app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

CORS(app)

init_db(app)


# Convert MongoDB ObjectId into string
def format_product(product):

    return {
        "id": str(product["_id"]),
        "name": product.get("name", ""),
        "price": product.get("price", 0),
        "category": product.get("category", ""),
        "image": product.get("image", ""),
        "description": product.get("description", "")
    }


@app.route("/")
def home():

    return jsonify({
        "message": "Welcome to ShopStream Backend"
    })


@app.route("/api/health")
def health():

    try:

        mongo.cx.admin.command("ping")

        return jsonify({
            "ok": True,
            "database": "shopstream_db",
            "message": "MongoDB Connected Successfully"
        })

    except Exception as error:

        return jsonify({
            "ok": False,
            "message": str(error)
        }), 500


# READ ALL PRODUCTS
@app.route("/api/products", methods=["GET"])
def get_products():

    products = mongo.db.products.find().sort("created_at", -1)

    result = [format_product(product) for product in products]

    return jsonify(result)


# READ ONE PRODUCT
@app.route("/api/products/<product_id>", methods=["GET"])
def get_single_product(product_id):

    if not ObjectId.is_valid(product_id):

        return jsonify({"error": "Invalid product ID"}), 400

    product = mongo.db.products.find_one({
        "_id": ObjectId(product_id)
    })

    if not product:

        return jsonify({"error": "Product not found"}), 404

    return jsonify(format_product(product))


# CREATE PRODUCT
@app.route("/api/products", methods=["POST"])
def create_product():

    data = request.get_json(silent=True) or {}

    required_fields = [
        "name",
        "price",
        "category",
        "image",
        "description"
    ]

    for field in required_fields:

        if field not in data:

            return jsonify({
                "error": f"{field} is required"
            }), 400

    try:

        price = float(data["price"])

        if price <= 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Price must be a positive number"
        }), 400

    product = {
        "name": str(data["name"]).strip(),
        "price": price,
        "category": str(data["category"]).strip(),
        "image": str(data["image"]).strip(),
        "description": str(data["description"]).strip(),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = mongo.db.products.insert_one(product)

    saved_product = mongo.db.products.find_one({
        "_id": result.inserted_id
    })

    return jsonify({
        "message": "Product added successfully",
        "product": format_product(saved_product)
    }), 201


# UPDATE PRODUCT
@app.route("/api/products/<product_id>", methods=["PUT"])
def update_product(product_id):

    if not ObjectId.is_valid(product_id):

        return jsonify({"error": "Invalid product ID"}), 400

    data = request.get_json(silent=True) or {}

    allowed_fields = [
        "name",
        "price",
        "category",
        "image",
        "description"
    ]

    update_data = {}

    for field in allowed_fields:

        if field in data:
            update_data[field] = data[field]

    if "price" in update_data:

        try:

            update_data["price"] = float(update_data["price"])

            if update_data["price"] <= 0:
                raise ValueError

        except (ValueError, TypeError):

            return jsonify({"error": "Invalid price"}), 400

    if not update_data:

        return jsonify({"error": "No fields to update"}), 400

    update_data["updated_at"] = datetime.now(timezone.utc)

    result = mongo.db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:

        return jsonify({"error": "Product not found"}), 404

    product = mongo.db.products.find_one({
        "_id": ObjectId(product_id)
    })

    return jsonify({
        "message": "Product updated successfully",
        "product": format_product(product)
    })


# DELETE PRODUCT
@app.route("/api/products/<product_id>", methods=["DELETE"])
def delete_product(product_id):

    if not ObjectId.is_valid(product_id):

        return jsonify({"error": "Invalid product ID"}), 400

    result = mongo.db.products.delete_one({
        "_id": ObjectId(product_id)
    })

    if result.deleted_count == 0:

        return jsonify({"error": "Product not found"}), 404

    return jsonify({
        "message": "Product deleted successfully"
    })

# =========================
# CART API ROUTES
# =========================

def get_cart_document(cart_key):
    return mongo.db.carts.find_one({"cart_key": cart_key})


def format_cart(cart_key):
    cart = get_cart_document(cart_key)

    if not cart:
        return {
            "cart_key": cart_key,
            "items": [],
            "total": 0
        }

    formatted_items = []
    total = 0

    for item in cart.get("items", []):
        product_id = item.get("product_id")
        quantity = int(item.get("quantity", 1))

        if not ObjectId.is_valid(product_id):
            continue

        product = mongo.db.products.find_one({
            "_id": ObjectId(product_id)
        })

        if not product:
            continue

        price = float(product.get("price", 0))
        item_total = price * quantity
        total += item_total

        formatted_items.append({
            "productId": str(product["_id"]),
            "name": product.get("name", ""),
            "price": price,
            "image": product.get("image", ""),
            "category": product.get("category", ""),
            "quantity": quantity,
            "itemTotal": item_total
        })

    return {
        "cart_key": cart_key,
        "items": formatted_items,
        "total": total
    }


# GET CART
@app.route("/api/cart/<cart_key>", methods=["GET"])
def get_cart(cart_key):
    return jsonify(format_cart(cart_key)), 200


# ADD PRODUCT TO CART
@app.route("/api/cart/<cart_key>/items", methods=["POST"])
def add_cart_item(cart_key):
    data = request.get_json(silent=True) or {}

    product_id = str(data.get("product_id", ""))
    quantity = data.get("quantity", 1)

    if not ObjectId.is_valid(product_id):
        return jsonify({"error": "Invalid product ID"}), 400

    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return jsonify({"error": "Quantity must be a number"}), 400

    if quantity < 1:
        return jsonify({"error": "Quantity must be at least 1"}), 400

    product = mongo.db.products.find_one({
        "_id": ObjectId(product_id)
    })

    if not product:
        return jsonify({"error": "Product not found"}), 404

    cart = get_cart_document(cart_key)

    if not cart:
        mongo.db.carts.insert_one({
            "cart_key": cart_key,
            "user_id": None,
            "items": [{
                "product_id": product_id,
                "quantity": quantity
            }],
            "updated_at": datetime.now(timezone.utc)
        })
    else:
        items = cart.get("items", [])
        found = False

        for item in items:
            if item.get("product_id") == product_id:
                item["quantity"] += quantity
                found = True
                break

        if not found:
            items.append({
                "product_id": product_id,
                "quantity": quantity
            })

        mongo.db.carts.update_one(
            {"cart_key": cart_key},
            {"$set": {
                "items": items,
                "updated_at": datetime.now(timezone.utc)
            }}
        )

    return jsonify({
        "message": "Product added to cart",
        "cart": format_cart(cart_key)
    }), 200


# UPDATE CART QUANTITY
@app.route("/api/cart/<cart_key>/items/<product_id>", methods=["PATCH"])
def update_cart_item(cart_key, product_id):
    data = request.get_json(silent=True) or {}

    try:
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid quantity"}), 400

    if quantity < 1:
        return jsonify({"error": "Quantity must be at least 1"}), 400

    cart = get_cart_document(cart_key)

    if not cart:
        return jsonify({"error": "Cart not found"}), 404

    items = cart.get("items", [])
    found = False

    for item in items:
        if item.get("product_id") == product_id:
            item["quantity"] = quantity
            found = True
            break

    if not found:
        return jsonify({"error": "Cart item not found"}), 404

    mongo.db.carts.update_one(
        {"cart_key": cart_key},
        {"$set": {
            "items": items,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return jsonify({
        "message": "Cart quantity updated",
        "cart": format_cart(cart_key)
    }), 200


# REMOVE PRODUCT FROM CART
@app.route("/api/cart/<cart_key>/items/<product_id>", methods=["DELETE"])
def remove_cart_item(cart_key, product_id):
    cart = get_cart_document(cart_key)

    if not cart:
        return jsonify({"error": "Cart not found"}), 404

    items = [
        item for item in cart.get("items", [])
        if item.get("product_id") != product_id
    ]

    mongo.db.carts.update_one(
        {"cart_key": cart_key},
        {"$set": {
            "items": items,
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return jsonify({
        "message": "Product removed from cart",
        "cart": format_cart(cart_key)
    }), 200


# CLEAR CART
@app.route("/api/cart/<cart_key>", methods=["DELETE"])
def clear_cart(cart_key):
    mongo.db.carts.update_one(
        {"cart_key": cart_key},
        {"$set": {
            "items": [],
            "updated_at": datetime.now(timezone.utc)
        }}
    )

    return jsonify({"message": "Cart cleared"}), 200

# =====================================
# ORDER API
# =====================================

@app.route("/api/orders", methods=["POST"])
def place_order():

    data = request.get_json(silent=True) or {}

    required_fields = [
        "cart_key",
        "customerName",
        "phone",
        "email",
        "address",
        "city",
        "paymentMethod"
    ]

    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "error": f"{field} is required"
            }), 400

    cart = mongo.db.carts.find_one({
        "cart_key": data["cart_key"]
    })

    if not cart or not cart.get("items"):
        return jsonify({"error": "Cart is empty"}), 400

    order_products = []
    total = 0

    for item in cart["items"]:

        product_id = item.get("product_id")
        quantity = int(item.get("quantity", 1))

        if not ObjectId.is_valid(product_id) or quantity < 1:
            return jsonify({"error": "Invalid cart item"}), 400

        product = mongo.db.products.find_one({
            "_id": ObjectId(product_id)
        })

        if not product:
            return jsonify({"error": "A cart product no longer exists"}), 400

        price = float(product.get("price", 0))
        amount = price * quantity

        order_products.append({
            "productId": str(product["_id"]),
            "name": product.get("name", ""),
            "category": product.get("category", ""),
            "image": product.get("image", ""),
            "price": price,
            "quantity": quantity,
            "amount": amount
        })

        total += amount

    order_id = "SS" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")

    now = datetime.now(timezone.utc)

    order = {
        "orderId": order_id,
        "customerName": data["customerName"].strip(),
        "phone": data["phone"].strip(),
        "email": data["email"].strip().lower(),
        "address": data["address"].strip(),
        "city": data["city"].strip(),
        "paymentMethod": data["paymentMethod"],
        "products": order_products,
        "total": total,
        "orderDate": now,
        "status": "Pending"
    }

    mongo.db.orders.insert_one(order)

    mongo.db.order_status_history.insert_one({
        "order_id": order_id,
        "previous_status": None,
        "new_status": "Pending",
        "changed_at": now,
        "changed_by": "System"
    })

    mongo.db.carts.update_one(
        {"cart_key": data["cart_key"]},
        {"$set": {
            "items": [],
            "updated_at": now
        }}
    )

    return jsonify({
        "message": "Order placed successfully",
        "order": {
            **order,
            "_id": None
        }
    }), 201


# GET CUSTOMER ORDERS
@app.route("/api/orders", methods=["GET"])
def get_customer_orders():

    email = request.args.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Customer email is required"}), 400

    orders = list(
        mongo.db.orders.find(
            {"email": email}
        ).sort("orderDate", -1)
    )

    for order in orders:
        order["_id"] = str(order["_id"])
        if isinstance(order.get("orderDate"), datetime):
            order["orderDate"] = order["orderDate"].isoformat()

    return jsonify({"orders": orders}), 200


# ADMIN: GET ALL ORDERS
@app.route("/api/admin/orders", methods=["GET"])
def admin_get_orders():

    orders = list(
        mongo.db.orders.find().sort("orderDate", -1)
    )

    for order in orders:
        order["_id"] = str(order["_id"])
        if isinstance(order.get("orderDate"), datetime):
            order["orderDate"] = order["orderDate"].isoformat()

    return jsonify({"orders": orders}), 200


# ADMIN: UPDATE ORDER STATUS
@app.route("/api/admin/orders/<order_id>/status", methods=["PATCH"])
def admin_update_order_status(order_id):

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")

    allowed_statuses = [
        "Pending", "Processing", "Shipped",
        "Delivered", "Cancelled"
    ]

    if new_status not in allowed_statuses:
        return jsonify({"error": "Invalid order status"}), 400

    order = mongo.db.orders.find_one({"orderId": order_id})

    if not order:
        return jsonify({"error": "Order not found"}), 404

    old_status = order.get("status", "Pending")
    now = datetime.now(timezone.utc)

    mongo.db.orders.update_one(
        {"orderId": order_id},
        {"$set": {"status": new_status}}
    )

    mongo.db.order_status_history.insert_one({
        "order_id": order_id,
        "previous_status": old_status,
        "new_status": new_status,
        "changed_at": now,
        "changed_by": "Admin"
    })

    return jsonify({
        "message": "Order status updated successfully"
    }), 200

# =====================================
# MONGODB AGGREGATION ANALYTICS
# =====================================

@app.route("/api/analytics", methods=["GET"])
def get_analytics():

    db = mongo.db

    # 1. Monthly Revenue
    monthly_revenue = list(db.orders.aggregate([
        {"$match": {"status": {"$ne": "Cancelled"}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m",
                        "date": "$orderDate"
                    }
                },
                "revenue": {"$sum": "$total"},
                "orders": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]))

    # 2. Top Selling Products
    top_products = list(db.orders.aggregate([
        {"$match": {"status": {"$ne": "Cancelled"}}},
        {"$unwind": "$products"},
        {
            "$group": {
                "_id": "$products.name",
                "quantity_sold": {
                    "$sum": "$products.quantity"
                },
                "revenue": {
                    "$sum": "$products.amount"
                }
            }
        },
        {"$sort": {"quantity_sold": -1}},
        {"$limit": 10}
    ]))

    # 3. Orders by Status
    orders_by_status = list(db.orders.aggregate([
        {
            "$group": {
                "_id": "$status",
                "total_orders": {"$sum": 1}
            }
        },
        {"$sort": {"total_orders": -1}}
    ]))

    # 4. Revenue by Category
    revenue_by_category = list(db.orders.aggregate([
        {"$match": {"status": {"$ne": "Cancelled"}}},
        {"$unwind": "$products"},
        {
            "$group": {
                "_id": "$products.category",
                "total_revenue": {
                    "$sum": "$products.amount"
                },
                "units_sold": {
                    "$sum": "$products.quantity"
                }
            }
        },
        {"$sort": {"total_revenue": -1}}
    ]))

    # 5. Average Order Value
    average_order = list(db.orders.aggregate([
        {"$match": {"status": {"$ne": "Cancelled"}}},
        {
            "$group": {
                "_id": None,
                "average_order_value": {"$avg": "$total"},
                "total_revenue": {"$sum": "$total"},
                "total_orders": {"$sum": 1}
            }
        }
    ]))

    return jsonify({
        "monthly_revenue": monthly_revenue,
        "top_products": top_products,
        "orders_by_status": orders_by_status,
        "revenue_by_category": revenue_by_category,
        "average_order": average_order
    }), 200


# =====================================
# PRODUCT TEXT SEARCH
# =====================================

@app.route("/api/search", methods=["GET"])
def search_products():

    keyword = request.args.get("q", "").strip()

    if not keyword:
        return jsonify({"products": []}), 200

    products = list(
        mongo.db.products.find(
            {"$text": {"$search": keyword}},
            {"score": {"$meta": "textScore"}}
        ).sort([
            ("score", {"$meta": "textScore"})
        ])
    )

    for product in products:
        product["id"] = str(product["_id"])
        product.pop("_id", None)
        product.pop("score", None)

    return jsonify({"products": products}), 200

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must be at least 8 characters"
        }), 400

    if mongo.db.users.find_one({"email": email}):
        return jsonify({
            "success": False,
            "message": "Email already registered"
        }), 409

    mongo.db.users.insert_one({
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "role": "customer",
        "created_at": datetime.now(timezone.utc)
    })

    return jsonify({
        "success": True,
        "message": "Account created successfully"
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = mongo.db.users.find_one({"email": email})

    if not user or not check_password_hash(
        user.get("password_hash", ""), password
    ):
        return jsonify({
            "success": False,
            "message": "Invalid email or password"
        }), 401

    return jsonify({
        "success": True,
        "message": "Login successful",
        "user": {
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "customer")
        }
    }), 200

if __name__ == "__main__":

    app.run(debug=True, port=5000)