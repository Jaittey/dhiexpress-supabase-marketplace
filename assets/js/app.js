import { isSupabaseConfigured } from "./supabase-client.js";
import {
  state,
  initializeSession,
  logout,
  getCart,
  getWishlist,
  isAdmin,
  reportClientError
} from "./services.js";
import { attachTheme, attachShell, qs, qsa, escapeHtml, toast } from "./ui.js";
import { renderPage } from "./pages.js";

attachTheme();
attachShell();

function updateCounts() {
  const cartCount = getCart().reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
  const wishlistCount = getWishlist().length;

  const cartElement = qs("#cartCount");
  const wishlistElement = qs("#wishlistCount");

  if (cartElement) cartElement.textContent = String(cartCount);
  if (wishlistElement) wishlistElement.textContent = String(wishlistCount);
}

function updateAuthUI() {
  const loggedIn = Boolean(state.user);

  qsa("[data-auth-only]").forEach((element) => {
    element.classList.toggle("hidden", !loggedIn);
  });

  qsa("[data-guest-only]").forEach((element) => {
    element.classList.toggle("hidden", loggedIn);
  });

  qsa("[data-admin-only]").forEach((element) => {
    element.classList.toggle("hidden", !isAdmin());
  });

  const approvedSeller =
    state.profile?.sellerStatus === "approved" || isAdmin();

  qsa("[data-seller-only]").forEach((element) => {
    element.classList.toggle("hidden", !approvedSeller);
  });

  if (!loggedIn) return;

  const name =
    state.profile?.businessName ||
    state.profile?.displayName ||
    state.user?.displayName ||
    state.user?.user_metadata?.display_name ||
    state.user?.user_metadata?.full_name ||
    state.user?.email?.split("@")[0] ||
    "Account";

  const userNameElement = qs("#navUserName");
  if (userNameElement) userNameElement.textContent = name;

  const avatarElement = qs("#navAvatar");
  if (avatarElement) {
    const photoURL =
      state.profile?.photoURL ||
      state.user?.photoURL ||
      state.user?.user_metadata?.avatar_url ||
      "";

    avatarElement.innerHTML = photoURL
      ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(name)}">`
      : escapeHtml(name.charAt(0).toUpperCase());
  }
}

function updateConfigurationBanner() {
  const banner = qs("#configurationBanner");
  if (!banner) return;

  if (isSupabaseConfigured) {
    banner.classList.add("hidden");
    banner.innerHTML = "";
    return;
  }

  banner.classList.remove("hidden");
  banner.innerHTML = `
    <strong>Preview mode:</strong>
    Supabase is not configured yet. Replace the values in
    <code>assets/js/config.js</code>.
  `;
}

updateConfigurationBanner();

document.addEventListener("dx-data-change", updateCounts);

qs("#logoutBtn")?.addEventListener("click", async () => {
  try {
    await logout();
    toast("You have been logged out.", "success");
    setTimeout(() => {
      location.href = "index.html";
    }, 350);
  } catch (error) {
    console.error("Logout failed:", error);
    toast(error?.message || "Logout failed.", "error");
  }
});

initializeSession(async () => {
  updateAuthUI();
  updateCounts();

  try {
    await renderPage(document.body.dataset.page || "home");
  } catch (error) {
    console.error("Page rendering failed:", error);
    await reportClientError(error);
    toast(error?.message || "Some page content could not be loaded.", "error");
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}

window.addEventListener("error", (event) => {
  reportClientError(
    event.error || new Error(event.message || "Unknown browser error")
  );
});

window.addEventListener("unhandledrejection", (event) => {
  const error =
    event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
  reportClientError(error);
});
