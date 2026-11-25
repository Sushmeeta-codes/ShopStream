
const API_URL = "http://127.0.0.1:5000";

function getCurrentUser() {
    const user = localStorage.getItem("shopStreamLoggedInUser");

    return user ? JSON.parse(user) : null;
}

function getCartKey() {
    const user = getCurrentUser();

    if (!user || !user.email) {
        throw new Error("Please login first.");
    }

    return user.email.toLowerCase();
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || data.error || "Request failed");
    }

    return data;
}
