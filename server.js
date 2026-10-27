require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const UPI_ID = process.env.UPI_ID || 'paytm.s1pl5v7@pty';
const UPI_NAME = process.env.UPI_NAME || "Laural's Haven";
const STATUS_FLOW = ['pending', 'accepted', 'rejected', 'cooking', 'completed'];
const FALLBACK_PORTS = [3000, 3001, 3002, 8001, 8002];

function normalizeOrderStatus(status) {
  const normalized = String(status || 'pending').trim().toLowerCase();
  if (normalized === 'ready') return 'cooking';
  if (normalized === 'delivered') return 'completed';
  return normalized;
}
const defaultAllowedOrigins = [
  'https://andrewvijaykumar123.github.io',
  'https://andrewvijaykumar123.github.io/Laural-sHaven-UI',
  'https://andrewvijaykumar123.github.io/Laural-sHaven-UI-AdminConsole',
  'https://laurals-haven-api.onrender.com',
  'http://localhost:3000',
  'http://localhost:8001',
  'http://localhost:8002'
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultAllowedOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const orders = [];

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin = !origin ||
    allowedOrigins.includes(origin) ||
    /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
    /(?:github\.io|pages\.dev)$/i.test(origin) ||
    /https?:\/\/.*\.github\.io(?:\/[A-Za-z0-9._-]+)?$/i.test(origin);

  if (isAllowedOrigin && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload. Please send a valid request body.'
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Unexpected server error.'
  });
});
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(path.join(__dirname, 'public')));

const menu = [
  { category: 'Tea and Coffee', items: [
    { id: 'masala-tea', name: 'Masala Tea', price: 25 },
    { id: 'lemon-tea', name: 'Lemon Tea', price: 25 },
    { id: 'black-brew', name: 'Black Brew', price: 25 },
    { id: 'ginger-tea', name: 'Ginger Tea', price: 30 },
    { id: 'filter-coffee', name: 'Filter Coffee', price: 30 }
  ]},
  { category: 'Sandwiches', items: [
    { id: 'veg-sandwich', name: 'Veg Sandwich', price: 59 },
    { id: 'paneer-sandwich', name: 'Paneer Sandwich', price: 69 },
    { id: 'mushroom-sandwich', name: 'Mushroom Sandwich', price: 69 },
    { id: 'chicken-sandwich', name: 'Chicken Sandwich', price: 79 },
    { id: 'schezwan-chicken-sandwich', name: 'Schezwan Chicken Sandwich', price: 89 }
  ]},
  { category: 'Maggie', items: [
    { id: 'plain-maggie', name: 'Plain Maggie', price: 49 },
    { id: 'veg-maggie', name: 'Veg Maggie', price: 59 },
    { id: 'cheese-maggie', name: 'Cheese Maggie', price: 59 },
    { id: 'egg-maggie', name: 'Egg Maggie', price: 69 },
    { id: 'chicken-maggie', name: 'Chicken Maggie', price: 79 }
  ]},
  { category: 'Omelettes', items: [
    { id: 'plain-omelette', name: 'Plain Omelette', price: 30 },
    { id: 'cheese-omelette', name: 'Cheese Omelette', price: 49 },
    { id: 'chicken-omelette', name: 'Chicken Omelette', price: 59 }
  ]},
  { category: "Momo's", items: [
    { id: 'veg-momos', name: 'Veg Momos', price: 69 },
    { id: 'schezwan-veg-momos', name: 'Schezwan Veg Momos', price: 79 },
    { id: 'chicken-momos', name: 'Chicken Momos', price: 89 },
    { id: 'schezwan-chicken-momos', name: 'Schezwan Chicken Momos', price: 99 }
  ]},
  { category: 'Kids Snacks', items: [
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
  ]},
  { category: 'Water Based Drinks (400ml)', items: [
    { id: 'watermelon', name: 'Watermelon', price: 49 },
    { id: 'musk-melon', name: 'Musk Melon', price: 49 },
    { id: 'lemon-juice', name: 'Lemon Juice', price: 29 },
    { id: 'mint-lime', name: 'Mint Lime', price: 29 },
    { id: 'guava', name: 'Guava', price: 69 },
    { id: 'sapodilla', name: 'Sapodilla (Sapotta)', price: 69 },
    { id: 'grape', name: 'Grape', price: 69 }
  ]},
  { category: 'Milk Based Drinks (300ml)', items: [
    { id: 'tender-coconut', name: 'Tender Coconut', price: 149 },
    { id: 'avocado', name: 'Avocado', price: 149 },
    { id: 'jackfruit', name: 'Jackfruit', price: 149 },
    { id: 'strawberry', name: 'Strawberry', price: 149 },
    { id: 'custard-apple', name: 'Custard Apple', price: 149 },
    { id: 'mango', name: 'Mango', price: 149 },
    { id: 'dry-fig', name: 'Dry Fig', price: 149 }
  ]},
  { category: "Haven's Specials", items: [
    { id: 'cheesy-chicken', name: 'Cheesy Chicken', price: 249 },
    { id: 'dragon-fire-chicken', name: 'Dragon Fire Chicken', price: 249 },
    { id: 'chicken-protein-salad', name: 'Chicken Protein Salad', price: 229 },
    { id: 'veg-protein-salad', name: 'Veg Protein Salad', price: 189 }
  ]},
  { category: 'Haven Special Drinks', items: [
    { id: 'mocha-mist', name: 'Mocha Mist', price: 159 },
    { id: 'magic-milo', name: 'Magic Milo', price: 149 },
    { id: 'hot-chocolate', name: 'Hot Chocolate', price: 169 },
    { id: 'haven-fuel', name: 'Haven Fuel', price: 159 },
    { id: 'chocolate-shake', name: 'Chocolate Shake', price: 159 }
  ]},
  { category: "Chicken Tikka's", items: [
    { id: 'mint-fusion-tikka', name: 'Mint Fusion Tikka', price: 279 },
    { id: 'malai-mist-tikka', name: 'Malai Mist Tikka', price: 279 },
    { id: 'tandoori-blaze-tikka', name: 'Tandoori Blaze Tikka', price: 279 }
  ]},
  { category: 'Veg Tikkas', items: [
    { id: 'herb-paneer-tikka', name: 'Herb Paneer Tikka', price: 229 },
    { id: 'forest-mushroom-tikka', name: 'Forest Mushroom Tikka', price: 219 }
  ]},
  { category: 'Premium Burgers & Wraps', items: [
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
  ]},
  { category: 'Combo Boxes & Combos', items: [
    { id: 'tea-coffee-fries', name: 'Tea/Coffee/Cookies + French Fries', price: 69 },
    { id: 'tea-coffee-momos', name: 'Tea/Coffee/Cookies + Veg Momos', price: 99 },
    { id: 'tea-coffee-chicken-momos', name: 'Tea/Coffee/Cookies + Chicken Momos', price: 119 },
    { id: 'tea-coffee-veg-sandwich', name: 'Tea/Coffee/Cookies + Veg Sandwich', price: 99 },
    { id: 'tea-coffee-chicken-sandwich', name: 'Tea/Coffee/Cookies + Chicken Sandwich', price: 119 },
    { id: 'veg-burger-wrap-pops-fries', name: 'Veg Burger/Wrap + Paneer Pops + Fries + Coke', price: 219 },
    { id: 'nonveg-burger-wrap-popcorn-fries', name: 'Non Veg Burger/Wrap + Popcorn + Fries + Coke', price: 259 },
    { id: 'paneer-loaded-mojito', name: 'Paneer Loaded Fries + Mojito', price: 219 },
    { id: 'chicken-loaded-mojito', name: 'Chicken Loaded Fries + Mojito', price: 249 }
  ]},
  { category: 'Tikka & Protein Combos', items: [
    { id: 'tikka-roti-grape', name: 'Tikka + 2 Roti + Grape Splash', price: 329 },
    { id: 'veg-tikka-roti-grape', name: 'Veg Tikka + 2 Roti + Grape Splash', price: 299 },
    { id: 'nonveg-salad-banana-shake', name: 'Non Veg Salad + Red Banana Shake', price: 329 },
    { id: 'veg-salad-banana-shake', name: 'Veg Salad + Red Banana Shake', price: 299 }
  ]}
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function createUpiLink(amount = 0) {
  const safeAmount = Number(amount || 0).toFixed(2);
  return `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${safeAmount}&cu=INR&tn=${encodeURIComponent("Laural's Haven")}`;
}

function createOrderId() {
  return `LH-${Date.now().toString().slice(-8)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function toPublicOrder(order) {
  return {
    ...order,
    status: normalizeOrderStatus(order.status || 'pending'),
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || new Date().toISOString(),
    total: Number(order.total || 0),
    subtotal: Number(order.subtotal || order.total || 0),
    items: Array.isArray(order.items) ? order.items.map((item) => ({
      id: item.id,
      name: item.name,
      qty: Number(item.qty || 1),
      price: Number(item.price || 0)
    })) : []
  };
}

function buildAdminSummary() {
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'pending').length;
  const acceptedOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'accepted').length;
  const rejectedOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'rejected').length;
  const cookingOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'cooking').length;
  const completedOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'completed').length;

  const itemCounts = new Map();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.name;
      const current = itemCounts.get(key) || 0;
      itemCounts.set(key, current + Number(item.qty || 0));
    });
  });

  const popularItems = Array.from(itemCounts.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    totalRevenue: revenue,
    totalOrders: orders.length,
    pendingOrders,
    acceptedOrders,
    rejectedOrders,
    cookingOrders,
    completedOrders,
    deliveredOrders: completedOrders,
    popularItems,
    recentOrders: orders.slice(0, 6)
  };
}

app.get('/api/menu', (_req, res) => {
  res.json({ menu, upiId: UPI_ID, upiName: UPI_NAME });
});

app.get('/api/qr', async (req, res) => {
  try {
    const amount = Number(req.query.amount || 0);
    const upiLink = createUpiLink(amount);
    const qrDataUrl = await QRCode.toDataURL(upiLink, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 340,
      color: { dark: '#111827', light: '#ffffff' }
    });

    res.type('image/png').send(Buffer.from(qrDataUrl.split(',')[1], 'base64'));
  } catch (error) {
    console.error('QR generation failed:', error);
    res.status(500).json({ success: false, message: 'Could not generate QR code.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: "Laural's Haven ordering app" });
});

app.get('/api/orders', (_req, res) => {
  res.json({ success: true, orders: orders.map(toPublicOrder).slice(0, 50) });
});

app.get('/api/admin/summary', (_req, res) => {
  res.json({ success: true, summary: buildAdminSummary() });
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const requestedStatus = normalizeOrderStatus(req.body?.status);
  const orderIndex = orders.findIndex((order) => order.id === id);

  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  if (!STATUS_FLOW.includes(requestedStatus)) {
    return res.status(400).json({ success: false, message: 'Unknown order status.' });
  }

  orders[orderIndex].status = requestedStatus;
  orders[orderIndex].updatedAt = new Date().toISOString();

  return res.json({ success: true, order: toPublicOrder(orders[orderIndex]) });
});

app.post('/api/checkout', async (req, res) => {
  const payload = req.body || {};
  const customerName = String(payload.customerName || '').trim();
  const phone = String(payload.phone || '').trim();
  const notes = String(payload.notes || '').trim();
  const paymentMethod = String(payload.paymentMethod || 'upi').trim();
  const orderItems = Array.isArray(payload.items) ? payload.items : [];
  const transactionRef = String(payload.transactionRef || `LH-${crypto.randomBytes(6).toString('hex').toUpperCase()}`);
  const subtotal = Number(payload.subtotal || 0);
  const total = Number(payload.total || subtotal);

  if (!customerName || !phone || orderItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Customer name, phone number and at least one menu item are required.'
    });
  }

  const normalizedOrder = {
    id: createOrderId(),
    customerName,
    phone,
    notes,
    paymentMethod,
    upiId: UPI_ID,
    transactionRef,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: orderItems.map((item) => ({
      id: item.id,
      name: item.name,
      qty: Number(item.qty || 1),
      price: Number(item.price || 0)
    })),
    subtotal,
    total
  };

  orders.unshift(normalizedOrder);

  return res.status(200).json({
    success: true,
    orderId: normalizedOrder.id,
    paymentReference: normalizedOrder.transactionRef,
    message: 'Order placed successfully. Please complete the UPI payment and keep the transaction reference for your receipt.',
    order: toPublicOrder(normalizedOrder)
  });
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Laural's Haven app is running on http://localhost:${port}`);
    console.log(`Admin console is available at http://localhost:${port}/admin`);
    console.log(`Configured UPI ID: ${UPI_ID}`);
    console.log('Kitchen queue sync is active.');
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      const nextPort = FALLBACK_PORTS.find((candidate) => candidate !== port && candidate !== PORT);
      if (nextPort) {
        console.warn(`Port ${port} is busy; retrying on ${nextPort}...`);
        startServer(nextPort);
        return;
      }

      console.error(`No free port available. Tried ${FALLBACK_PORTS.join(', ')}`);
      process.exit(1);
    }

    throw error;
  });
}

startServer(Number(process.env.PORT) || PORT);
