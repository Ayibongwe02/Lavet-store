// Cart management with localStorage
const CART_KEY = 'lavet_cart';
// Session-based so the assistant intro shows again in a new browser session
const ONBOARD_KEY = 'lavet_onboarded_session';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty });
  }
  saveCart(cart);
  showToast('Added to cart');
}

function removeFromCart(productId) {
  let cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

function updateQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart(cart);
  }
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, item) => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function isOnboarded() {
  try {
    return sessionStorage.getItem(ONBOARD_KEY) === '1';
  } catch {
    return false;
  }
}

function setOnboarded() {
  try {
    sessionStorage.setItem(ONBOARD_KEY, '1');
  } catch {}
}

// Init badge on load
document.addEventListener('DOMContentLoaded', updateCartBadge);

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // Close menu when a link is tapped (better mobile UX)
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
});
