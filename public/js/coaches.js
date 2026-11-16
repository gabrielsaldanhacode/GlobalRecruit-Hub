const search = document.getElementById("coach-search");
const list = document.getElementById("coach-list");
const message = document.getElementById("coach-message");
let requestId = 0;

async function loadCoaches() {
  const current = ++requestId;
  message.textContent = "Loading coaches…";
  try {
    const response = await fetch(`/api/coaches?q=${encodeURIComponent(search.value.trim())}`);
    if (!response.ok) throw new Error("Unable to load coaches. Please try again.");
    const { coaches } = await response.json();
    if (current !== requestId) return;
    list.replaceChildren();
    message.textContent = coaches.length ? `${coaches.length} contact${coaches.length === 1 ? "" : "s"} found.` : "No coaches match that search.";
    for (const coach of coaches) {
      const card = document.createElement("article");
      card.className = "feature-card";
      const name = document.createElement("h2");
      name.textContent = coach.name;
      const details = document.createElement("p");
      details.textContent = `${coach.college} · ${coach.sport} · Checked ${coach.checked_date}`;
      const link = document.createElement("a");
      link.href = coach.source_url;
      link.textContent = "Official athletics page";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.append(name, details, link);
      if (coach.email) {
        const email = document.createElement("p");
        const mailto = document.createElement("a");
        mailto.href = `mailto:${coach.email}`;
        mailto.textContent = coach.email;
        email.append(mailto);
        card.append(email);
      }
      list.append(card);
    }
  } catch (error) {
    if (current !== requestId) return;
    message.textContent = error.message;
  }
}

search.addEventListener("input", loadCoaches);
loadCoaches();
