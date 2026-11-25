const API_URL = "http://127.0.0.1:5000/api";

let products = [];
let cart = JSON.parse(localStorage.getItem("shopstreamCart")) || [];

const productGrid = document.getElementById("product-grid");
const noProducts = document.getElementById("no-products");
const searchInput = document.getElementById("search-input");
const cartCount = document.getElementById("cart-count");


// Update cart count
function updateCartCount() {

    cartCount.textContent = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );
}


// Display products
function displayProducts(productList) {

    productGrid.innerHTML = "";

    if (productList.length === 0) {

        noProducts.hidden = false;
        return;
    }

    noProducts.hidden = true;

    productList.forEach(product => {

        const card = document.createElement("div");

        card.className = "product-card";

        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}">

            <div class="product-info">

                <p class="product-category">
                    ${product.category}
                </p>

                <h3>${product.name}</h3>

                <p class="product-price">
                    Rs. ${Number(product.price).toLocaleString("en-PK")}
                </p>

                <a class="details-button"
                   href="product.html?id=${product.id}">
                   View Details
                </a>

                <button class="add-button"
                        data-id="${product.id}">
                    Add to Cart
                </button>

            </div>
        `;

        productGrid.appendChild(card);

    });
}


// Load products from MongoDB API
async function loadProducts() {

    try {

        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
            throw new Error("Could not load products");
        }

        products = await response.json();

        displayProducts(products);

    } catch (error) {

        console.error("Product loading error:", error);

        noProducts.hidden = false;
        noProducts.textContent =
            "Unable to load products. Please try again.";

    }
}


// Add product to cart (temporary local cart)
productGrid.addEventListener("click", function(event) {

    if (!event.target.classList.contains("add-button")) {
        return;
    }

    const productId = event.target.dataset.id;

    const product = products.find(
        item => item.id === productId
    );

    if (!product) return;

    const existingProduct = cart.find(
        item => item.productId === productId
    );

    if (existingProduct) {

        existingProduct.quantity++;

    } else {

        cart.push({

            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1

        });

    }

    localStorage.setItem(
        "shopstreamCart",
        JSON.stringify(cart)
    );

    updateCartCount();

    alert("Product added to cart!");

});


// Search products
searchInput.addEventListener("input", function() {

    const searchText = this.value.toLowerCase();

    const filteredProducts = products.filter(product =>

        product.name.toLowerCase().includes(searchText) ||

        product.category.toLowerCase().includes(searchText)

    );

    displayProducts(filteredProducts);

});


// Category filters
document.querySelectorAll(".category-btn").forEach(button => {

    button.addEventListener("click", function() {

        document.querySelectorAll(".category-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        this.classList.add("active");

        const selectedCategory = this.dataset.category;

        const filteredProducts = selectedCategory === "All"

            ? products

            : products.filter(product =>
                product.category === selectedCategory
            );

        searchInput.value = "";

        displayProducts(filteredProducts);

    });

});


// Initial page setup
updateCartCount();
loadProducts();