import { supabase, TABLES } from "./supabase.js";

const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");
const adminEmail = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");

function setMessage(text = "") {
  if (loginMessage) loginMessage.textContent = text;
}

function showApp(user) {
  loginScreen?.classList.add("hidden");
  adminApp?.classList.remove("hidden");
  if (adminEmail) adminEmail.textContent = user?.email || "Admin";
  window.dispatchEvent(new CustomEvent("admin-ready", { detail: { user } }));
}

function showLogin(message = "") {
  adminApp?.classList.add("hidden");
  loginScreen?.classList.remove("hidden");
  setMessage(message);
}

async function isAdmin(user) {
  if (!user?.id) return false;

  // Preferred: an explicit whitelist row in admin_users.
  try {
    const { data, error } = await supabase
      .from(TABLES.adminUsers)
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (!error && data) return true;
  } catch (_) {}

  // Also support an admin role placed in Auth metadata.
  return user?.app_metadata?.role === "admin" || user?.user_metadata?.role === "admin";
}

async function login(event) {
  event.preventDefault();
  setMessage("");

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  if (!email || !password) return setMessage("Enter your email and password.");

  loginBtn.disabled = true;
  loginBtn.textContent = "Checking...";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (!(await isAdmin(data.user))) {
      await supabase.auth.signOut();
      throw new Error("This account is not authorized for the admin panel.");
    }

    showApp(data.user);
  } catch (error) {
    console.error("Admin login error:", error);
    setMessage(error?.message || "Login failed.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
}

loginForm?.addEventListener("submit", login);

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin();
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (!session?.user) {
    showLogin();
    return;
  }

  if (await isAdmin(session.user)) showApp(session.user);
  else {
    await supabase.auth.signOut();
    showLogin("This account is not authorized for the admin panel.");
  }
});

(async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) showLogin();
  else if (await isAdmin(data.session.user)) showApp(data.session.user);
  else {
    await supabase.auth.signOut();
    showLogin("This account is not authorized for the admin panel.");
  }
})();
