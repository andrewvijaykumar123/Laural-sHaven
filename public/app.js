const ASSET_VERSION = '20261026-1';

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

const OWNER_EMAIL = 'andrewvijaykumar123@gmail.com';

const elements = {
  menuContainer: document.getElementById('menuContainer'),
  cartTrigger: document.getElementById('cartTrigger'),
  cartPanel: document.getElementById('cartPanel'),
  closeCart: document.getElementById('closeCart'),
  cartItems: document.getElementById('cartItems'),
  cartCount: document.getElementById('cartCount'),
  subtotalValue: document.getElementById('subtotalValue'),
  serviceFeeValue: document.getElementById('serviceFeeValue'),
  sgstValue: document.getElementById('sgstValue'),
  totalValue: document.getElementById('totalValue'),
  checkoutButton: document.getElementById('checkoutButton'),
  checkoutModal: document.getElementById('checkoutModal'),
  qaModal: document.getElementById('qrModal'),
  checkoutSubtotal: document.getElementById('checkoutSubtotal'),
  checkoutServiceFee: document.getElementById('checkoutServiceFee'),
  checkoutSgst: document.getElementById('checkoutSgst'),
  checkoutTotal: document.getElementById('checkoutTotal'),
  checkoutForm: document.getElementById('checkoutForm'),
  qrPaymentButton: document.getElementById('qrPaymentButton'),
  qrCodeImage: document.getElementById('qrCodeImage'),
  confirmationModal: document.getElementById('confirmationModal'),
  confirmationOrderId: document.getElementById('confirmationOrderId'),
  confirmationTransaction: document.getElementById('confirmationTransaction'),
  confirmationCustomer: document.getElementById('confirmationCustomer'),
  confirmationPayment: document.getElementById('confirmationPayment'),
  confirmationItems: document.getElementById('confirmationItems'),
  confirmationTotal: document.getElementById('confirmationTotal'),
  toast: document.getElementById('toast')
};

function staticAssetUrl(path) {
  return `${path}?v=${ASSET_VERSION}`;
}

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

function isStaticHost() {
  const host = window.location.hostname || '';
  return host.includes('github.io') || host.includes('pages.dev') || host === '';
}

function getOrderSummary() {
  const items = Array.from(cart.values()).map((entry) => ({
    id: entry.id,
    name: entry.name,
    price: Number(entry.price),
    qty: Number(entry.qty)
  }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal;

  return { items, subtotal, cgst: 0, sgst: 0, total };
}

function renderCart() {
  const orderSummary = getOrderSummary();
  const items = orderSummary.items;

  elements.cartCount.textContent = items.reduce((sum, item) => sum + item.qty, 0);
  elements.subtotalValue.textContent = formatCurrency(orderSummary.subtotal);
  if (elements.serviceFeeValue) elements.serviceFeeValue.textContent = 'Included';
  if (elements.sgstValue) elements.sgstValue.textContent = formatCurrency(orderSummary.total);
  elements.totalValue.textContent = formatCurrency(orderSummary.total);
  elements.checkoutSubtotal.textContent = formatCurrency(orderSummary.subtotal);
  if (elements.checkoutServiceFee) elements.checkoutServiceFee.textContent = 'Included';
  if (elements.checkoutSgst) elements.checkoutSgst.textContent = formatCurrency(orderSummary.total);
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
  const quantity = Number(item.qty || 1);
  const existing = cart.get(item.id);

  if (existing) {
    existing.qty += quantity;
    cart.set(item.id, existing);
  } else {
    cart.set(item.id, { ...item, qty: quantity });
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
                    <div class="menu-item-copy">
                      <h5>${item.name}</h5>
                    </div>
                    <span class="item-price">${formatCurrency(item.price)}</span>
                    <div class="menu-item-actions">
                      <button type="button" class="add-button" data-add-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-qty="1">Add</button>
                    </div>
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
    cgst: orderSummary.cgst,
    sgst: orderSummary.sgst,
    total: orderSummary.total
  };

  try {
    if (isStaticHost()) {
      const confirmedOrder = {
        ...payload,
        id: payload.transactionRef,
        transactionRef: payload.transactionRef,
        total: Number(payload.total || 0),
        items: payload.items || []
      };

      showToast(`Order placed successfully • ${confirmedOrder.id}`);
      clearCart();
      closeModal(elements.checkoutModal);
      closeModal(elements.qaModal);
      elements.checkoutForm.reset();
      state.selectedUPI = null;
      showConfirmation(confirmedOrder, 'local_static');
      return;
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error('Checkout backend is unavailable on this host.');
    }

    if (!response.ok || (!result.success && !result.orderId)) {
      throw new Error(result.message || 'Unable to place order.');
    }

    const confirmedOrder = {
      ...payload,
      id: result.orderId || `LH-${Date.now().toString().slice(-8)}`,
      transactionRef: result.paymentReference || payload.transactionRef,
      total: Number(payload.total || result.order?.total || 0),
      items: payload.items || result.order?.items || []
    };

    showToast(`Order placed successfully • ${confirmedOrder.id}`);
    clearCart();
    closeModal(elements.checkoutModal);
    closeModal(elements.qaModal);
    elements.checkoutForm.reset();
    state.selectedUPI = null;
    showConfirmation(confirmedOrder, result.emailStatus || 'sent');
  } catch (error) {
    showToast(error.message || 'Unable to place order.');
  }
}

async function loadMenu() {
  const menuSources = [`/api/menu?ts=${Date.now()}`, staticAssetUrl('./menu.json')];

  for (const source of menuSources) {
    try {
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const result = await response.json();
      const menu = Array.isArray(result.menu) ? result.menu : Array.isArray(result) ? result : [];

      if (!menu.length) {
        continue;
      }

      state.menu = menu;
      state.upiId = result.upiId || state.upiId;
      state.upiName = result.upiName || state.upiName;
      renderMenu();
      renderCart();
      renderQrCode();
      return;
    } catch (error) {
      console.warn(`Menu fallback failed for ${source}:`, error);
    }
  }

  console.error('Could not load menu from API or bundled JSON.');
  showToast('Menu is unavailable right now.');
}

function renderQrCode() {
  if (!elements.qrCodeImage) {
    return;
  }

  const total = getOrderSummary().total || 0;
  const upiLink = `upi://pay?pa=${encodeURIComponent(state.upiId)}&pn=${encodeURIComponent(state.upiName)}&am=${Number(total || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent("Laural's Haven Order")}`;
  const encodedUpi = encodeURIComponent(upiLink);

  elements.qrCodeImage.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedUpi}&size=300x300&ecc=M`;
  elements.qrCodeImage.alt = 'UPI QR code';
}

function showConfirmation(order, emailStatus = 'sent') {
  if (!order) return;

  const items = order.items || [];
  const paymentText = order.paymentMethod ? order.paymentMethod.toUpperCase() : 'UPI';
  const emailLabel = emailStatus === 'delivery_failed'
    ? 'Email delivery failed from this network'
    : `Email sent to ${OWNER_EMAIL}`;

  elements.confirmationOrderId.textContent = order.id || order.orderId || 'Processing';
  elements.confirmationTransaction.textContent = order.transactionRef || 'QR payment';
  elements.confirmationCustomer.textContent = order.customerName || 'Guest';
  elements.confirmationPayment.textContent = paymentText;
  elements.confirmationTotal.textContent = formatCurrency(order.total || 0);
  elements.confirmationItems.innerHTML = items
    .map(
      (item) => `
        <li>
          <span>${item.name}</span>
          <span>${item.qty}x</span>
          <span>${formatCurrency((Number(item.price) || 0) * (Number(item.qty) || 1))}</span>
        </li>
      `
    )
    .join('');

  const footerText = elements.confirmationModal.querySelector('.confirmation-footer div strong');
  if (footerText) {
    footerText.textContent = emailLabel;
  }

  openModal(elements.confirmationModal);
}

function attachEvents() {
  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-id]');
    if (addButton) {
      addItemToCart({
        id: addButton.dataset.addId,
        name: addButton.dataset.name,
        price: Number(addButton.dataset.price),
        qty: Number(addButton.dataset.qty || 1)
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
