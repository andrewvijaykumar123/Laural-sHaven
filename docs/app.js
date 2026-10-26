const menu = [
  { category: 'Tea and Coffee', items: [{ id: 'masala-tea', name: 'Masala Tea', price: 25 }, { id: 'lemon-tea', name: 'Lemon Tea', price: 25 }, { id: 'black-brew', name: 'Black Brew', price: 25 }, { id: 'ginger-tea', name: 'Ginger Tea', price: 30 }, { id: 'filter-coffee', name: 'Filter Coffee', price: 30 }] },
  { category: 'Sandwiches', items: [{ id: 'veg-sandwich', name: 'Veg Sandwich', price: 59 }, { id: 'paneer-sandwich', name: 'Paneer Sandwich', price: 69 }, { id: 'mushroom-sandwich', name: 'Mushroom Sandwich', price: 69 }, { id: 'chicken-sandwich', name: 'Chicken Sandwich', price: 79 }, { id: 'schezwan-chicken-sandwich', name: 'Schezwan Chicken Sandwich', price: 89 }] },
  { category: 'Maggie', items: [{ id: 'plain-maggie', name: 'Plain Maggie', price: 49 }, { id: 'veg-maggie', name: 'Veg Maggie', price: 59 }, { id: 'cheese-maggie', name: 'Cheese Maggie', price: 59 }, { id: 'egg-maggie', name: 'Egg Maggie', price: 69 }, { id: 'chicken-maggie', name: 'Chicken Maggie', price: 79 }] },
  { category: 'Omelettes', items: [{ id: 'plain-omelette', name: 'Plain Omelette', price: 30 }, { id: 'cheese-omelette', name: 'Cheese Omelette', price: 49 }, { id: 'chicken-omelette', name: 'Chicken Omelette', price: 59 }] },
  { category: "Momo's", items: [{ id: 'veg-momos', name: "Veg Momos", price: 69 }, { id: 'schezwan-veg-momos', name: "Schezwan Veg Momos", price: 79 }, { id: 'chicken-momos', name: "Chicken Momos", price: 89 }, { id: 'schezwan-chicken-momos', name: "Schezwan Chicken Momos", price: 99 }] },
  { category: 'Kids Snacks', items: [{ id: 'paneer-pops', name: 'Paneer Pops', price: 99 }, { id: 'chicken-pops', name: 'Chicken Pops', price: 99 }, { id: 'french-fries', name: 'French Fries', price: 99 }, { id: 'peri-peri-fries', name: 'Peri Peri Fries', price: 99 }, { id: 'patty-veg-burger', name: 'Patty Veg Burger', price: 129 }, { id: 'chicken-burger', name: 'Chicken Burger', price: 139 }, { id: 'kiddo-veg-burger', name: 'Kiddo Veg Burger', price: 89 }, { id: 'kiddo-chicken-burger', name: 'Kiddo Chicken Burger', price: 99 }, { id: 'chicken-loaded-fries', name: 'Chicken Loaded Fries', price: 189 }, { id: 'paneer-loaded-fries', name: 'Paneer Loaded Fries', price: 159 }] },
  { category: 'Water Based Drinks (400ml)', items: [{ id: 'watermelon', name: 'Watermelon', price: 49 }, { id: 'musk-melon', name: 'Musk Melon', price: 49 }, { id: 'lemon-juice', name: 'Lemon Juice', price: 29 }, { id: 'mint-lime', name: 'Mint Lime', price: 29 }, { id: 'guava', name: 'Guava', price: 69 }, { id: 'sapodilla', name: 'Sapodilla (Sapotta)', price: 69 }, { id: 'grape', name: 'Grape', price: 69 }] },
  { category: 'Milk Based Drinks (300ml)', items: [{ id: 'tender-coconut', name: 'Tender Coconut', price: 149 }, { id: 'avocado', name: 'Avocado', price: 149 }, { id: 'jackfruit', name: 'Jackfruit', price: 149 }, { id: 'strawberry', name: 'Strawberry', price: 149 }, { id: 'custard-apple', name: 'Custard Apple', price: 149 }, { id: 'mango', name: 'Mango', price: 149 }, { id: 'dry-fig', name: 'Dry Fig', price: 149 }] },
  { category: "Haven's Specials", items: [{ id: 'cheesy-chicken', name: 'Cheesy Chicken', price: 249 }, { id: 'dragon-fire-chicken', name: 'Dragon Fire Chicken', price: 249 }, { id: 'chicken-protein-salad', name: 'Chicken Protein Salad', price: 229 }, { id: 'veg-protein-salad', name: 'Veg Protein Salad', price: 189 }] },
  { category: 'Haven Special Drinks', items: [{ id: 'mocha-mist', name: 'Mocha Mist', price: 159 }, { id: 'magic-milo', name: 'Magic Milo', price: 149 }, { id: 'hot-chocolate', name: 'Hot Chocolate', price: 169 }, { id: 'haven-fuel', name: 'Haven Fuel', price: 159 }, { id: 'chocolate-shake', name: 'Chocolate Shake', price: 159 }] },
  { category: "Chicken Tikka's", items: [{ id: 'mint-fusion-tikka', name: 'Mint Fusion Tikka', price: 279 }, { id: 'malai-mist-tikka', name: 'Malai Mist Tikka', price: 279 }, { id: 'tandoori-blaze-tikka', name: 'Tandoori Blaze Tikka', price: 279 }] },
  { category: 'Veg Tikkas', items: [{ id: 'herb-paneer-tikka', name: 'Herb Paneer Tikka', price: 229 }, { id: 'forest-mushroom-tikka', name: 'Forest Mushroom Tikka', price: 219 }] },
  { category: 'Premium Burgers & Wraps', items: [{ id: 'artemis-tikka-burger', name: 'The Artemis Tikka Burger (UFO)', price: 239 }, { id: 'aurora-mint-burger', name: 'The Aurora Mint Burger', price: 249 }, { id: 'hot-crispy-burger', name: 'Hot & Crispy Burger', price: 229 }, { id: 'apollo-tikka-burger', name: 'The Apollo Tikka Burger (UFO)', price: 249 }, { id: 'mystic-mushroom-burger', name: 'Mystic Mushroom Burger', price: 189 }, { id: 'paneer-royale-burger', name: 'Paneer Royale Burger', price: 199 }, { id: 'crispy-chicken-wrap', name: 'Crispy Chicken Wrap', price: 179 }, { id: 'mint-magic-wrap', name: 'Mint Magic Wrap', price: 189 }, { id: 'malai-tikka-wrap', name: 'Malai Tikka Wrap', price: 189 }, { id: 'tandoori-tikka-wrap', name: 'Tandoori Tikka Wrap', price: 189 }, { id: 'mushroom-medley-wrap', name: 'Mushroom Medley Wrap', price: 159 }, { id: 'paneer-peri-wrap', name: 'Paneer Peri Wrap', price: 169 }] },
  { category: 'Combo Boxes & Combos', items: [{ id: 'tea-coffee-fries', name: 'Tea/Coffee/Cookies + French Fries', price: 69 }, { id: 'tea-coffee-momos', name: 'Tea/Coffee/Cookies + Veg Momos', price: 99 }, { id: 'tea-coffee-chicken-momos', name: 'Tea/Coffee/Cookies + Chicken Momos', price: 119 }, { id: 'tea-coffee-veg-sandwich', name: 'Tea/Coffee/Cookies + Veg Sandwich', price: 99 }, { id: 'tea-coffee-chicken-sandwich', name: 'Tea/Coffee/Cookies + Chicken Sandwich', price: 119 }, { id: 'veg-burger-wrap-pops-fries', name: 'Veg Burger/Wrap + Paneer Pops + Fries + Coke', price: 219 }, { id: 'nonveg-burger-wrap-popcorn-fries', name: 'Non Veg Burger/Wrap + Popcorn + Fries + Coke', price: 259 }, { id: 'paneer-loaded-mojito', name: 'Paneer Loaded Fries + Mojito', price: 219 }, { id: 'chicken-loaded-mojito', name: 'Chicken Loaded Fries + Mojito', price: 249 }] },
  { category: 'Tikka & Protein Combos', items: [{ id: 'tikka-roti-grape', name: 'Tikka + 2 Roti + Grape Splash', price: 329 }, { id: 'veg-tikka-roti-grape', name: 'Veg Tikka + 2 Roti + Grape Splash', price: 299 }, { id: 'nonveg-salad-banana-shake', name: 'Non Veg Salad + Red Banana Shake', price: 329 }, { id: 'veg-salad-banana-shake', name: 'Veg Salad + Red Banana Shake', price: 299 }] }
];
const cart = new Map();
const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const UPI_ID = 'paytm.s1pl5v7@pty';
const UPI_NAME = "Laural's Haven";
const elements = {
  menuContainer: document.getElementById('menuContainer'),
  cartTrigger: document.getElementById('cartTrigger'),
  cartPanel: document.getElementById('cartPanel'),
  closeCart: document.getElementById('closeCart'),
  cartItems: document.getElementById('cartItems'),
  cartCount: document.getElementById('cartCount'),
  subtotalValue: document.getElementById('subtotalValue'),
  serviceFeeValue: document.getElementById('serviceFeeValue'),
  totalValue: document.getElementById('totalValue'),
  checkoutButton: document.getElementById('checkoutButton'),
  checkoutModal: document.getElementById('checkoutModal'),
  qrModal: document.getElementById('qrModal'),
  checkoutSubtotal: document.getElementById('checkoutSubtotal'),
  checkoutServiceFee: document.getElementById('checkoutServiceFee'),
  checkoutTotal: document.getElementById('checkoutTotal'),
  checkoutForm: document.getElementById('checkoutForm'),
  qrPaymentButton: document.getElementById('qrPaymentButton'),
  qrCodeImage: document.getElementById('qrCodeImage'),
  toast: document.getElementById('toast')
};

function formatCurrency(value) { return currencyFormatter.format(value); }
function showToast(message) {
  const toast = elements.toast;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2600);
}
function getOrderSummary() {
  const items = Array.from(cart.values()).map((entry) => ({ id: entry.id, name: entry.name, price: Number(entry.price), qty: Number(entry.qty) }));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const serviceFee = subtotal > 0 ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + serviceFee;
  return { items, subtotal, serviceFee, total };
}
function renderCart() {
  const { items, subtotal, serviceFee, total } = getOrderSummary();
  elements.cartCount.textContent = items.reduce((sum, item) => sum + item.qty, 0);
  elements.subtotalValue.textContent = formatCurrency(subtotal);
  elements.serviceFeeValue.textContent = formatCurrency(serviceFee);
  elements.totalValue.textContent = formatCurrency(total);
  elements.checkoutSubtotal.textContent = formatCurrency(subtotal);
  elements.checkoutServiceFee.textContent = formatCurrency(serviceFee);
  elements.checkoutTotal.textContent = formatCurrency(total);
  renderQrCode();

  if (items.length === 0) {
    elements.cartItems.innerHTML = '<div class="empty-cart">Your cart is empty. Add a few dishes to begin.</div>';
    return;
  }

  elements.cartItems.innerHTML = items.map((item) => `
    <div class="cart-line">
      <div class="cart-line-main">
        <div>
          <div class="cart-name">${item.name}</div>
          <div class="cart-meta"><span>${formatCurrency(item.price)}</span><span>•</span><span>${formatCurrency(item.price * item.qty)}</span></div>
        </div>
        <div class="qty-controls">
          <button type="button" class="qty-button" data-action="decrement" data-id="${item.id}">−</button>
          <span>${item.qty}</span>
          <button type="button" class="qty-button" data-action="increment" data-id="${item.id}">+</button>
        </div>
      </div>
    </div>
  `).join('');
}
function renderMenu() {
  elements.menuContainer.innerHTML = menu.map((section) => `
    <article class="category-card">
      <h4>${section.category}</h4>
      <div class="menu-list">
        ${section.items.map((item) => `
          <div class="menu-item">
            <div><h5>${item.name}</h5></div>
            <span class="item-price">${formatCurrency(item.price)}</span>
            <button type="button" class="add-button" data-add-id="${item.id}" data-name="${item.name}" data-price="${item.price}">Add</button>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('');
}
function addItemToCart(item) {
  const existing = cart.get(item.id);
  if (existing) {
    existing.qty += 1;
    cart.set(item.id, existing);
  } else {
    cart.set(item.id, { ...item, qty: 1 });
  }
  renderCart();
  showToast(`${item.name} added to cart`);
}
function updateItemQty(itemId, delta) {
  const existing = cart.get(itemId);
  if (!existing) return;
  existing.qty += delta;
  if (existing.qty <= 0) cart.delete(itemId);
  else cart.set(itemId, existing);
  renderCart();
}
function renderQrCode() {
  const total = getOrderSummary().total || 0;
  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${Number(total).toFixed(2)}&cu=INR&tn=${encodeURIComponent("Laural's Haven")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiLink)}`;
  elements.qrCodeImage.src = qrUrl;
}
function openModal(modalElement) { modalElement.classList.remove('hidden'); }
function closeModal(modalElement) { modalElement.classList.add('hidden'); }
function clearCart() { cart.clear(); renderCart(); }
function openUPIDeepLink(appType) {
  const amount = getOrderSummary().total;
  const deepLinks = {
    gpay: `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Laural\'s Haven Order')}`,
    phonepe: `phonepe://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Laural\'s Haven Order')}`,
    paytm: `paytmmp://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Laural\'s Haven Order')}`,
    bhim: `bhim://upi/pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Laural\'s Haven Order')}`
  };
  const link = deepLinks[appType] || deepLinks.gpay;
  window.location.href = link;
  showToast(`Opening ${appType.toUpperCase()}...`);
  setTimeout(() => openModal(elements.qrModal), 600);
}
function handleSubmit(event) {
  event.preventDefault();
  const summary = getOrderSummary();
  if (summary.items.length === 0) {
    showToast('Your cart is empty.');
    return;
  }

  const formData = new FormData(elements.checkoutForm);
  const customer = formData.get('customerName');
  const phone = formData.get('phone');
  const email = formData.get('email') || 'Not provided';
  const notes = formData.get('notes') || 'No notes';
  const txn = `LH-${Date.now().toString().slice(-8)}`;
  const itemLines = summary.items.map((item) => `${item.name} x ${item.qty} = ${formatCurrency(item.price * item.qty)}`).join('\n');
  const body = `Order ID: ${txn}\nCustomer: ${customer}\nPhone: ${phone}\nEmail: ${email}\nNotes: ${notes}\n\nItems:\n${itemLines}\n\nSubtotal: ${formatCurrency(summary.subtotal)}\nService fee: ${formatCurrency(summary.serviceFee)}\nTotal: ${formatCurrency(summary.total)}`;

  const mailtoLink = `mailto:Havenlaurals06@gmail.com?subject=${encodeURIComponent('New Laural\'s Haven Order - ' + txn)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
  showToast('Order details prepared for email');
  clearCart();
  closeModal(elements.checkoutModal);
  elements.checkoutForm.reset();
}

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add-id]');
  if (addButton) {
    addItemToCart({ id: addButton.dataset.addId, name: addButton.dataset.name, price: Number(addButton.dataset.price) });
    return;
  }
  const qtyButton = event.target.closest('[data-action]');
  if (qtyButton) {
    updateItemQty(qtyButton.dataset.id, qtyButton.dataset.action === 'increment' ? 1 : -1);
    return;
  }
  const appOption = event.target.closest('[data-upi]');
  if (appOption) {
    openUPIDeepLink(appOption.dataset.upi);
    return;
  }
  const closeTarget = event.target.closest('[data-close]');
  if (closeTarget) {
    closeModal(document.getElementById(closeTarget.dataset.close));
    return;
  }
  if (event.target.id === 'checkoutButton') {
    if (getOrderSummary().items.length === 0) {
      showToast('Add an item to the cart first.');
      return;
    }
    openModal(elements.checkoutModal);
  }
  if (event.target.id === 'cartTrigger') elements.cartPanel.classList.toggle('open');
  if (event.target.id === 'closeCart') elements.cartPanel.classList.remove('open');
  if (event.target.id === 'qrPaymentButton') openModal(elements.qrModal);
  if (event.target.id === 'clearFilters') { clearCart(); showToast('Cart cleared.'); }
});

elements.checkoutForm.addEventListener('submit', handleSubmit);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeModal(elements.checkoutModal); closeModal(elements.qrModal); } });
renderMenu();
renderCart();
