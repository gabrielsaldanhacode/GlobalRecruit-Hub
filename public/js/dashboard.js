
const dashboard = document.querySelector(".dashboard-container");
const athleteEmail = document.getElementById("athlete-email");
const logoutButton = document.getElementById("logout-button");
const dashboardMessage = document.getElementById("dashboard-message");

async function loadDashboard() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin"
    });

    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load your account.");
    }

    const data = await response.json();

    athleteEmail.textContent = `Signed in as ${data.athlete.email}`;
    dashboard.hidden = false;
  } catch (error) {
    dashboard.hidden = false;
    dashboardMessage.textContent = error.message;
    dashboardMessage.classList.add("error");
    logoutButton.disabled = true;
  }
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("Unable to log out. Please try again.");
    }

    window.location.replace("/login.html");
  } catch (error) {
    dashboardMessage.textContent = error.message;
    dashboardMessage.classList.add("error");
    logoutButton.disabled = false;
  }
});

loadDashboard();
