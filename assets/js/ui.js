import { appConfig } from "./config.js";

export const qs = (selector, root=document) => root.querySelector(selector);
export const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];
export const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
export const formatMoney = value => new Intl.NumberFormat("en-MV", { style:"currency", currency:appConfig.company.currency, maximumFractionDigits:2 }).format(Number(value||0));
export const formatDate = value => {
  const d = value?.toDate ? value.toDate() : new Date(value || Date.now());
  return new Intl.DateTimeFormat("en-MV", { dateStyle:"medium", timeStyle:"short" }).format(d);
};
export const slugify = value => String(value||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export const getParam = name => new URLSearchParams(location.search).get(name);

export function toast(message, type="info", title="") {
  const stack = qs("#toastStack");
  if (!stack) return;
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  const icon = {success:"fa-circle-check",error:"fa-circle-xmark",warning:"fa-triangle-exclamation",info:"fa-circle-info"}[type] || "fa-circle-info";
  item.innerHTML = `<i class="fa-solid ${icon}"></i><div><strong>${escapeHtml(title || type[0].toUpperCase()+type.slice(1))}</strong><div class="muted">${escapeHtml(message)}</div></div><button aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`;
  item.querySelector("button").onclick = () => item.remove();
  stack.append(item);
  setTimeout(()=>item.remove(),5000);
}

export function showModal(html) {
  const backdrop = qs("#modalBackdrop");
  qs("#modalContent").innerHTML = html;
  backdrop.classList.remove("hidden");
  document.body.style.overflow="hidden";
}
export function closeModal() {
  qs("#modalBackdrop")?.classList.add("hidden");
  document.body.style.overflow="";
}

export function setButtonLoading(button, loading, label="Please wait") {
  if (!button) return;
  if (loading) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(label)}`;
  } else {
    button.disabled = false;
    if (button.dataset.original) button.innerHTML = button.dataset.original;
  }
}

export function emptyState(icon,title,text,actionHtml="") {
  return `<div class="empty-state"><i class="fa-solid ${icon}"></i><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${actionHtml}</div>`;
}

export function statusBadge(status) {
  const safe=escapeHtml(status||"pending");
  return `<span class="status ${safe.toLowerCase()}">${safe}</span>`;
}

export function productCard(product, wishlistIds=[]) {
  const image=product.images?.[0] || "https://placehold.co/600x450?text=DhiExpress";
  const price=product.discountPrice || product.price;
  const liked=wishlistIds.includes(product.id);
  return `<article class="product-card" data-product-id="${escapeHtml(product.id)}">
    <div class="product-image">
      <a href="product.html?id=${encodeURIComponent(product.id)}"><img loading="lazy" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}"></a>
      <div class="product-badges">${product.featured?'<span class="badge gold"><i class="fa-solid fa-star"></i> Featured</span>':''}${product.condition?`<span class="badge">${escapeHtml(product.condition)}</span>`:''}</div>
      <button class="wishlist-btn ${liked?'active':''}" data-wishlist="${escapeHtml(product.id)}" aria-label="Save ${escapeHtml(product.name)}"><i class="${liked?'fa-solid':'fa-regular'} fa-heart"></i></button>
    </div>
    <div class="product-body">
      <a href="product.html?id=${encodeURIComponent(product.id)}"><h3 class="product-title">${escapeHtml(product.name)}</h3></a>
      <div class="product-meta"><span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(product.location||"Maldives")}</span><span>${escapeHtml(product.condition||"New")}</span></div>
      <div class="price-row"><span class="price">${formatMoney(price)}</span>${product.discountPrice?`<span class="old-price">${formatMoney(product.price)}</span>`:''}</div>
      <div class="product-meta" style="margin-top:10px"><span>${escapeHtml(product.sellerName||"Seller")}</span><span class="rating"><i class="fa-solid fa-star"></i> ${Number(product.rating||0).toFixed(1)} (${product.reviewCount||0})</span></div>
    </div>
  </article>`;
}

export function attachTheme() {
  const saved=localStorage.getItem("dhiexpress-theme") || (matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  document.documentElement.dataset.theme=saved;
  const update=()=>{ const icon=qs("#themeToggle i"); if(icon) icon.className=document.documentElement.dataset.theme==="dark"?"fa-regular fa-sun":"fa-regular fa-moon"; };
  update();
  qs("#themeToggle")?.addEventListener("click",()=>{ document.documentElement.dataset.theme=document.documentElement.dataset.theme==="dark"?"light":"dark"; localStorage.setItem("dhiexpress-theme",document.documentElement.dataset.theme); update(); });
}

export function attachShell() {
  const menuBtn=qs("#mobileMenuBtn"), nav=qs("#mainNav");
  menuBtn?.addEventListener("click",()=>{nav.classList.toggle("open"); menuBtn.setAttribute("aria-expanded",String(nav.classList.contains("open")));});
  qs("#profileTrigger")?.addEventListener("click",()=>qs("#profileMenu")?.classList.toggle("open"));
  document.addEventListener("click",e=>{if(!e.target.closest(".auth-nav")) qs("#profileMenu")?.classList.remove("open");});
  qs("#modalClose")?.addEventListener("click",closeModal);
  qs("#modalBackdrop")?.addEventListener("click",e=>{if(e.target.id==="modalBackdrop") closeModal();});
  const page=document.body.dataset.page;
  const navKey=["search","product","cart","wishlist","checkout","order-confirmation"].includes(page)?"market":page;
  qsa(`[data-nav="${navKey}"]`).forEach(a=>a.classList.add("active"));
}
