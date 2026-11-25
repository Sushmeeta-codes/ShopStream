
const API_URL = "http://127.0.0.1:5000";

// Get HTML elements
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

const message = document.getElementById("message");

// Show Signup Form
showSignup.addEventListener("click", function(event) {
    event.preventDefault();

    loginForm.classList.add("hidden");
    signupForm.classList.remove("hidden");

    message.textContent = "";
});

// Show Login Form
showLogin.addEventListener("click", function(event) {
    event.preventDefault();

    signupForm.classList.add("hidden");
    loginForm.classList.remove("hidden");

    message.textContent = "";
});

// SIGNUP: Save user in MongoDB
document.getElementById("signupFormElement")
.addEventListener("submit", async function(event) {

    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        message.style.color = "red";
        message.textContent = "Passwords do not match!";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Signup failed.");
        }

        message.style.color = "green";
        message.textContent = "Account created successfully! Please sign in.";

        document.getElementById("signupFormElement").reset();

        signupForm.classList.add("hidden");
        loginForm.classList.remove("hidden");

    } catch (error) {
        message.style.color = "red";
        message.textContent = error.message;
    }
});

// LOGIN: Verify user from MongoDB
document.getElementById("loginFormElement")
.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Invalid email or password.");
        }

        // Keep only temporary login information for this browser tab
        sessionStorage.setItem(
            "shopStreamLoggedInUser",
            JSON.stringify(data.user)
        );

        message.style.color = "green";
        message.textContent = "Login successful!";

        window.location.href = "home.html";

    } catch (error) {
        message.style.color = "red";
        message.textContent = error.message;
    }
});
