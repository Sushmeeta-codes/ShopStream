const API_BASE = "http://127.0.0.1:5000/api";

const ordersList = document.getElementById("orders-list");

async function loadOrders() {

    const email = localStorage.getItem("shopStreamCustomerEmail");

    if (!email) {
        ordersList.innerHTML = `
            <div class="empty-orders">
                <h2>No Customer Email Found</h2>
                <p>Place an order first to view your orders.</p>
            </div>
        `;
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/orders?email=${encodeURIComponent(email)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Orders could not load");
        }

        displayOrders(data.orders || []);

    } catch (error) {

        console.error(error);

        ordersList.innerHTML =
            "<p>Unable to load orders. Check backend.</p>";
    }
}


function displayOrders(orders) {

    ordersList.innerHTML = "";

    if (orders.length === 0) {

        ordersList.innerHTML = `
            <div class="empty-orders">
                <h2>No Orders Yet!</h2>
                <p>You haven't placed any orders.</p>
                <a href="home.html">Start Shopping</a>
            </div>
        `;

        return;
    }

    orders.forEach(order => {

        const orderCard = document.createElement("div");

        orderCard.className = "order-card";

        const productsHTML = (order.products || []).map(item => `
            <div class="ordered-product">

                <img src="${item.image || ""}" alt="${item.name}"
                     onerror="this.style.display='none'">

                <div class="ordered-product-info">
                    <h3>${item.name}</h3>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: Rs. ${Number(item.price).toLocaleString("en-PK")}</p>
                </div>

            </div>
        `).join("");

        orderCard.innerHTML = `
            <div class="order-header">
                <div>
                    <strong>Order ID: ${order.orderId}</strong>
                    <p>Order Date: ${new Date(order.orderDate).toLocaleString()}</p>
                </div>

                <span class="order-status">${order.status}</span>
            </div>

            <div class="ordered-products">
                ${productsHTML}
            </div>

            <div class="order-footer">
                <div>
                    <p>Payment: ${order.paymentMethod}</p>
                    <p>Delivery: ${order.city}</p>
                </div>

                <p class="order-total">
                    Total: Rs. ${Number(order.total).toLocaleString("en-PK")}
                </p>
            </div>
        `;

        ordersList.appendChild(orderCard);
    });
}


loadOrders();