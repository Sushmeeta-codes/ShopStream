const API_BASE = "http://127.0.0.1:5000/api";

const checkoutProducts = document.getElementById("checkout-products");
const checkoutForm = document.getElementById("checkout-form");

let cart = [];
let cartKey = localStorage.getItem("shopstreamCartKey");

async function loadCheckout() {

    if (!cartKey) {
        checkoutProducts.innerHTML = "<p>Your cart is empty.</p>";
        document.getElementById("place-order").disabled = true;
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/cart/${cartKey}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Cart loading failed");
        }

        cart = data.items || [];

        displayCheckout();

    } catch (error) {
        console.error(error);
        checkoutProducts.innerHTML =
            "<p>Unable to load your order.</p>";
    }
}


function displayCheckout() {

    checkoutProducts.innerHTML = "";

    if (cart.length === 0) {

        checkoutProducts.innerHTML = "<p>Your cart is empty.</p>";

        document.getElementById("subtotal").textContent = "Rs. 0";
        document.getElementById("total").textContent = "Rs. 0";
        document.getElementById("place-order").disabled = true;

        return;
    }

    document.getElementById("place-order").disabled = false;

    cart.forEach(item => {

        const product = document.createElement("div");

        product.className = "checkout-product";

        product.innerHTML = `
            <img src="${item.image || ""}" alt="${item.name}"
                 onerror="this.style.display='none'">

            <div class="checkout-product-info">
                <h3>${item.name}</h3>
                <p>Quantity: ${item.quantity}</p>
                <p>Rs. ${(item.price * item.quantity).toLocaleString("en-PK")}</p>
            </div>
        `;

        checkoutProducts.appendChild(product);
    });

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    document.getElementById("subtotal").textContent =
        "Rs. " + total.toLocaleString("en-PK");

    document.getElementById("total").textContent =
        "Rs. " + total.toLocaleString("en-PK");
}


// PLACE ORDER
checkoutForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const selectedPayment =
        document.querySelector('input[name="payment"]:checked');

    if (!selectedPayment) {
        alert("Select a payment method.");
        return;
    }

    const orderData = {

        cart_key: cartKey,

        customerName:
            document.getElementById("customer-name").value.trim(),

        phone:
            document.getElementById("phone").value.trim(),

        email:
            document.getElementById("email").value.trim(),

        address:
            document.getElementById("address").value.trim(),

        city:
            document.getElementById("city").value.trim(),

        paymentMethod: selectedPayment.value
    };

    const placeButton = document.getElementById("place-order");
    placeButton.disabled = true;

    try {

        const response = await fetch(`${API_BASE}/orders`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Order failed");
        }

        localStorage.setItem(
            "shopStreamCustomerEmail",
            orderData.email
        );

        cart = [];

        checkoutProducts.innerHTML =
            "<p>Your order has been saved successfully.</p>";

        document.getElementById("subtotal").textContent = "Rs. 0";
        document.getElementById("total").textContent = "Rs. 0";

        checkoutForm.hidden = true;

        const order = data.order;

        document.getElementById("order-message").hidden = false;

        document.getElementById("order-message").innerHTML = `
            <h2>Order Placed Successfully!</h2>

            <p>Thank you for shopping with ShopStream.</p>

            <h3>Order ID: ${order.orderId}</h3>

            <p>Customer: ${order.customerName}</p>

            <p>Payment: ${order.paymentMethod}</p>

            <p>Total Amount: Rs. ${Number(order.total).toLocaleString("en-PK")}</p>

            <p>Status: ${order.status}</p>

            <p><a href="my-orders.html">View My Orders</a></p>

            <p><a href="home.html">Continue Shopping</a></p>
        `;

        alert("Your order has been placed successfully!");

    } catch (error) {

        console.error("Order error:", error);

        alert(error.message);

        placeButton.disabled = false;
    }
});


loadCheckout();