const cart = new Map();
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const state = {
  menu: [],
  selectedUPI: null,
  upiId: 'paytm.s1pl5v7@pty',
  upiName: "Laural's Haven"
};

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
  qaModal: document.getElementById('qrModal'),
  checkoutSubtotal: document.getElementById('checkoutSubtotal'),
  checkoutServiceFee: document.getElementById('checkoutServiceFee'),
  checkoutTotal: document.getElementById('checkoutTotal'),
  checkoutForm: document.getElementById('checkoutForm'),
  qrPaymentButton: document.getElementById('qrPaymentButton'),
  qrCodeImage: document.getElementById('qrCodeImage'),
  toast: document.getElementById('toast')
};

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function showToast(message) {
  const toast = elements.toast;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2600);
}

function getOrderSummary() {
  const items = Array.from(cart.values()).map((entry) => ({
    id: entry.id,
    name: entry.name,
    price: Number(entry.price),
    qty: Number(entry.qty)
  }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const serviceFee = subtotal > 0 ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + serviceFee;

  return { items, subtotal, serviceFee, total };
}

function renderCart() {
  const orderSummary = getOrderSummary();
  const items = orderSummary.items;

  elements.cartCount.textContent = items.reduce((sum, item) => sum + item.qty, 0);
  elements.subtotalValue.textContent = formatCurrency(orderSummary.subtotal);
  elements.serviceFeeValue.textContent = formatCurrency(orderSummary.serviceFee);
  elements.totalValue.textContent = formatCurrency(orderSummary.total);
  elements.checkoutSubtotal.textContent = formatCurrency(orderSummary.subtotal);
  elements.checkoutServiceFee.textContent = formatCurrency(orderSummary.serviceFee);
  elements.checkoutTotal.textContent = formatCurrency(orderSummary.total);
  renderQrCode();

  if (items.length === 0) {
    elements.cartItems.innerHTML = '<div class="empty-cart">Your cart is empty. Add a few dishes to begin.</div>';
    return;
  }

  elements.cartItems.innerHTML = items
    .map(
      (item) => `
        <div class="cart-line">
          <div class="cart-line-main">
            <div>
              <div class="cart-name">${item.name}</div>
              <div class="cart-meta">
                <span>${formatCurrency(item.price)}</span>
                <span>•</span>
                <span>${formatCurrency(item.price * item.qty)}</span>
              </div>
            </div>
            <div class="qty-controls">
              <button type="button" class="qty-button" data-action="decrement" data-id="${item.id}">−</button>
              <span>${item.qty}</span>
              <button type="button" class="qty-button" data-action="increment" data-id="${item.id}">+</button>
            </div>
          </div>
        </div>
      `
    )
    .join('');
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
  elements.cartPanel.classList.add('open');
  showToast(`${item.name} added to cart`);
}

function updateItemQty(itemId, delta) {
  const existing = cart.get(itemId);
  if (!existing) return;

  existing.qty += delta;

  if (existing.qty <= 0) {
    cart.delete(itemId);
  } else {
    cart.set(itemId, existing);
  }

  renderCart();
}

function buildMenuCards(menu) {
  return menu
    .map(
      (section) => `
        <article class="category-card">
          <h4>${section.category}</h4>
          <div class="menu-list">
            ${section.items
              .map(
                (item) => `
                  <div class="menu-item">
                    <div>
                      <h5>${item.name}</h5>
                    </div>
                    <span class="item-price">${formatCurrency(item.price)}</span>
                    <button type="button" class="add-button" data-add-id="${item.id}" data-name="${item.name}" data-price="${item.price}">Add</button>
                  </div>
                `
              )
              .join('')}
          </div>
        </article>
      `
    )
    .join('');
}

function renderMenu() {
  elements.menuContainer.innerHTML = buildMenuCards(state.menu);
}

function openModal(modalElement) {
  modalElement.classList.remove('hidden');
}

function closeModal(modalElement) {
  modalElement.classList.add('hidden');
}

function openUPIDeepLink(appType) {
  const { total } = getOrderSummary();
  const amount = Number(total || 0);
  const upiBase = {
    pa: encodeURIComponent(state.upiId),
    pn: encodeURIComponent(state.upiName),
    am: amount.toFixed(2),
    cu: 'INR',
    tn: encodeURIComponent(`Laural's Haven Order`)
  };

  const deepLinks = {
    gpay: `upi://pay?pa=${upiBase.pa}&pn=${upiBase.pn}&am=${upiBase.am}&cu=${upiBase.cu}&tn=${upiBase.tn}`,
    phonepe: `phonepe://pay?pa=${upiBase.pa}&pn=${upiBase.pn}&am=${upiBase.am}&cu=${upiBase.cu}&tn=${upiBase.tn}`,
    paytm: `paytmmp://pay?pa=${upiBase.pa}&pn=${upiBase.pn}&am=${upiBase.am}&cu=${upiBase.cu}&tn=${upiBase.tn}`,
    bhim: `bhim://upi/pay?pa=${upiBase.pa}&pn=${upiBase.pn}&am=${upiBase.am}&cu=${upiBase.cu}&tn=${upiBase.tn}`
  };

  const target = deepLinks[appType] || `upi://pay?pa=${upiBase.pa}&pn=${upiBase.pn}&am=${upiBase.am}&cu=${upiBase.cu}&tn=${upiBase.tn}`;

  window.location.href = target;
  showToast(`Opening ${appType.toUpperCase()}...`);
  setTimeout(() => {
    openModal(elements.qaModal);
  }, 600);
}

function clearCart() {
  cart.clear();
  renderCart();
}

async function submitOrder(event) {
  event.preventDefault();

  const formData = new FormData(elements.checkoutForm);
  const orderSummary = getOrderSummary();

  if (orderSummary.items.length === 0) {
    showToast('Your cart is empty.');
    return;
  }

  const payload = {
    customerName: formData.get('customerName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    notes: formData.get('notes'),
    paymentMethod: state.selectedUPI || 'upi',
    transactionRef: `LH-${Date.now().toString().slice(-8)}`,
    items: orderSummary.items,
    subtotal: orderSummary.subtotal,
    serviceFee: orderSummary.serviceFee,
    total: orderSummary.total
  };

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!result.success && !result.orderId) {
      throw new Error(result.message || 'Unable to place order.');
    }

    showToast(`Order placed successfully • ${result.orderId}`);
    clearCart();
    closeModal(elements.checkoutModal);
    elements.checkoutForm.reset();
    state.selectedUPI = null;
  } catch (error) {
    showToast(error.message || 'Unable to place order.');
  }
}

async function loadMenu() {
  try {
    const response = await fetch('/api/menu');
    const result = await response.json();
    state.menu = result.menu || [];
    state.upiId = result.upiId || state.upiId;
    state.upiName = result.upiName || state.upiName;
    renderMenu();
    renderCart();
    renderQrCode();
  } catch (error) {
    console.error('Could not load menu:', error);
    showToast('Menu is unavailable right now.');
  }
}

function renderQrCode() {
  if (!elements.qrCodeImage) {
    return;
  }

  const total = getOrderSummary().total || 0;
  const qrUrl = `/api/qr?amount=${encodeURIComponent(total)}`;
  elements.qrCodeImage.src = qrUrl;
  elements.qrCodeImage.alt = 'UPI QR code';
}

function attachEvents() {
  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-id]');
    if (addButton) {
      addItemToCart({
        id: addButton.dataset.addId,
        name: addButton.dataset.name,
        price: Number(addButton.dataset.price)
      });
      return;
    }

    const qtyButton = event.target.closest('[data-action]');
    if (qtyButton) {
      const { action, id } = qtyButton.dataset;
      updateItemQty(id, action === 'increment' ? 1 : -1);
      return;
    }

    const appOption = event.target.closest('[data-upi]');
    if (appOption) {
      state.selectedUPI = appOption.dataset.upi;
      openUPIDeepLink(state.selectedUPI);
      return;
    }

    const closeTarget = event.target.closest('[data-close]');
    if (closeTarget) {
      const modal = document.getElementById(closeTarget.dataset.close);
      closeModal(modal);
      return;
    }

    if (event.target.id === 'checkoutButton') {
      if (getOrderSummary().items.length === 0) {
        showToast('Add an item to the cart first.');
        return;
      }
      openModal(elements.checkoutModal);
    }

    if (event.target.id === 'cartTrigger') {
      elements.cartPanel.classList.toggle('open');
    }

    if (event.target.id === 'closeCart') {
      elements.cartPanel.classList.remove('open');
    }

    if (event.target.id === 'qrPaymentButton') {
      openModal(elements.qaModal);
    }

    if (event.target.id === 'clearFilters') {
      clearCart();
      showToast('Cart cleared.');
    }
  });

  elements.checkoutForm.addEventListener('submit', submitOrder);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal(elements.checkoutModal);
      closeModal(elements.qaModal);
    }
  });
}

attachEvents();
loadMenu();
