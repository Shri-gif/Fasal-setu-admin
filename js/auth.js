import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
    checkAdminSession();
    setupLogin();
});

async function checkAdminSession() {
    try {
        const {
            data: { session }
        } = await supabase.auth.getSession();

        if (session) {
            window.location.replace("index.html");
        }
    } catch (error) {
        console.error("Session check error:", error);
    }
}

function setupLogin() {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document
            .getElementById("email")
            ?.value
            .trim();

        const password = document
            .getElementById("password")
            ?.value;

        const loginButton =
            document.getElementById("loginButton");

        const message =
            document.getElementById("loginMessage");

        if (!email || !password) {
            showMessage(
                message,
                "Please enter email and password."
            );
            return;
        }

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Signing in...";
        }

        try {
            const {
                data,
                error
            } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            if (!data.session) {
                throw new Error(
                    "Login session could not be created."
                );
            }

            /*
             * IMPORTANT:
             * There is NO admin signup here.
             *
             * Only users already created in
             * Supabase Authentication can login.
             *
             * Admin authorization should additionally
             * be controlled through Supabase database
             * policies / admin table.
             */

            window.location.replace("index.html");

        } catch (error) {
            console.error("Admin login error:", error);

            showMessage(
                message,
                getLoginError(error)
            );

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
            }
        }
    });
}

function showMessage(element, text) {
    if (!element) return;

    element.textContent = text;
    element.classList.add("show");
}

function getLoginError(error) {
    const message =
        error?.message?.toLowerCase() || "";

    if (
        message.includes("invalid login credentials")
    ) {
        return "Invalid email or password.";
    }

    if (
        message.includes("email not confirmed")
    ) {
        return "Please confirm the admin email first.";
    }

    return (
        error?.message ||
        "Unable to login. Please try again."
    );
}

export async function requireAdmin() {
    const {
        data: { session },
        error
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
        window.location.replace("login.html");
        return null;
    }

    return session.user;
}

export async function logoutAdmin() {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Logout error:", error);
    }

    window.location.replace("login.html");
}
