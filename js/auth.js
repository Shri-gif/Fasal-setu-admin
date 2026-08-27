import { supabase } from "./supabase.js";

const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");
const adminEmail = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");

function setMessage(text = "") {
  loginMessage.textContent = text;
}

function showApp(user) {
  loginScreen.classList.add("hidden");
  adminApp.classList.remove("hidden");
  if (adminEmail) adminEmail.textContent = user?.email || "Admin";
  window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
}

function showLogin() {
  adminApp.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

async function isAdmin(user) {
  const appRole = user?.app_metadata?.role;
  const userRole = user?.user_metadata?.role;
  if (appRole === "admin" || userRole === "admin") return true;

  // Optional database whitelist. This makes the panel work even when
  // you prefer keeping the role outside Auth metadata.
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (!error && data) return true;
  } catch (_) {}

  return false;
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  loginBtn.disabled = true;
  loginBtn.textContent = "Checking...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const allowed = await isAdmin(data.user);
    if (!allowed) {
      await supabase.auth.signOut();
      throw new Error("This account is not authorized for the admin panel.");
    }
    showApp(data.user);
  } catch (error) {
    setMessage(error.message || "Login failed.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session?.user) {
    showLogin();
    return;
  }
  const allowed = await isAdmin(session.user);
  if (allowed) showApp(session.user);
  else {
    await supabase.auth.signOut();
    setMessage("This account is not authorized for the admin panel.");
  }
});

(async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) showLogin();
  else {
    const allowed = await isAdmin(data.session.user);
    if (allowed) showApp(data.session.user);
    else await supabase.auth.signOut();
  }
})();
