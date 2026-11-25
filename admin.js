const API_BASE = "http://127.0.0.1:5000/api";

const productForm = document.getElementById("product-form");
const productTable = document.getElementById("product-table");

const nameInput = document.getElementById("product-name");
const priceInput = document.getElementById("product-price");
const categoryInput = document.getElementById("product-category");
const imageInput = document.getElementById("product-image");
const descriptionInput = document.getElementById("product-description");

const editIndex = document.getElementById("edit-index");
const saveButton = document.getElementById("save-button");

let products = [];
let orders = [];


// LOAD PRODUCTS
async function loadProducts() {

    const response = await fetch(`${API_BASE}/products`);
    const data = await response.json();

    products = data.products || [];

    displayProducts();
    updateDashboardOverview();
}


// DISPLAY PRODUCTS
function displayProducts() {

    productTable.innerHTML = "";

    if (products.length === 0) {
        productTable.innerHTML =
            "<tr><td colspan='4'>No products found.</td></tr>";
        return;
    }

    products.forEach(product => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${product.name}</td>
            <td>Rs. ${product.price}</td>
            <td>${product.category}</td>
            <td>
                <button onclick="editProduct('${product.id}')">Edit</button>
                <button onclick="deleteProduct('${product.id}')">Delete</button>
            </td>
        `;

        productTable.appendChild(row);
    });
}


// ADD / UPDATE PRODUCT
productForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const product = {

        name: nameInput.value.trim(),

        price: Number(priceInput.value),

        category: categoryInput.value.trim(),

        image: imageInput.value.trim(),

        description: descriptionInput.value.trim()
    };

    const productId = editIndex.value;

    const url = productId
        ? `${API_BASE}/products/${productId}`
        : `${API_BASE}/products`;

    const method = productId ? "PUT" : "POST";

    try {

        const response = await fetch(url, {

            method: method,

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(product)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Product save failed");
        }

        alert(productId
            ? "Product updated successfully!"
            : "Product added successfully!"
        );

        productForm.reset();
        editIndex.value = "";
        saveButton.textContent = "Add Product";

        await loadProducts();

    } catch (error) {

        alert(error.message);
        console.error(error);
    }
});


// EDIT PRODUCT
window.editProduct = function(id) {

    const product = products.find(item => item.id === id);

    if (!product) return;

    nameInput.value = product.name;
    priceInput.value = product.price;
    categoryInput.value = product.category;
    imageInput.value = product.image || "";
    descriptionInput.value = product.description || "";

    editIndex.value = product.id;
    saveButton.textContent = "Update Product";

    productForm.scrollIntoView({
        behavior: "smooth"
    });
};


// DELETE PRODUCT
window.deleteProduct = async function(id) {

    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE}/products/${id}`,
            { method: "DELETE" }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Delete failed");
        }

        alert("Product deleted successfully!");

        await loadProducts();

    } catch (error) {
        alert(error.message);
    }
};


// LOAD ORDERS
async function loadOrders() {

    try {

        const response = await fetch(`${API_BASE}/admin/orders`);
        const data = await response.json();

        orders = data.orders || [];

        displayOrders();
        displayCustomers();
        displayAnalytics();
        updateDashboardOverview();

    } catch (error) {
        console.error("Orders loading error:", error);
    }
}


// DISPLAY ORDERS
function displayOrders() {

    const body = document.getElementById("orders-table-body");

    body.innerHTML = "";

    if (orders.length === 0) {
        body.innerHTML =
            "<tr><td colspan='7'>No orders found.</td></tr>";
        return;
    }

    orders.forEach(order => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.customerName}</td>
            <td>${new Date(order.orderDate).toLocaleDateString()}</td>
            <td>Rs. ${order.total}</td>
            <td>${order.paymentMethod}</td>
            <td>
                <select onchange="updateOrderStatus('${order.orderId}', this.value)">
                    ${["Pending","Processing","Shipped","Delivered","Cancelled"].map(status =>
                        `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`
                    ).join("")}
                </select>
            </td>
            <td>${order.city}</td>
        `;

        body.appendChild(row);
    });
}


// UPDATE STATUS
window.updateOrderStatus = async function(orderId, status) {

    try {

        const response = await fetch(
            `${API_BASE}/admin/orders/${orderId}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: status })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Status update failed");
        }

        alert("Order status updated!");

        await loadOrders();

    } catch (error) {
        alert(error.message);
    }
};


// DISPLAY CUSTOMERS
function displayCustomers() {

    const body = document.getElementById("customers-table-body");

    body.innerHTML = "";

    const customers = {};

    orders.forEach(order => {

        const email = order.email;

        if (!customers[email]) {
            customers[email] = {
                name: order.customerName,
                email: order.email,
                phone: order.phone,
                city: order.city,
                totalOrders: 0
            };
        }

        customers[email].totalOrders++;
    });

    Object.values(customers).forEach(customer => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.city}</td>
            <td>${customer.totalOrders}</td>
        `;

        body.appendChild(row);
    });

    if (Object.keys(customers).length === 0) {
        body.innerHTML =
            "<tr><td colspan='5'>No customers found.</td></tr>";
    }
}


// ANALYTICS
function displayAnalytics() {

    const validOrders = orders.filter(
        order => order.status !== "Cancelled"
    );

    const sales = validOrders.reduce(
        (sum, order) => sum + Number(order.total),
        0
    );

    const customers = new Set(
        orders.map(order => order.email)
    );

    document.getElementById("total-sales").textContent =
        "Rs. " + sales.toLocaleString("en-PK");

    document.getElementById("total-orders").textContent =
        orders.length;

    document.getElementById("total-customers").textContent =
        customers.size;

    const productSales = {};

    validOrders.forEach(order => {

        order.products.forEach(item => {

            productSales[item.name] =
                (productSales[item.name] || 0) + item.quantity;
        });
    });

    const body = document.getElementById("best-selling-body");

    body.innerHTML = "";

    Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, quantity]) => {

            body.innerHTML += `
                <tr>
                    <td>${name}</td>
                    <td>${quantity}</td>
                </tr>
            `;
        });

    if (Object.keys(productSales).length === 0) {
        body.innerHTML =
            "<tr><td colspan='2'>No product sales found.</td></tr>";
    }
}


// DASHBOARD OVERVIEW
function updateDashboardOverview() {

    const sales = orders
        .filter(order => order.status !== "Cancelled")
        .reduce((sum, order) => sum + Number(order.total), 0);

    document.getElementById("dashboard-sales").textContent =
        "Rs. " + sales.toLocaleString("en-PK");

    document.getElementById("dashboard-orders").textContent =
        orders.length;

    document.getElementById("dashboard-products").textContent =
        products.length;

    document.getElementById("dashboard-customers").textContent =
        new Set(orders.map(order => order.email)).size;
}


// START
loadProducts();
loadOrders();