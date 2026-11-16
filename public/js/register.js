
const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("form-message");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword =
    document.getElementById("confirm-password").value;

  const submitButton = registerForm.querySelector(
    "button[type='submit']"
  );

  registerMessage.textContent = "";
  registerMessage.className = "form-message";

  if (password !== confirmPassword) {
    registerMessage.textContent = "Passwords do not match.";
    registerMessage.classList.add("error");
    return;
  }

  if (new TextEncoder().encode(password).length > 72) {
    registerMessage.textContent = "Password is too long. Try fewer characters, especially when using accented letters or emoji.";
    registerMessage.classList.add("error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Creating account...";

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed.");
    }

    registerMessage.textContent = "Account created successfully!";
    registerMessage.classList.add("success");

    window.location.assign("/dashboard.html");
  } catch (error) {
    registerMessage.textContent = error.message;
    registerMessage.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Create Account";
  }
});
