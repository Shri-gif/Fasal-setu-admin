const navItems = document.querySelectorAll(".nav-item");
const pages = {
  dashboard: document.getElementById("dashboardPage"),
  settings: document.getElementById("settingsPage")
};
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");

const meta = {
  dashboard: ["Dashboard", "Your platform at a glance"],
  settings: ["Settings", "Small controls for your platform"]
};

function openPage(page) {
  Object.entries(pages).forEach(([name, element]) => {
    element?.classList.toggle("hidden", name !== page);
  });
  navItems.forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));
  const [title, subtitle] = meta[page] || meta.dashboard;
  if (pageTitle) pageTitle.textContent = title;
  if (pageSubtitle) pageSubtitle.textContent = subtitle;
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
  if (page === "dashboard") window.dispatchEvent(new Event("dashboard-requested"));
  if (page === "settings") window.dispatchEvent(new Event("settings-requested"));
}

navItems.forEach(btn => btn.addEventListener("click", () => openPage(btn.dataset.page)));

document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
  sidebar?.classList.add("open");
  overlay?.classList.add("show");
});
overlay?.addEventListener("click", () => {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
});
