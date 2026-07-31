import { isSupabaseConfigured } from "./supabase-client.js";
import { state, initializeSession, logout, getCart, getWishlist, isAdmin, reportClientError } from "./services.js";
import { attachTheme, attachShell, qs, qsa, escapeHtml, toast } from "./ui.js";
import { renderPage } from "./pages.js";

attachTheme();
attachShell();

function updateCounts() {
  const cartCount=getCart().reduce((s,i)=>s+Number(i.quantity||0),0);
  const wishlistCount=getWishlist().length;
  if(qs("#cartCount")) qs("#cartCount").textContent=cartCount;
  if(qs("#wishlistCount")) qs("#wishlistCount").textContent=wishlistCount;
}
function updateAuthUI() {
  const loggedIn=!!state.user;
  qsa("[data-auth-only]").forEach(el=>el.classList.toggle("hidden",!loggedIn));
  qsa("[data-guest-only]").forEach(el=>el.classList.toggle("hidden",loggedIn));
  qsa("[data-admin-only]").forEach(el=>el.classList.toggle("hidden",!isAdmin()));
  qsa("[data-seller-only]").forEach(el=>el.classList.toggle("hidden",state.profile?.sellerStatus!=="approved"&&!isAdmin()));
  if(loggedIn){
    const name=state.profile?.businessName||state.profile?.displayName||state.user.displayName||state.user.email?.split("@")[0]||"Account";
    if(qs("#navUserName")) qs("#navUserName").textContent=name;
    const avatar=qs("#navAvatar");
    if(avatar){avatar.innerHTML=state.profile?.photoURL?`<img src="${escapeHtml(state.profile.photoURL)}" alt="">`:escapeHtml(name[0].toUpperCase());}
  }
}

if(!isSupabaseConfigured){
  const banner=qs("#configurationBanner");
  banner.classList.remove("hidden");
  banner.innerHTML='<strong>Preview mode:</strong> Supabase is not configured yet. The interface uses local sample data. Replace the values in <code>assets/js/config.js</code> to connect Supabase Auth, Database and Storage.';
}

document.addEventListener("dx-data-change",updateCounts);
qs("#logoutBtn")?.addEventListener("click",async()=>{await logout();toast("You have been logged out.","success");setTimeout(()=>location.href="index.html",350);});

initializeSession(async()=>{
  updateAuthUI();
  updateCounts();
  await renderPage(document.body.dataset.page||"home");
});

if("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
}

window.addEventListener("error",event=>{reportClientError(event.error||new Error(event.message));});
window.addEventListener("unhandledrejection",event=>{reportClientError(event.reason instanceof Error?event.reason:new Error(String(event.reason)));});
