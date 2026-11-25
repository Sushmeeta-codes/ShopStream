from app import app, mongo


COLLECTIONS = [
    "users",
    "products",
    "carts",
    "orders",
    "order_status_history"
]


with app.app_context():

    db = mongo.db 

    print("Product text search index created!")

    existing_collections = db.list_collection_names()

    # Create missing collections
    for collection_name in COLLECTIONS:

        if collection_name not in existing_collections:

            db.create_collection(collection_name)

            print(f"Created collection: {collection_name}")

        else:

            print(f"Already exists: {collection_name}")

    # Unique email for every user
    db.users.create_index(
        [("email", 1)],
        unique=True,
        name="unique_user_email"
    )

    # Unique cart key
    db.carts.create_index(
        [("cart_key", 1)],
        unique=True,
        name="unique_cart_key"
    )

   # Unique order ID
    db.orders.create_index(
        [("orderId", 1)],
        unique=True,
        name="unique_orderId"
    )

    # Order history lookup
    db.order_status_history.create_index(
        [("order_id", 1), ("changed_at", -1)],
        name="order_history_lookup"
    )

    print("\nAll 5 collections are ready!")
    print("Required unique indexes are ready!")



    mongo.db.products.create_index(
    [
        ("name", "text"),
        ("category", "text"),
        ("description", "text")
    ],
    name="product_text_search"
)

print("Product text search index created!")