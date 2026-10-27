const ASSET_VERSION = '20261027-full-menu';
const API_BASE = (window.LH_API_BASE || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://laurals-haven-api.onrender.com'
)).replace(/\/$/, '');
window.LH_API_BASE = API_BASE;

const MOCK_MENU_RESPONSE = {
  upiId: 'paytm.s1pl5v7@pty',
  upiName: "Laural's Haven",
  menu: [
    {
      category: 'Tea and Coffee',
      items: [
        { id: 'masala-tea', name: 'Masala Tea', price: 25 },
        { id: 'lemon-tea', name: 'Lemon Tea', price: 25 },
        { id: 'black-brew', name: 'Black Brew', price: 25 },
        { id: 'ginger-tea', name: 'Ginger Tea', price: 30 },
        { id: 'filter-coffee', name: 'Filter Coffee', price: 30 }
      ]
    },
    {
      category: 'Sandwiches',
      items: [
        { id: 'veg-sandwich', name: 'Veg Sandwich', price: 59 },
        { id: 'paneer-sandwich', name: 'Paneer Sandwich', price: 69 },
        { id: 'mushroom-sandwich', name: 'Mushroom Sandwich', price: 69 },
        { id: 'chicken-sandwich', name: 'Chicken Sandwich', price: 79 },
        { id: 'schezwan-chicken-sandwich', name: 'Schezwan Chicken Sandwich', price: 89 }
      ]
    },
    {
      category: 'Maggie',
      items: [
        { id: 'plain-maggie', name: 'Plain Maggie', price: 49 },
        { id: 'veg-maggie', name: 'Veg Maggie', price: 59 },
        { id: 'cheese-maggie', name: 'Cheese Maggie', price: 59 },
        { id: 'egg-maggie', name: 'Egg Maggie', price: 69 },
        { id: 'chicken-maggie', name: 'Chicken Maggie', price: 79 }
      ]
    },
    {
      category: 'Omelettes',
      items: [
        { id: 'plain-omelette', name: 'Plain Omelette', price: 30 },
        { id: 'cheese-omelette', name: 'Cheese Omelette', price: 49 },
        { id: 'chicken-omelette', name: 'Chicken Omelette', price: 59 }
      ]
    },
    {
      category: "Momo's",
      items: [
        { id: 'veg-momos', name: 'Veg Momos', price: 69 },
        { id: 'schezwan-veg-momos', name: 'Schezwan Veg Momos', price: 79 },
        { id: 'chicken-momos', name: 'Chicken Momos', price: 89 },
        { id: 'schezwan-chicken-momos', name: 'Schezwan Chicken Momos', price: 99 }
      ]
    },
    {
      category: 'Kids Snacks',
      items: [
        { id: 'paneer-pops', name: 'Paneer Pops', price: 99 },
        { id: 'chicken-pops', name: 'Chicken Pops', price: 99 },
        { id: 'french-fries', name: 'French Fries', price: 99 },
        { id: 'peri-peri-fries', name: 'Peri Peri Fries', price: 99 },
        { id: 'patty-veg-burger', name: 'Patty Veg Burger', price: 129 },
        { id: 'chicken-burger', name: 'Chicken Burger', price: 139 },
        { id: 'kiddo-veg-burger', name: 'Kiddo Veg Burger', price: 89 },
        { id: 'kiddo-chicken-burger', name: 'Kiddo Chicken Burger', price: 99 },
        { id: 'chicken-loaded-fries', name: 'Chicken Loaded Fries', price: 189 },
        { id: 'paneer-loaded-fries', name: 'Paneer Loaded Fries', price: 159 }
      ]
    },
    {
      category: 'Water Based Drinks (400ml)',
      items: [
        { id: 'watermelon', name: 'Watermelon', price: 49 },
        { id: 'musk-melon', name: 'Musk Melon', price: 49 },
        { id: 'lemon-juice', name: 'Lemon Juice', price: 29 },
        { id: 'mint-lime', name: 'Mint Lime', price: 29 },
        { id: 'guava', name: 'Guava', price: 69 },
        { id: 'sapodilla', name: 'Sapodilla (Sapotta)', price: 69 },
        { id: 'grape', name: 'Grape', price: 69 }
      ]
    },
    {
      category: 'Milk Based Drinks (300ml)',
      items: [
        { id: 'tender-coconut', name: 'Tender Coconut', price: 149 },
        { id: 'avocado', name: 'Avocado', price: 149 },
        { id: 'jackfruit', name: 'Jackfruit', price: 149 },
        { id: 'strawberry', name: 'Strawberry', price: 149 },
        { id: 'custard-apple', name: 'Custard Apple', price: 149 },
        { id: 'mango', name: 'Mango', price: 149 },
        { id: 'dry-fig', name: 'Dry Fig', price: 149 }
      ]
    },
    {
      category: "Haven's Specials",
      items: [
        { id: 'cheesy-chicken', name: 'Cheesy Chicken', price: 249 },
        { id: 'dragon-fire-chicken', name: 'Dragon Fire Chicken', price: 249 },
        { id: 'chicken-protein-salad', name: 'Chicken Protein Salad', price: 229 },
        { id: 'veg-protein-salad', name: 'Veg Protein Salad', price: 189 }
      ]
    },
    {
      category: 'Haven Special Drinks',
      items: [
        { id: 'mocha-mist', name: 'Mocha Mist', price: 159 },
        { id: 'magic-milo', name: 'Magic Milo', price: 149 },
        { id: 'hot-chocolate', name: 'Hot Chocolate', price: 169 },
        { id: 'haven-fuel', name: 'Haven Fuel', price: 159 },
        { id: 'chocolate-shake', name: 'Chocolate Shake', price: 159 }
      ]
    },
    {
      category: "Chicken Tikka's",
      items: [
        { id: 'mint-fusion-tikka', name: 'Mint Fusion Tikka', price: 279 },
        { id: 'malai-mist-tikka', name: 'Malai Mist Tikka', price: 279 },
        { id: 'tandoori-blaze-tikka', name: 'Tandoori Blaze Tikka', price: 279 }
      ]
    },
    {
      category: 'Veg Tikkas',
      items: [
        { id: 'herb-paneer-tikka', name: 'Herb Paneer Tikka', price: 229 },
        { id: 'forest-mushroom-tikka', name: 'Forest Mushroom Tikka', price: 219 }
      ]
    },
    {
      category: 'Premium Burgers & Wraps',
      items: [
        { id: 'artemis-tikka-burger', name: 'The Artemis Tikka Burger (UFO)', price: 239 },
        { id: 'aurora-mint-burger', name: 'The Aurora Mint Burger', price: 249 },
        { id: 'hot-crispy-burger', name: 'Hot & Crispy Burger', price: 229 },
        { id: 'apollo-tikka-burger', name: 'The Apollo Tikka Burger (UFO)', price: 249 },
        { id: 'mystic-mushroom-burger', name: 'Mystic Mushroom Burger', price: 189 },
        { id: 'paneer-royale-burger', name: 'Paneer Royale Burger', price: 199 },
        { id: 'crispy-chicken-wrap', name: 'Crispy Chicken Wrap', price: 179 },
        { id: 'mint-magic-wrap', name: 'Mint Magic Wrap', price: 189 },
        { id: 'malai-tikka-wrap', name: 'Malai Tikka Wrap', price: 189 },
        { id: 'tandoori-tikka-wrap', name: 'Tandoori Tikka Wrap', price: 189 },
        { id: 'mushroom-medley-wrap', name: 'Mushroom Medley Wrap', price: 159 },
        { id: 'paneer-peri-wrap', name: 'Paneer Peri Wrap', price: 169 }
      ]
    },
    {
      category: 'Combo Boxes & Combos',
      items: [
        { id: 'tea-coffee-fries', name: 'Tea/Coffee/Cookies + French Fries', price: 69 },
        { id: 'tea-coffee-momos', name: 'Tea/Coffee/Cookies + Veg Momos', price: 99 },
        { id: 'tea-coffee-chicken-momos', name: 'Tea/Coffee/Cookies + Chicken Momos', price: 119 },
        { id: 'tea-coffee-veg-sandwich', name: 'Tea/Coffee/Cookies + Veg Sandwich', price: 99 },
        { id: 'tea-coffee-chicken-sandwich', name: 'Tea/Coffee/Cookies + Chicken Sandwich', price: 119 },
        { id: 'veg-burger-wrap-pops-fries', name: 'Veg Burger/Wrap + Paneer Pops + Fries + Coke', price: 219 },
        { id: 'nonveg-burger-wrap-popcorn-fries', name: 'Non Veg Burger/Wrap + Popcorn + Fries + Coke', price: 259 },
        { id: 'paneer-loaded-mojito', name: 'Paneer Loaded Fries + Mojito', price: 219 },
        { id: 'chicken-loaded-mojito', name: 'Chicken Loaded Fries + Mojito', price: 249 }
      ]
    },
    {
      category: 'Tikka & Protein Combos',
      items: [
        { id: 'tikka-roti-grape', name: 'Tikka + 2 Roti + Grape Splash', price: 329 },
        { id: 'veg-tikka-roti-grape', name: 'Veg Tikka + 2 Roti + Grape Splash', price: 299 },
        { id: 'nonveg-salad-banana-shake', name: 'Non Veg Salad + Red Banana Shake', price: 329 },
        { id: 'veg-salad-banana-shake', name: 'Veg Salad + Red Banana Shake', price: 299 }
      ]
    }
  ]
};

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
  upiName: "Laural's Haven",
  filters: {
    query: '',
    category: 'all',
    sort: 'featured'
  }
};

function getMockResponse(path) {
  const normalizedPath = (path || '').toLowerCase();

  if (normalizedPath.includes('/api/menu')) {
    return MOCK_MENU_RESPONSE;
  }

  if (normalizedPath.includes('/api/checkout')) {
    return {
      success: true,
      orderId: `LH-${Date.now().toString().slice(-8)}`,
      paymentReference: 'MOCK-UPI-REF',
      message: 'Mock checkout completed successfully.'
    };
  }

  if (normalizedPath.includes('/api/orders/') && normalizedPath.includes('/status')) {
    return { success: true, updated: true };
  }

  return null;
}

const POPULAR_ITEMS = new Set(['haven-fuel', 'mocha-mist', 'paneer-sandwich', 'chicken-burger', 'veg-momos']);

async function fetchJsonWithRetry(path, options = {}, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(apiUrl(path), {
        cache: 'no-store',
        ...options
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError = {};
        try {
          parsedError = JSON.parse(errorText);
        } catch (error) {
          parsedError = {};
        }
        throw new Error(parsedError.message || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }

  const fallbackPayload = getMockResponse(path);
  if (fallbackPayload) {
    return fallbackPayload;
  }

  throw lastError || new Error('API request failed.');
}

function getApiBase() {
  return API_BASE;
}

function apiUrl(path, baseUrl = API_BASE) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/$/, '')}${normalizedPath}`;
}

function hasConfiguredBackend() {
  return true;
}

const elements = {
  menuContainer: document.getElementById('menuContainer'),
  menuSearch: document.getElementById('menuSearch'),
  menuSort: document.getElementById('menuSort'),
  categoryFilters: document.getElementById('categoryFilters'),
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
                  <div class="menu-item ${POPULAR_ITEMS.has(item.id) ? 'popular-item' : ''}">
                    <div class="menu-item-copy">
                      <h5>${item.name}</h5>
                      ${POPULAR_ITEMS.has(item.id) ? '<span class="popular-badge">Popular</span>' : ''}
                    </div>
                    <div class="menu-item-meta">
                      <span class="item-price">${formatCurrency(item.price)}</span>
                      <span class="item-tag">${section.category}</span>
                    </div>
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

function getVisibleMenu() {
  const query = state.filters.query.trim().toLowerCase();
  const sorted = [...state.menu].map((section) => ({
    ...section,
    items: [...section.items]
  }));

  const filteredSections = sorted.map((section) => {
    const items = section.items.filter((item) => {
      const matchesCategory = state.filters.category === 'all' || section.category.toLowerCase() === state.filters.category.toLowerCase();
      const matchesSearch = !query || item.name.toLowerCase().includes(query) || section.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    return { ...section, items };
  }).filter((section) => section.items.length > 0);

  filteredSections.forEach((section) => {
    const sortMode = state.filters.sort;
    section.items.sort((a, b) => {
      if (sortMode === 'price-low') return a.price - b.price;
      if (sortMode === 'price-high') return b.price - a.price;
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      return (POPULAR_ITEMS.has(b.id) ? 1 : 0) - (POPULAR_ITEMS.has(a.id) ? 1 : 0) || a.name.localeCompare(b.name);
    });
  });

  return filteredSections;
}

function renderMenu() {
  const sections = getVisibleMenu();
  if (!sections.length) {
    elements.menuContainer.innerHTML = '<div class="empty-cart">No dishes match your search. Try another keyword or filter.</div>';
    return;
  }

  elements.menuContainer.innerHTML = buildMenuCards(sections);
}

function renderCategoryFilters() {
  const categories = ['all', ...state.menu.map((section) => section.category)];
  elements.categoryFilters.innerHTML = categories
    .map((category) => {
      const selected = state.filters.category === category;
      const label = category === 'all' ? 'All' : category;
      return `<button type="button" class="category-filter ${selected ? 'active' : ''}" data-category="${category}">${label}</button>`;
    })
    .join('');
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
    notes: formData.get('notes'),
    paymentMethod: state.selectedUPI || 'upi',
    transactionRef: `LH-${Date.now().toString().slice(-8)}`,
    items: orderSummary.items,
    subtotal: orderSummary.subtotal,
    total: orderSummary.total
  };

  try {
    const response = await fetch(apiUrl('/api/checkout'), {
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
    showConfirmation(confirmedOrder, 'synced');
  } catch (error) {
    console.error('Checkout failed:', error);
    const confirmedOrder = {
      ...payload,
      id: `LH-${Date.now().toString().slice(-8)}`,
      transactionRef: 'MOCK-UPI-REF',
      total: Number(payload.total || 0),
      items: payload.items || []
    };
    showToast(`Mock order placed successfully • ${confirmedOrder.id}`);
    clearCart();
    closeModal(elements.checkoutModal);
    closeModal(elements.qaModal);
    elements.checkoutForm.reset();
    state.selectedUPI = null;
    showConfirmation(confirmedOrder, 'mock');
  }
}

async function loadMenu() {
  try {
    const result = await fetchJsonWithRetry('/api/menu');
    const menu = Array.isArray(result.menu) ? result.menu : [];

    if (!menu.length) {
      throw new Error('Menu payload was empty.');
    }

    state.menu = menu;
    state.upiId = result.upiId || state.upiId;
    state.upiName = result.upiName || state.upiName;
    renderMenu();
    renderCart();
    renderQrCode();
  } catch (error) {
    console.error('Could not load menu from API.', error);
    showToast('Menu is unavailable right now.');
    elements.menuContainer.innerHTML = '<div class="empty-cart">The live menu service is unavailable right now.</div>';
  }
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

function showConfirmation(order, _status = 'synced') {
  if (!order) return;

  const items = order.items || [];
  const paymentText = order.paymentMethod ? order.paymentMethod.toUpperCase() : 'UPI';

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
    footerText.textContent = 'Kitchen board updated';
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

    const categoryButton = event.target.closest('[data-category]');
    if (categoryButton) {
      state.filters.category = categoryButton.dataset.category;
      renderCategoryFilters();
      renderMenu();
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
      state.filters.query = '';
      state.filters.category = 'all';
      state.filters.sort = 'featured';
      if (elements.menuSearch) elements.menuSearch.value = '';
      if (elements.menuSort) elements.menuSort.value = 'featured';
      renderCategoryFilters();
      renderMenu();
      showToast('Filters reset.');
    }
  });

  if (elements.menuSearch) {
    elements.menuSearch.addEventListener('input', (event) => {
      state.filters.query = event.target.value;
      renderMenu();
    });
  }

  if (elements.menuSort) {
    elements.menuSort.addEventListener('change', (event) => {
      state.filters.sort = event.target.value;
      renderMenu();
    });
  }

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
