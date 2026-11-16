const page = document.getElementById("profile-page");
const form = document.getElementById("profile-form");
const message = document.getElementById("profile-message");
const fields = ["full_name", "country", "sport", "position", "academic_context", "gpa", "graduation_year", "highlight_url"];

async function loadProfile() {
  try {
    const response = await fetch("/api/profile", { credentials: "same-origin" });
    if (response.status === 401) {
      window.location.replace("/login.html");
      return;
    }
    if (!response.ok) throw new Error("Unable to load your profile. Please refresh the page.");
    const { profile } = await response.json();
    if (profile) for (const key of fields) document.getElementById(key).value = profile[key] ?? "";
    page.hidden = false;
  } catch (error) {
    page.hidden = false;
    form.hidden = true;
    message.textContent = error.message;
    message.classList.add("error");
    page.querySelector(".auth-card").append(message);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  message.textContent = "";
  message.className = "form-message";
  const profile = Object.fromEntries(fields.map(key => [key, document.getElementById(key).value.trim()]));
  profile.gpa = profile.gpa === "" ? null : Number(profile.gpa);
  profile.graduation_year = Number(profile.graduation_year);
  try {
    const response = await fetch("/api/profile", {
      method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to save your profile.");
    message.textContent = "Profile saved.";
    message.classList.add("success");
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("error");
  } finally {
    button.disabled = false;
  }
});

loadProfile();
