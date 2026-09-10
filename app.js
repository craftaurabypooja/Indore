let products = [];
let cart = JSON.parse(localStorage.getItem("craftAuraCart") || "[]");
let currentProductId = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  updateCartCount();
  loadProducts();
});

async function loadProducts() {
  const loading = document.getElementById("loading");
  const error = document.getElementById("error");

  if (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE_YOUR")) {
    loading.classList.add("hidden");
    error.classList.remove("hidden");
    error.textContent = "Website setup is almost complete. Add the Google Apps Script Web App URL in js/config.js.";
    return;
  }

  try {
    const response = await fetch(CONFIG.API_URL + "?action=products");
    if (!response.ok) throw new Error("Could not load products.");
    const data = await response.json();

    if (!data.success) throw new Error(data.message || "Could not load products.");
    products = Array.isArray(data.products) ? data.products : [];

    populateCategories();
    loading.classList.add("hidden");
    renderProducts();
  } catch (err) {
    loading.classList.add("hidden");
    error.classList.remove("hidden");
    error.textContent = "Products could not be loaded. Please check the Google Apps Script URL and deployment settings.";
    console.error(err);
  }
}

function populateCategories() {
  const select = document.getElementById("categoryFilter");
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All categories</option>' +
    categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;

  const filtered = products.filter(p => {
    const matchesSearch =
      !search ||
      String(p.name).toLowerCase().includes(search) ||
      String(p.description || "").toLowerCase().includes(search) ||
      String(p.id).toLowerCase().includes(search);

    const matchesCategory = !category || p.category === category;
    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty wide">No products found.</div>';
    return;
  }

  grid.innerHTML = filtered.map(productCard).join("");
}

function productCard(p) {
  const image = getMediaUrl(p.photo1);
  const out = Number(p.stock) <= 0;

  return `
    <article class="product-card" onclick="openProduct('${safeId(p.id)}')">
      <div class="product-image-wrap">
        ${image ? `<img class="product-image" src="${image}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='assets/logo.png'">`
                : `<img class="product-image placeholder" src="assets/logo.png" alt="">`}
        ${out ? '<span class="badge out">Out of stock</span>' : ''}
      </div>
      <div class="product-info">
        <p class="category">${escapeHtml(p.category || "")}</p>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price">${CONFIG.CURRENCY}${formatMoney(p.price)}</div>
        <button class="small-add" ${out ? "disabled" : ""} onclick="event.stopPropagation(); addToCart('${safeId(p.id)}')">
          ${out ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </article>
  `;
}

function openProduct(id) {
  const p = products.find(x => String(x.id) === String(id));
  if (!p) return;

  currentProductId = p.id;
  hideAllViews();
  const view = document.getElementById("productView");
  view.classList.remove("hidden");

  const media = [p.photo1, p.photo2, p.photo3].filter(Boolean).map(getMediaUrl).filter(Boolean);
  const video = getVideoUrl(p.video);

  view.innerHTML = `
    <button class="back-button" onclick="showHome()">← Back to products</button>
    <div class="product-detail">
      <div class="detail-media">
        ${media.length ? `
          <div class="main-photo">
            <img id="mainProductImage" src="${media[0]}" alt="${escapeHtml(p.name)}" onerror="this.src='assets/logo.png'">
          </div>
          <div class="thumbs">
            ${media.map((m,i) => `<button onclick="document.getElementById('mainProductImage').src='${m}'"><img src="${m}" alt="" onerror="this.src='assets/logo.png'"></button>`).join("")}
          </div>` : `<div class="main-photo"><img src="assets/logo.png" alt=""></div>`}
        ${video ? `<a class="video-link" href="${video}" target="_blank" rel="noopener">▶ View product video</a>` : ""}
      </div>

      <div class="detail-info">
        <p class="category">${escapeHtml(p.category || "")}</p>
        <h1>${escapeHtml(p.name)}</h1>
        <div class="detail-price">${CONFIG.CURRENCY}${formatMoney(p.price)}</div>
        <p class="description">${escapeHtml(p.description || "Handcrafted with care.")}</p>
        <p class="stock">${Number(p.stock) > 0 ? `✓ ${p.stock} available` : "Out of stock"}</p>
        <div class="qty-row">
          <button onclick="changeDetailQty(-1)">−</button>
          <span id="detailQty">1</span>
          <button onclick="changeDetailQty(1)">+</button>
        </div>
        <button class="primary-btn" ${Number(p.stock) <= 0 ? "disabled" : ""} onclick="addDetailToCart()">
          Add to Cart
        </button>
        <div class="spec-box">
          <strong>Product ID</strong><span>${escapeHtml(p.id)}</span>
        </div>
      </div>
    </div>
  `;
}

function changeDetailQty(delta) {
  const p = products.find(x => String(x.id) === String(currentProductId));
  const el = document.getElementById("detailQty");
  if (!p || !el) return;
  let qty = Math.max(1, Number(el.textContent) + delta);
  qty = Math.min(qty, Number(p.stock) || 1);
  el.textContent = qty;
}

function addDetailToCart() {
  const qty = Number(document.getElementById("detailQty")?.textContent || 1);
  addToCart(currentProductId, qty);
}

function addToCart(id, qty = 1) {
  const p = products.find(x => String(x.id) === String(id));
  if (!p || Number(p.stock) <= 0) return;

  const existing = cart.find(x => String(x.id) === String(id));
  const max = Number(p.stock);

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, max);
  } else {
    cart.push({ id: p.id, qty: Math.min(qty, max) });
  }

  saveCart();
  showToast("Added to cart");
}

function saveCart() {
  localStorage.setItem("craftAuraCart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  document.getElementById("cartCount").textContent = cart.reduce((sum, x) => sum + Number(x.qty), 0);
}

function openCart() {
  hideAllViews();
  const view = document.getElementById("cartView");
  view.classList.remove("hidden");

  if (!cart.length) {
    view.innerHTML = `
      <button class="back-button" onclick="showHome()">← Continue shopping</button>
      <div class="empty"><div class="empty-icon">🛒</div><h2>Your cart is empty</h2><p>Add some handmade products to get started.</p></div>`;
    return;
  }

  let total = 0;
  const rows = cart.map(item => {
    const p = products.find(x => String(x.id) === String(item.id));
    if (!p) return "";
    const line = Number(p.price) * Number(item.qty);
    total += line;
    return `
      <div class="cart-row">
        <img src="${getMediaUrl(p.photo1) || 'assets/logo.png'}" alt="" onerror="this.src='assets/logo.png'">
        <div class="cart-product">
          <h3>${escapeHtml(p.name)}</h3>
          <p>${CONFIG.CURRENCY}${formatMoney(p.price)} each</p>
          <div class="cart-qty">
            <button onclick="changeCartQty('${safeId(p.id)}', -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="changeCartQty('${safeId(p.id)}', 1)">+</button>
          </div>
        </div>
        <strong>${CONFIG.CURRENCY}${formatMoney(line)}</strong>
        <button class="remove" onclick="removeFromCart('${safeId(p.id)}')">×</button>
      </div>`;
  }).join("");

  view.innerHTML = `
    <button class="back-button" onclick="showHome()">← Continue shopping</button>
    <h1>Your Cart</h1>
    <div class="cart-list">${rows}</div>
    <div class="cart-summary">
      <div><span>Subtotal</span><strong>${CONFIG.CURRENCY}${formatMoney(total)}</strong></div>
      <div><span>Payment</span><strong>Cash on Delivery</strong></div>
      <hr>
      <div class="grand-total"><span>Total</span><strong>${CONFIG.CURRENCY}${formatMoney(total)}</strong></div>
      <button class="primary-btn" onclick="openCheckout()">Proceed to Order</button>
    </div>`;
}

function changeCartQty(id, delta) {
  const item = cart.find(x => String(x.id) === String(id));
  const p = products.find(x => String(x.id) === String(id));
  if (!item || !p) return;

  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(x => String(x.id) !== String(id));
  else item.qty = Math.min(item.qty, Number(p.stock));

  saveCart();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(x => String(x.id) !== String(id));
  saveCart();
  openCart();
}

function openCheckout() {
  if (!cart.length) return openCart();
  hideAllViews();
  const view = document.getElementById("checkoutView");
  view.classList.remove("hidden");

  const total = cart.reduce((sum, item) => {
    const p = products.find(x => String(x.id) === String(item.id));
    return sum + (p ? Number(p.price) * Number(item.qty) : 0);
  }, 0);

  view.innerHTML = `
    <button class="back-button" onclick="openCart()">← Back to cart</button>
    <h1>Place Your Order</h1>
    <p class="muted">Payment method: <strong>Cash on Delivery</strong></p>

    <form id="orderForm" onsubmit="submitOrder(event)">
      <label>Full Name *
        <input name="name" required maxlength="100" autocomplete="name">
      </label>
      <label>Mobile Number *
        <input name="mobile" required inputmode="tel" pattern="[0-9+ ()-]{10,15}" autocomplete="tel">
      </label>
      <label>WhatsApp Number
        <input name="whatsapp" inputmode="tel" pattern="[0-9+ ()-]{10,15}">
      </label>
      <label>Full Delivery Address *
        <textarea name="address" required rows="3" maxlength="400"></textarea>
      </label>
      <div class="two-col">
        <label>City *
          <input name="city" required autocomplete="address-level2">
        </label>
        <label>PIN Code *
          <input name="pincode" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="postal-code">
        </label>
      </div>
      <label>Order Note
        <textarea name="note" rows="2" maxlength="300" placeholder="Optional"></textarea>
      </label>

      <div class="order-total">
        <span>Order Total</span>
        <strong>${CONFIG.CURRENCY}${formatMoney(total)}</strong>
      </div>
      <p class="small-note">By placing this order, you agree to purchase the selected items on Cash on Delivery.</p>
      <button class="primary-btn" id="submitOrderBtn" type="submit">Place COD Order</button>
    </form>`;
}

async function submitOrder(event) {
  event.preventDefault();
  const btn = document.getElementById("submitOrderBtn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());

  const items = cart.map(item => {
    const p = products.find(x => String(x.id) === String(item.id));
    return p ? {
      productId: p.id,
      productName: p.name,
      price: Number(p.price),
      qty: Number(item.qty)
    } : null;
  }).filter(Boolean);

  const payload = {
    action: "order",
    customer: data,
    items
  };

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ payload: JSON.stringify(payload) })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Order failed.");

    cart = [];
    saveCart();
    showSuccess(result.orderId, result.total);
  } catch (err) {
    console.error(err);
    alert("Sorry, the order could not be submitted. Please try again or contact us at " + CONFIG.PHONE + ".");
    btn.disabled = false;
    btn.textContent = "Place COD Order";
  }
}

function showSuccess(orderId, total) {
  hideAllViews();
  const view = document.getElementById("successView");
  view.classList.remove("hidden");
  view.innerHTML = `
    <div class="success-card">
      <div class="success-icon">✓</div>
      <h1>Order Received!</h1>
      <p>Thank you for shopping with CraftAura by Pooja.</p>
      <div class="order-number">Order ID: <strong>${escapeHtml(orderId)}</strong></div>
      <p>Total: <strong>${CONFIG.CURRENCY}${formatMoney(total)}</strong></p>
      <p>Payment: <strong>Cash on Delivery</strong></p>
      <p class="muted">We will contact you on your mobile number to confirm the order.</p>
      <a class="primary-btn link-btn" href="tel:+918517935887">Contact Seller</a>
      <button class="secondary-btn" onclick="showHome()">Continue Shopping</button>
    </div>`;
}

function showHome() {
  hideAllViews();
  document.getElementById("homeView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideAllViews() {
  ["homeView", "productView", "cartView", "checkoutView", "successView"]
    .forEach(id => document.getElementById(id).classList.add("hidden"));
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function getMediaUrl(value) {
  if (!value) return "";
  const url = String(value).trim();
  const idMatch = url.match(/(?:\/d\/|id=|open\?id=)([a-zA-Z0-9_-]{10,})/);
  if (idMatch) return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
  return url;
}

function getVideoUrl(value) {
  if (!value) return "";
  const url = String(value).trim();
  const idMatch = url.match(/(?:\/d\/|id=|open\?id=)([a-zA-Z0-9_-]{10,})/);
  if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/view`;
  return url;
}

function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0";
}

function safeId(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
