const API_BASE = "http://127.0.0.1:5000/api";

const cartProducts = document.getElementById("cart-products");
const subtotalElement = document.getElementById("subtotal");
const totalElement = document.getElementById("total");

let cart = [];

function getCartKey() {
    let cartKey = localStorage.getItem("shopstreamCartKey");

    if (!cartKey) {
        cartKey = crypto.randomUUID();
        localStorage.setItem("shopstreamCartKey", cartKey);
    }

    return cartKey;
}


// Load cart from MongoDB
async function loadCart() {
    try {
        const cartKey = getCartKey();

        const response = await fetch(
            `${API_BASE}/cart/${cartKey}`
        );

        if (!response.ok) {
            throw new Error("Cart could not be loaded");
        }

        const data = await response.json();

        cart = data.items || [];
        displayCart();

    } catch (error) {
        console.error("Cart loading error:", error);

        cartProducts.innerHTML =
            "<p>Unable to load cart. Check your backend connection.</p>";
    }
}


// Display cart products
function displayCart() {
    cartProducts.innerHTML = "";

    if (cart.length === 0) {
        cartProducts.innerHTML = `
            <div class="empty-cart">
                <h2>Your cart is empty!</h2>
                <p>Go to our homepage and add some products.</p>
            </div>
        `;

        updateTotal();
        return;
    }

    cart.forEach(item => {
        const cartItem = document.createElement("div");

        cartItem.className = "cart-item";

        cartItem.innerHTML = `
            <img src="${item.image || ""}" alt="${item.name}"
                 onerror="this.style.display='none'">

            <div class="item-info">
                <h3>${item.name}</h3>

                <p class="item-price">
                    Rs. ${Number(item.price).toLocaleString("en-PK")}
                </p>

                <div class="quantity-control">
                    <button class="decrease" data-id="${item.productId}">−</button>

                    <span>${item.quantity}</span>

                    <button class="increase" data-id="${item.productId}">+</button>
                </div>

                <button class="remove-button" data-id="${item.productId}">
                    Remove
                </button>
            </div>
        `;

        cartProducts.appendChild(cartItem);
    });

    updateTotal();
}


// Calculate total
function updateTotal() {
    const subtotal = cart.reduce((sum, item) => {
        return sum + (Number(item.price) * item.quantity);
    }, 0);

    subtotalElement.textContent =
        "Rs. " + subtotal.toLocaleString("en-PK");

    totalElement.textContent =
        "Rs. " + subtotal.toLocaleString("en-PK");
}


// Handle cart buttons
cartProducts.addEventListener("click", async function(event) {
    const button = event.target;

    const productId = button.dataset.id;

    if (!productId) return;

    const selectedItem = cart.find(
        item => item.productId === productId
    );

    if (!selectedItem) return;

    const cartKey = getCartKey();

    try {
        if (button.classList.contains("increase")) {
            await updateQuantity(
                cartKey,
                productId,
                selectedItem.quantity + 1
            );
        }

        else if (button.classList.contains("decrease")) {
            if (selectedItem.quantity > 1) {
                await updateQuantity(
                    cartKey,
                    productId,
                    selectedItem.quantity - 1
                );
            }
        }

        else if (button.classList.contains("remove-button")) {
            await fetch(
                `${API_BASE}/cart/${cartKey}/items/${productId}`,
                { method: "DELETE" }
            );

            await loadCart();
        }

    } catch (error) {
        console.error("Cart update error:", error);
        alert("Unable to update cart.");
    }
});


// Update quantity through API
async function updateQuantity(cartKey, productId, quantity) {
    const response = await fetch(
        `${API_BASE}/cart/${cartKey}/items/${productId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ quantity: quantity })
        }
    );

    if (!response.ok) {
        throw new Error("Quantity update failed");
    }

    await loadCart();
}


// Checkout button
document.getElementById("checkout-button")
    .addEventListener("click", function() {

        if (cart.length === 0) {
            alert("Your shopping cart is empty!");
            return;
        }

        window.location.href = "checkout.html";
    });


// Load cart when page opens
loadCart();