
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("form-message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const submitButton = loginForm.querySelector(
    "button[type='submit']"
  );

  loginMessage.textContent = "";
  loginMessage.className = "form-message";

  submitButton.disabled = true;
  submitButton.textContent = "Signing in...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed.");
    }

    window.location.assign("/dashboard.html");
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign In";
  }
});
