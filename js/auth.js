import { supabase } from "./supabase.js";

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

  if (adminEmail) {
    adminEmail.textContent = user?.email || "Admin";
  }

  window.dispatchEvent(
    new CustomEvent("admin-ready", {
      detail: { user }
    })
  );
}

function showLogin() {
  adminApp?.classList.add("hidden");
  loginScreen?.classList.remove("hidden");
}

async function isAdmin(user) {
  if (!user?.id) return false;

  // Allow an explicit admin role if one has been configured in Supabase Auth.
  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;

  if (appRole === "admin" || userRole === "admin") {
    return true;
  }

  // Main admin whitelist check.
  // The RLS SELECT policy should allow the logged-in user to read
  // only their own admin_users row.
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, user_id, active, email")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("admin_users check failed:", error);

    throw new Error(
      `Admin check failed: ${error.message || "Unable to read admin_users"}`
    );
  }

  return !!data;
}

async function verifyAndOpen(user) {
  try {
    const allowed = await isAdmin(user);

    if (!allowed) {
      await supabase.auth.signOut();
      throw new Error("This account is not authorized for the admin panel.");
    }

    showApp(user);
    return true;
  } catch (error) {
    console.error("Admin verification error:", error);

    showLogin();
    setMessage(error.message || "Admin verification failed.");
    return false;
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  setMessage("");

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = "Checking...";
  }

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  if (!email || !password) {
    setMessage("Please enter your email and password.");

    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }

    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data?.user) {
      throw new Error("Login succeeded, but no user was returned.");
    }

    await verifyAndOpen(data.user);
  } catch (error) {
    console.error("Login error:", error);

    setMessage(error.message || "Login failed.");
  } finally {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await supabase.auth.signOut();
  } finally {
    showLogin();
  }
});

/*
  IMPORTANT:
  Do not perform another admin_users query inside SIGNED_IN.
  signInWithPassword() already performs the verification above.
  A second query here can race with the first one and cause the
  panel to immediately sign the user out.
*/
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session?.user) {
    showLogin();
  }
});

(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (!data?.session?.user) {
      showLogin();
      return;
    }

    await verifyAndOpen(data.session.user);
  } catch (error) {
    console.error("Session check error:", error);

    await supabase.auth.signOut();
    showLogin();
    setMessage(error.message || "Could not verify your session.");
  }
})();
