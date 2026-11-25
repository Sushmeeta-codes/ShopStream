const API_BASE = "http://127.0.0.1:5000/api";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const productDetails = document.getElementById("product-details");

let quantity = 1;
let selectedProduct = null;

// Product ko MongoDB backend se fetch karna
async function loadProduct() {
    if (!productId) {
        productDetails.innerHTML = "<h2>Product ID is missing.</h2>";
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/products/${encodeURIComponent(productId)}`
        );

        if (!response.ok) {
            throw new Error("Product could not be loaded.");
        }

        const data = await response.json();

        selectedProduct = data.product || data;

        if (!selectedProduct || !selectedProduct.id) {
            throw new Error("Product not found.");
        }

        displayProduct();

    } catch (error) {
        console.error("Product loading error:", error);

        productDetails.innerHTML = `
            <h2>Unable to load product.</h2>
            <p>Please check your backend connection.</p>
        `;
    }
}

// Product details display karna
function displayProduct() {
    productDetails.innerHTML = `
        <img src="${selectedProduct.image || ""}"
             alt="${selectedProduct.name}"
             onerror="this.style.display='none'">

        <div class="details-info">
            <p class="details-category">${selectedProduct.category}</p>

            <h1>${selectedProduct.name}</h1>

            <p class="details-price">
                Rs. ${Number(selectedProduct.price).toLocaleString("en-PK")}
            </p>

            <p class="details-description">
                ${selectedProduct.description || "No description available."}
            </p>

            <p class="quantity-label">Select Quantity:</p>

            <div class="quantity-control">
                <button id="decrease">−</button>
                <span id="quantity">1</span>
                <button id="increase">+</button>
            </div>

            <button class="add-button" id="add-to-cart">
                Add to Cart
            </button>
        </div>
    `;

    // Quantity increase
    document.getElementById("increase").addEventListener("click", function() {
        quantity++;
        document.getElementById("quantity").textContent = quantity;
    });

    // Quantity decrease
    document.getElementById("decrease").addEventListener("click", function() {
        if (quantity > 1) {
            quantity--;
            document.getElementById("quantity").textContent = quantity;
        }
    });

    // Add to cart
    document.getElementById("add-to-cart").addEventListener("click", addToCart);
}

// Filhal cart ko browser localStorage mein rakh rahe hain.
// Next Step 16 mein isi cart ko MongoDB collection se connect karenge.
async function addToCart() {
    let cartKey = localStorage.getItem("shopstreamCartKey");

    if (!cartKey) {
        cartKey = crypto.randomUUID();
        localStorage.setItem("shopstreamCartKey", cartKey);
    }

    try {
        const response = await fetch(
            `${API_BASE}/cart/${cartKey}/items`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    quantity: quantity
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not add product");
        }

        alert("Product added to cart successfully!");

    } catch (error) {
        console.error("Add to cart error:", error);
        alert("Unable to add product. Please check backend.");
    }
}

loadProduct();