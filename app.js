/* Laural's Haven storefront */
(() => {
  'use strict';
  const { MENU, ITEMS, STATUS, fmt, esc, store, UPI } = window.LH;
  const LH = window.LH;
  LH.init('shop');
  LH.connect('ops');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- State ---------- */
  let cart = store.get('cart', {});
  // Saved orders come from this device's storage: drop anything malformed rather than letting it break the page.
  const loadOrders = (fallback) => {
    const raw = store.get('orders', fallback);
    return (Array.isArray(raw) ? raw : []).filter((o) => o && typeof o === 'object' && LH.validId(o.id) && Array.isArray(o.it) && o.it.every((l) => Array.isArray(l) && l.length === 2 && typeof l[0] === 'string' && Number.isInteger(l[1]) && l[1] >= 1 && l[1] <= 25) && Number.isInteger(o.total) && o.total > 0 && o.total <= 100000)
      .map((o) => (o.fb && !(Number.isInteger(o.fb.sr) && o.fb.sr >= 1 && o.fb.sr <= 5) ? { ...o, fb: null } : o)).slice(0, 25);
  };
  let orders = loadOrders([]);
  const filters = { q: '', diet: 'all' };
  let checkout = false;
  let payMethod = store.get('pay', 'upi');
  if (!['upi', 'counter'].includes(payMethod)) payMethod = 'upi';
  let service = store.get('svc', 'dine');
  if (!['dine', 'take', 'deliver'].includes(service)) service = 'dine';
  let lastPlaced = store.get('lastPlaced', 0);
  // Delivery: the customer's chosen spot (GPS or map pin). Only reused for 30 minutes, then we ask again.
  let geo = store.get('geo', null);
  if (!geo || !LH.validPoint(geo.lat, geo.lng) || Date.now() - (geo.ts || 0) > 30 * 60000) geo = null;
  let geoState = 'idle', geoNote = '', locReq = 0, pickCtl = null, pickToken = 0;
  const riders = new Map();

  const orderable = (id) => ITEMS.has(id) && !ITEMS.get(id).hide;
  cart = Object.fromEntries(Object.entries(cart && typeof cart === 'object' ? cart : {}).filter(([id, q]) => orderable(id) && Number.isInteger(q) && q > 0 && q <= 25));
  const saveCart = () => store.set('cart', cart);
  const saveOrders = () => {
    store.set('orders', orders.slice(0, 25));
    LH.watch(orders.filter((o) => !['completed', 'rejected'].includes(o.status)).map((o) => o.id));
  };
  saveOrders();
  const isOut = (id) => LH.getCfg().oos.includes(id);
  const cartLines = () => Object.entries(cart).map(([id, qty]) => ({ item: ITEMS.get(id), qty }));
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => cartLines().reduce((s, l) => s + l.item.price * l.qty, 0);
  const DIET = { v: 'Veg', e: 'Egg', n: 'Non-veg' };

  /* ---------- Toasts ---------- */
  function toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 3200);
  }

  /* ---------- Theme ---------- */
  const setTheme = (t) => { document.documentElement.dataset.theme = t; store.set('theme', t); };
  setTheme(store.get('theme', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  $('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

  /* ---------- Menu rendering ---------- */
  const cardHTML = (it) => `
    <article class="card reveal" data-id="${it.id}" data-cat="${it.cat}" style="--h:${MENU.find((c) => c.id === it.cat).hue % 360}">
      <div class="card-top">
        <div class="emoji" aria-hidden="true">${it.icon}</div>
        <div><h3>${esc(it.name)}</h3>
          <div class="meta"><i class="dd ${it.diet}" title="${DIET[it.diet]}"></i>${it.best ? '<span class="tag">Bestseller</span>' : ''}<span class="tag out" hidden>Sold out</span></div></div>
      </div>
      <div class="card-bot"><span class="price">${fmt(it.price)}</span><span class="ctl"></span></div>
    </article>`;

  function buildMenu() {
    $('#menuRoot').innerHTML = MENU.map((c) => `
      <section class="cat" id="cat-${c.id}" data-cat="${c.id}" style="--h:${c.hue % 360}">
        <div class="cat-head reveal"><div class="cat-ico">${c.icon}</div><div><h2>${esc(c.name)}</h2><p>${esc(c.tagline)} · <span class="cnt">${c.items.length}</span> items</p></div></div>
        <div class="grid">${c.items.map(cardHTML).join('')}</div>
      </section>`).join('');
    $('#chips').innerHTML = MENU.map((c) => `<button class="chip" data-cat="${c.id}">${c.icon} ${esc(c.name.replace(/ \(.*\)/, ''))} <small>${c.items.length}</small></button>`).join('');
    $$('.card').forEach((card) => updateCard(card.dataset.id));
    observeReveal();
  }

  function updateCard(id) {
    const card = $(`.card[data-id="${CSS.escape(id)}"]`);
    if (!card) return;
    const qty = cart[id] || 0;
    const out = isOut(id);
    card.classList.toggle('sold', out);
    $('.tag.out', card).hidden = !out;
    const ctl = $('.ctl', card);
    if (out) ctl.innerHTML = '<span class="tag out">Unavailable</span>';
    else if (qty) ctl.innerHTML = `<div class="step"><button data-act="dec" aria-label="Remove one">−</button><b>${qty}</b><button data-act="inc" aria-label="Add one">+</button></div>`;
    else ctl.innerHTML = '<button class="add" data-act="inc">Add</button>';
  }

  function applyFilters() {
    const q = filters.q.trim().toLowerCase();
    let visible = 0;
    $$('.cat').forEach((sec) => {
      let n = 0;
      $$('.card', sec).forEach((card) => {
        const it = ITEMS.get(card.dataset.id);
        const show = (filters.diet === 'all' || it.diet === filters.diet) && (!q || `${it.name} ${MENU.find((c) => c.id === it.cat).name}`.toLowerCase().includes(q));
        card.hidden = !show;
        if (show) n++;
      });
      sec.hidden = n === 0;
      $('.cnt', sec).textContent = n;
      visible += n;
      const chip = $(`.chip[data-cat="${sec.dataset.cat}"]`);
      chip.hidden = n === 0;
      $('small', chip).textContent = n;
    });
    $('#emptyMsg').hidden = visible > 0;
  }

  $('#search').addEventListener('input', (e) => { filters.q = e.target.value; applyFilters(); });
  $('.diet').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-diet]');
    if (!b) return;
    filters.diet = b.dataset.diet;
    $$('.diet button').forEach((x) => x.classList.toggle('on', x === b));
    applyFilters();
  });
  $('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) document.getElementById(`cat-${chip.dataset.cat}`).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    const target = a && a.getAttribute('href').length > 1 && document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- Cart ---------- */
  function change(id, delta, sourceEl) {
    if (!orderable(id) || (delta > 0 && isOut(id))) return;
    const next = Math.min(25, Math.max(0, (cart[id] || 0) + delta));
    if (next) cart[id] = next; else delete cart[id];
    saveCart();
    updateCard(id);
    renderCartUI();
    if (delta > 0 && sourceEl && !reduceMotion) flyTo(sourceEl, ITEMS.get(id).icon);
    if (delta > 0) { const btn = $('#cartBtn'); btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
  }

  function flyTo(fromEl, icon) {
    const a = fromEl.getBoundingClientRect();
    const b = $('#cartBtn').getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'fly';
    el.textContent = icon;
    el.style.left = `${a.left + a.width / 2}px`;
    el.style.top = `${a.top}px`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.3)`;
      el.style.opacity = '.2';
    });
    setTimeout(() => el.remove(), 750);
  }

  $('#menuRoot').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.card');
    change(card.dataset.id, btn.dataset.act === 'inc' ? 1 : -1, btn);
  });

  function renderCartUI() {
    const n = cartCount();
    const total = cartTotal();
    $('#cartCount').textContent = n;
    $('#barCount').textContent = n;
    $('#barTotal').textContent = fmt(total);
    $('#cartBar').hidden = n === 0 || $('#cartDrawer').classList.contains('open');
    // Never rebuild the checkout form while someone is typing in it.
    if ($('#cartDrawer').classList.contains('open') && !checkout) renderCartDrawer();
  }

  function renderCartDrawer() {
    const body = $('#cartBody');
    const foot = $('#cartFoot');
    const lines = cartLines();
    destroyPick();
    if (!lines.length) {
      checkout = false;
      body.innerHTML = '<div class="empty-cart"><span class="big">🛒</span><h3>Your cart is empty</h3><p>Add something delicious from the menu.</p></div>';
      foot.innerHTML = '<button class="btn primary" style="width:100%" data-close>Browse the menu</button>';
      return;
    }
    const outLines = lines.filter((l) => isOut(l.item.id));
    if (!checkout) {
      body.innerHTML = lines.map(({ item, qty }) => `
        <div class="line" data-id="${item.id}"><div class="emoji">${item.icon}</div>
          <div class="nm">${esc(item.name)}<small>${isOut(item.id) ? 'Sold out - please remove' : `${fmt(item.price)} each`}</small></div>
          <div class="step"><button data-act="dec" aria-label="Remove one">−</button><b>${qty}</b><button data-act="inc" aria-label="Add one">+</button></div>
          <strong>${fmt(item.price * qty)}</strong></div>`).join('');
      foot.innerHTML = `<div class="sum"><span>Total</span><strong>${fmt(cartTotal())}</strong></div>
        <button class="btn primary" style="width:100%" id="toCheckout" ${outLines.length ? 'disabled' : ''}>${outLines.length ? 'Remove sold-out items' : 'Checkout'}</button>`;
      return;
    }
    const profile = { n: '', p: '', em: '', addr: '', ...(store.get('profile', null) || {}) };
    body.innerHTML = `<button class="back" id="backCart">← Back to cart</button>
      <form class="form" id="coForm" novalidate>
        <div class="field" id="fName"><label for="coName">Your name</label><input id="coName" maxlength="40" autocomplete="name" value="${esc(profile.n)}" placeholder="e.g. Anita"><div class="msg"></div></div>
        <div class="field" id="fPhone"><label for="coPhone">Mobile number</label><input id="coPhone" inputmode="tel" maxlength="14" autocomplete="tel" value="${esc(profile.p)}" placeholder="10-digit number"><div class="msg"></div></div>
        <div class="field" id="fEmail"><label for="coEmail">Email (optional)</label><input id="coEmail" type="email" inputmode="email" maxlength="80" autocomplete="email" value="${esc(profile.em || '')}" placeholder="you@example.com"><div class="msg"></div><small class="hint">We email you a confirmation when your order is accepted and your invoice when it is complete.</small></div>
        <div class="field"><label>Service</label><div class="seg three" id="svcSeg"><button type="button" data-v="dine" class="${service === 'dine' ? 'on' : ''}">🍽️ Dine-in</button><button type="button" data-v="take" class="${service === 'take' ? 'on' : ''}">🥡 Takeaway</button><button type="button" data-v="deliver" class="${service === 'deliver' ? 'on' : ''}">🛵 Delivery</button></div></div>
        <div class="field" id="fTable" ${service === 'dine' ? '' : 'hidden'}><label for="coTable">Table number (optional)</label><input id="coTable" maxlength="8" placeholder="e.g. 4"></div>
        <div id="fDeliver" ${service === 'deliver' ? '' : 'hidden'}>
          <div class="geo-box" id="geoBox" role="status" aria-live="polite"></div>
          <div id="delivMore">
            <div class="lh-map" id="pickMap" hidden></div>
            <div class="geo-actions"><button type="button" class="btn ghost sm" id="geoBtn">📍 Use my current location</button></div>
            <div class="field" id="fAddr"><label for="coAddr">Delivery address</label><textarea id="coAddr" rows="2" maxlength="200" autocomplete="street-address" placeholder="House / flat no., street, landmark">${esc(profile.addr || '')}</textarea><div class="msg"></div><small class="hint">Delivery is free within ${LH.FREE_KM} km, ${fmt(LH.RATE_MID)}/km from ${LH.FREE_KM} to ${LH.MID_KM} km and ${fmt(LH.RATE_FAR)}/km beyond ${LH.MID_KM} km (up to ${LH.DELIVERY_KM} km). Tap the map or drag the pin to fine-tune the spot.</small></div>
          </div>
        </div>
        <div class="field"><label for="coNote">Note for the kitchen (optional)</label><textarea id="coNote" rows="2" maxlength="140" placeholder="Less spicy, no onion..."></textarea></div>
        <div class="field"><label>Payment</label><div class="seg" id="paySeg"><button type="button" data-v="upi" class="${payMethod === 'upi' ? 'on' : ''}">📲 Pay by UPI</button><button type="button" data-v="counter" id="payCounter" class="${payMethod === 'counter' ? 'on' : ''}">${service === 'deliver' ? '💵 Cash on delivery' : '💵 Pay at counter'}</button></div></div>
      </form>`;
    foot.innerHTML = `<div class="fee-row" id="feeRow" hidden></div><div class="sum"><span>To pay</span><strong id="toPay">${fmt(cartTotal())}</strong></div><button class="btn primary" style="width:100%" id="placeOrder">Place order</button>`;
    if (service === 'deliver') enterDelivery(); else updatePlaceBtn();
  }

  $('#cartDrawer').addEventListener('click', (e) => {
    const t = e.target;
    const act = t.closest('[data-act]');
    if (act) { change(act.closest('.line').dataset.id, act.dataset.act === 'inc' ? 1 : -1); return; }
    if (t.closest('#toCheckout')) { checkout = true; renderCartDrawer(); }
    else if (t.closest('#backCart')) { checkout = false; renderCartDrawer(); }
    else if (t.closest('#svcSeg button')) setService(t.closest('button').dataset.v);
    else if (t.closest('[data-switch]')) setService(t.closest('[data-switch]').dataset.switch);
    else if (t.closest('#geoBtn')) locate();
    else if (t.closest('#paySeg button')) {
      payMethod = t.closest('button').dataset.v; store.set('pay', payMethod);
      $$('#paySeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === payMethod));
    } else if (t.closest('#placeOrder')) placeOrder();
  });

  /* ---------- Delivery: location, 5 km check and map pin ---------- */
  const DEL_MSG = "We don't offer online delivery right now, but we're working to fulfil your request soon.";
  const deliverOk = () => !!LH.getCfg().del && geoState !== 'locating' && !!geo && LH.inRange(geo.lat, geo.lng);
  const deliveryQuote = () => (service === 'deliver' && geo && LH.inRange(geo.lat, geo.lng) ? LH.deliveryFee(LH.fromShopKm(geo.lat, geo.lng)) : null);
  const feeText = (fee) => (fee ? fmt(fee) : 'Free');

  function updatePay() {
    const pay = $('#toPay');
    if (!pay) return;
    const fee = deliveryQuote();
    pay.textContent = fmt(cartTotal() + (fee || 0));
    const row = $('#feeRow');
    if (row) { row.hidden = fee === null; row.innerHTML = fee === null ? '' : `<span>Items ${fmt(cartTotal())}</span><span>Delivery <b>${feeText(fee)}</b></span>`; }
  }

  function updatePlaceBtn() {
    const b = $('#placeOrder');
    if (!b || b.dataset.busy) return;
    const blocked = service === 'deliver' && !deliverOk();
    b.disabled = blocked;
    if (!blocked) b.textContent = 'Place order';
    else if (!LH.getCfg().del) b.textContent = 'Delivery unavailable';
    else if (geoState === 'locating') b.textContent = 'Finding your location...';
    else b.textContent = geo ? 'Delivery unavailable' : 'Set delivery location';
  }

  function renderGeo() {
    const box = $('#geoBox');
    if (!box) return;
    const cfg = LH.getCfg();
    const more = $('#delivMore');
    if (more) more.hidden = !cfg.del;
    const switchBtn = '<button type="button" class="btn ghost sm" data-switch="take">Order for takeaway instead</button>';
    const km = geo ? LH.fromShopKm(geo.lat, geo.lng) : 0;
    const fuzz = geo && geo.src === 'gps' && geo.acc > 300 ? ` Your location is approximate (about ${geo.acc >= 1000 ? `${(geo.acc / 1000).toFixed(1)} km` : `${geo.acc} m`}), so drag the pin to your exact spot.` : '';
    let kind, html;
    if (!cfg.del) { kind = 'bad'; html = `<b>🛵 Delivery isn't available right now</b><span>${esc(DEL_MSG)} Please choose dine-in or takeaway.</span>${switchBtn}`; }
    else if (geoState === 'locating') { kind = 'info'; html = '<b>📡 Finding your location...</b><span>Please allow location access when your browser asks.</span>'; }
    else if (geo && km <= LH.DELIVERY_KM) { kind = 'ok'; html = `<b>✅ Great, we deliver to you!</b><span>You are ${km.toFixed(1)} km from the cafe. Delivery: <b>${feeText(LH.deliveryFee(km))}</b>${LH.deliveryFee(km) ? '' : ` (free within ${LH.FREE_KM} km)`}.${esc(fuzz)}</span>`; }
    else if (geo) { kind = 'bad'; html = `<b>📍 You are ${km.toFixed(1)} km away</b><span>${esc(DEL_MSG)}${esc(fuzz)}</span>${switchBtn}`; }
    else if (geoState === 'denied' || geoState === 'error') { kind = 'warn'; html = `<b>📍 We need your location</b><span>${esc(geoNote)}</span>`; }
    else { kind = 'info'; html = `<b>📍 Share your location</b><span>We check that your address is within ${LH.DELIVERY_KM} km of the cafe and show the delivery fee before you order.</span>`; }
    box.className = `geo-box ${kind}`;
    box.innerHTML = html;
    updatePay();
    updatePlaceBtn();
  }

  function setGeo(lat, lng, acc, src, view) {
    ++locReq; // a fresh pin or fix cancels any pending request
    geo = { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, acc: acc || 0, src, ts: Date.now() };
    geoState = 'ok';
    store.set('geo', geo);
    if (pickCtl) pickCtl.setPin(geo.lat, geo.lng, { view });
    renderGeo();
  }

  function locate() {
    if (!navigator.geolocation) {
      geoState = 'error'; geoNote = 'This browser cannot share your location. Tap the map to drop a pin on your address.';
      renderGeo(); return;
    }
    const id = ++locReq;
    geoState = 'locating'; renderGeo();
    navigator.geolocation.getCurrentPosition((p) => {
      if (id !== locReq) return;
      setGeo(p.coords.latitude, p.coords.longitude, Math.round(p.coords.accuracy || 0), 'gps', true);
    }, (err) => {
      if (id !== locReq) return;
      geoState = err && err.code === 1 ? 'denied' : 'error';
      geoNote = err && err.code === 1 ? 'Location access is blocked. Allow it in your browser settings, or tap the map to drop a pin on your address.'
        : err && err.code === 3 ? 'Getting your location took too long. Try again, or tap the map to drop a pin on your address.'
          : 'Your location is unavailable right now. Try again, or tap the map to drop a pin on your address.';
      renderGeo();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  }

  function destroyPick() {
    pickToken++;
    if (pickCtl) { try { pickCtl.destroy(); } catch (e) { /* already gone */ } pickCtl = null; }
  }

  async function mountPick() {
    const el = $('#pickMap');
    if (!el || pickCtl || !LH.getCfg().del) return;
    const token = ++pickToken;
    el.hidden = false;
    try {
      const ctl = await window.LHMap.create(el, { pick: true, pan: false, onPick: (lat, lng) => setGeo(lat, lng, 0, 'pin') });
      if (token !== pickToken || !document.body.contains(el)) { ctl.destroy(); return; }
      pickCtl = ctl;
      if (geo) ctl.setPin(geo.lat, geo.lng, { view: true });
    } catch (e) {
      if (token === pickToken) el.hidden = true; // the map is optional: GPS still works without it
    }
  }

  function enterDelivery() {
    renderGeo();
    if (!LH.getCfg().del) return;
    mountPick();
    if (!geo && geoState !== 'locating') locate();
  }

  function setService(v) {
    if (!['dine', 'take', 'deliver'].includes(v)) return;
    service = v; store.set('svc', service);
    $$('#svcSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === service));
    const t = $('#fTable'); if (t) t.hidden = service !== 'dine';
    const d = $('#fDeliver'); if (d) d.hidden = service !== 'deliver';
    const pc = $('#payCounter'); if (pc) pc.textContent = service === 'deliver' ? '💵 Cash on delivery' : '💵 Pay at counter';
    if (service === 'deliver') enterDelivery(); else { destroyPick(); updatePay(); updatePlaceBtn(); }
  }

  /* ---------- Drawers ---------- */
  let lastFocus = null;
  function openDrawer(id) {
    closeDrawers(true);
    lastFocus = document.activeElement;
    const d = $(`#${id}`);
    d.inert = false;
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    $('#scrim').hidden = false;
    document.body.style.overflow = 'hidden';
    if (id === 'cartDrawer') { checkout = false; renderCartDrawer(); renderCartUI(); }
    if (id === 'ordersDrawer') { renderOrders(); $('#ordersDot').hidden = true; }
    if (id === 'eventsDrawer') { if (!evOn()) evView = 'mine'; renderEvents(); $('#eventsDot').hidden = true; }
    setTimeout(() => { const f = $('button, input', d); if (f) f.focus(); }, 80);
  }
  function closeDrawers(silent) {
    $$('.drawer.open').forEach((d) => { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); d.inert = true; });
    $('#scrim').hidden = true;
    document.body.style.overflow = '';
    destroyPick();
    if (!silent) { renderCartUI(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  }
  $('#scrim').addEventListener('click', () => closeDrawers());
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => closeDrawers()));
  $('#cartDrawer').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawers(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeTrack(); closeDrawers(); } });
  $('#cartBtn').addEventListener('click', () => openDrawer('cartDrawer'));
  $('#cartBarBtn').addEventListener('click', () => openDrawer('cartDrawer'));
  $('#ordersBtn').addEventListener('click', () => openDrawer('ordersDrawer'));
  $('#heroOrders').addEventListener('click', () => openDrawer('ordersDrawer'));

  /* ---------- Modal ---------- */
  function openModal(html) {
    $('#modalCard').innerHTML = html;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
    const f = $('#modalCard button'); if (f) f.focus();
  }
  function closeModal() { $('#modal').hidden = true; if (!$('.drawer.open')) document.body.style.overflow = ''; }
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-modal-close]')) closeModal(); });

  /* ---------- Placing an order ---------- */
  function setErr(fieldId, msg) {
    const f = $(`#${fieldId}`);
    f.classList.toggle('err', !!msg);
    $('.msg', f).textContent = msg || '';
  }

  async function placeOrder() {
    const cfg = LH.getCfg();
    if (!cfg.open) { toast('The kitchen is closed right now.', 'bad'); return; }
    const name = LH.clean($('#coName').value, 40);
    const phone = $('#coPhone').value.replace(/[^\d+]/g, '');
    setErr('fName', name ? '' : 'Please enter your name');
    const digits = phone.replace(/\D/g, '');
    setErr('fPhone', digits.length >= 10 && digits.length <= 13 ? '' : 'Enter a valid mobile number');
    const em = LH.clean($('#coEmail').value, 80).toLowerCase();
    const emOk = !em || /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(em);
    setErr('fEmail', emOk ? '' : 'Enter a valid email or leave it blank');
    if (!name || digits.length < 10 || digits.length > 13 || !emOk) return;
    let addr = '';
    if (service === 'deliver') {
      if (!cfg.del) { toast(DEL_MSG, 'bad'); return; }
      addr = LH.clean($('#coAddr').value, 200);
      setErr('fAddr', addr.length >= 8 ? '' : 'Enter your full address (house or flat, street, landmark)');
      if (!geo || !LH.inRange(geo.lat, geo.lng)) { toast(geo ? DEL_MSG : 'Please share your location or drop a pin on the map first.', 'bad'); return; }
      if (addr.length < 8) { $('#coAddr').focus(); return; }
    }
    if (cartLines().some((l) => isOut(l.item.id))) { toast('Please remove sold-out items.', 'bad'); checkout = false; renderCartDrawer(); return; }
    if (Date.now() - lastPlaced < 15000) { toast('Please wait a few seconds before placing another order.', 'bad'); return; }

    const btn = $('#placeOrder');
    btn.disabled = true;
    btn.dataset.busy = '1';
    btn.textContent = 'Sending securely...';
    const draft = {
      n: name, p: phone, em, nt: $('#coNote').value, pay: payMethod, svc: service, tbl: service === 'dine' ? $('#coTable').value : '',
      it: Object.entries(cart),
      ...(service === 'deliver' ? { addr, lat: geo.lat, lng: geo.lng } : {})
    };
    try {
      const order = await LH.publishOrder(draft);
      lastPlaced = Date.now();
      store.set('lastPlaced', lastPlaced);
      store.set('profile', { n: name, p: phone, em, addr: service === 'deliver' ? addr : (store.get('profile', {}).addr || '') });
      orders.unshift({ ...order, status: 'pending', statusTs: 0, reason: '', payVerified: false, seen: true });
      saveOrders();
      cart = {}; saveCart();
      $$('.card').forEach((c) => updateCard(c.dataset.id));
      closeDrawers(true);
      renderCartUI();
      showSuccess(orders[0]);
      confetti();
    } catch (err) {
      toast('Could not place the order. Please try again.', 'bad');
      delete btn.dataset.busy;
      btn.disabled = false;
      updatePlaceBtn();
    }
  }

  const upiLink = (o) => `upi://pay?pa=${encodeURIComponent(UPI.id)}&pn=${encodeURIComponent(UPI.name)}&am=${encodeURIComponent(o.total)}&cu=INR&tn=${encodeURIComponent(`Order ${o.id}`)}`;

  // The code is only meaningful until the order is closed; it is also emailed when the customer gave an address.
  const otpBox = (o) => (o.svc === 'deliver' && LH.validOtp(o.otp) && !['completed', 'rejected'].includes(o.status)
    ? `<div class="otp-box" role="group" aria-label="Delivery code"><small>Your delivery code</small><b>${esc(o.otp)}</b><span>Give it to the delivery partner only when you receive your order.${o.em ? ' We also emailed it to you.' : ''}</span></div>` : '');

  function showSuccess(o) {
    const pay = o.pay === 'upi'
      ? `<div class="pay-note">Scan with any UPI app and pay <b>${fmt(o.total)}</b>. ${o.svc === 'deliver' ? 'We confirm your payment before the order leaves.' : 'We confirm your payment at the counter.'}</div>
         <figure class="qr-card">
           <div class="qr-amt"><small>Amount to pay</small><b>${fmt(o.total)}</b></div>
           <div class="qr-frame"><img id="qrImg" src="assets/payment-upi.jpeg" alt="Paytm UPI QR code for Laural's Haven, UPI ID ${esc(UPI.id)}" width="1039" height="1600" decoding="async"></div>
           <figcaption>Enter <b>${fmt(o.total)}</b> after scanning and add <b>${esc(o.id)}</b> as the note.</figcaption>
         </figure>
         <div class="row-btns"><a class="btn primary upi-open" href="${esc(upiLink(o))}">Open UPI app with ${fmt(o.total)}</a></div>`
      : `<div class="pay-note">${o.svc === 'deliver' ? `Please keep <b>${fmt(o.total)}</b> in cash ready for the delivery partner.` : 'Please pay at the counter when you collect or finish your meal.'}</div>`;
    openModal(`<h2 id="modalTitle">Order placed 🎉</h2>
      <p style="color:var(--muted)">Your order ID is <span class="oid">${esc(o.id)}</span>. Keep this page open to see live status.${o.svc === 'deliver' ? ' When your order is out for delivery you can follow it live on the map.' : ''}</p>
      ${cancelBox(o, true)}
      ${otpBox(o)}
      ${pay}
      <div class="row-btns"><button class="btn ghost" id="trackNow">Track my order</button><button class="btn ghost" data-modal-close>Keep browsing</button></div>`);
    $('#trackNow').addEventListener('click', () => { closeModal(); openDrawer('ordersDrawer'); });
    cxSync();
  }

  /* ---------- Cancel within 3 minutes, with a live countdown. After that the customer has to phone the cafe. ---------- */
  const CX = LH.CANCEL;
  const CX_C = 2 * Math.PI * 19;
  const shopPhone = () => (window.LHMail && window.LHMail.CAFE && window.LHMail.CAFE.phone) || '';
  const canCancel = (o) => CX.FROM.includes(o.status) && LH.cancelLeft(o) > 0;
  const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const cxLevel = (ms) => (ms > 60000 ? 'ok' : ms > 20000 ? 'warn' : 'low');
  const cxOffset = (ms) => (CX_C * (1 - ms / CX.MS)).toFixed(2);
  const callLink = () => { const t = shopPhone(); return t ? `<a href="tel:${esc(t)}">${esc(t)}</a>` : 'the cafe'; };

  function cancelBox(o, intro) {
    if (['completed', 'rejected'].includes(o.status)) return '';
    if (canCancel(o)) {
      const left = LH.cancelLeft(o);
      return `<div class="cx${intro ? ' cx-intro' : ''}" data-cx="${esc(o.id)}" data-lvl="${cxLevel(left)}">
        <div class="cx-ring" aria-hidden="true"><svg viewBox="0 0 44 44"><circle class="cx-track" cx="22" cy="22" r="19"/><circle class="cx-bar" cx="22" cy="22" r="19" stroke-dasharray="${CX_C.toFixed(2)}" stroke-dashoffset="${cxOffset(left)}"/></svg><b class="cx-time">${mmss(left)}</b></div>
        <div class="cx-txt"><strong>Changed your mind?</strong><span>You can cancel this order for the next <b role="timer" data-cxleft="${esc(o.id)}">${mmss(left)}</b>.</span></div>
        <button type="button" class="btn cx-btn" data-cancel="${esc(o.id)}">Cancel order</button></div>`;
    }
    const why = CX.FROM.includes(o.status) ? 'The 3-minute cancel window has closed.' : 'Your order is already being prepared.';
    return `<div class="cx cx-call"><span class="cx-ico" aria-hidden="true">📞</span><div class="cx-txt"><strong>Need to cancel?</strong><span>${why} Please call the cafe on ${callLink()}.</span></div></div>`;
  }

  let cxTimer = 0;
  function cxTick() {
    const live = $$('[data-cx], [data-cxleft]').filter((el) => el.offsetParent !== null);
    if (!live.length) { clearInterval(cxTimer); cxTimer = 0; return; }
    live.forEach((el) => {
      const id = el.dataset.cx || el.dataset.cxleft;
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      const left = LH.cancelLeft(o);
      if (el.dataset.cx) {
        if (left <= 0 || !CX.FROM.includes(o.status)) { el.outerHTML = cancelBox(o); return; }
        el.dataset.lvl = cxLevel(left);
        $('.cx-bar', el).style.strokeDashoffset = cxOffset(left);
        $('.cx-time', el).textContent = mmss(left);
      } else el.textContent = mmss(left);
    });
    const confirm = $('#cxConfirm');
    if (confirm && !$('#modal').hidden) {
      const o = orders.find((x) => x.id === confirm.dataset.id);
      if (o && !canCancel(o) && !confirm.dataset.busy) showCancelClosed(o);
    }
  }
  function cxSync() { if (!cxTimer && $('[data-cx], [data-cxleft]')) cxTimer = setInterval(cxTick, 250); }

  function askCancel(id) {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    if (!canCancel(o)) { showCancelClosed(o); return; }
    openModal(`<div class="cx-confirm" id="cxConfirm" data-id="${esc(o.id)}">
      <div class="cx-warn" aria-hidden="true">⚠️</div>
      <h2 id="modalTitle">Cancel this order?</h2>
      <p>Order <span class="oid">${esc(o.id)}</span> (${fmt(o.total)}) will be cancelled and the kitchen is told straight away. You have <b data-cxleft="${esc(o.id)}">${mmss(LH.cancelLeft(o))}</b> left to change your mind.</p>
      ${o.pay === 'upi' ? '<p>Already paid by UPI? Please call the cafe about your refund.</p>' : ''}
      <div class="row-btns"><button class="btn primary" data-modal-close>Keep my order</button><button class="btn cx-danger" data-cx-yes="${esc(o.id)}">Yes, cancel order</button></div></div>`);
    cxSync();
  }

  function showCancelClosed(o, refused) {
    openModal(`<div class="cx-closed">
      <div class="cx-phone" aria-hidden="true">📞</div>
      <h2 id="modalTitle">Please call us to cancel</h2>
      <p>${refused ? 'This order can no longer be cancelled online, the kitchen may have just started on it.' : `The 3-minute cancel window for order <span class="oid">${esc(o.id)}</span> has closed.`} To cancel it, please call the cafe${shopPhone() ? ` on <b>${esc(shopPhone())}</b>` : ''}.</p>
      <div class="row-btns">${shopPhone() ? `<a class="btn primary" href="tel:${esc(shopPhone())}">📞 Call the cafe</a>` : ''}<button class="btn ghost" data-modal-close>Close</button></div></div>`);
  }

  function showCancelled(o) {
    openModal(`<div class="cx-done">
      <div class="cx-check-wrap"><svg class="cx-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M18 18l16 16M34 18L18 34"/></svg></div>
      <h2 id="modalTitle">Order cancelled</h2>
      <p>Order <span class="oid">${esc(o.id)}</span> has been cancelled and the kitchen has been told. Nothing will be prepared.</p>
      ${o.pay === 'upi' ? '<p>Already paid by UPI? Please call the cafe about your refund.</p>' : ''}
      <div class="row-btns"><button class="btn primary" data-modal-close>Done</button><button class="btn ghost" data-cx-again="${esc(o.id)}">🔁 Order again</button></div></div>`);
  }

  async function doCancel(id) {
    const o = orders.find((x) => x.id === id);
    const btn = $('[data-cx-yes]');
    if (!o || !btn || btn.dataset.busy) return;
    if (!canCancel(o)) { showCancelClosed(o); return; }
    btn.dataset.busy = '1';
    $('#cxConfirm').dataset.busy = '1';
    btn.disabled = true;
    btn.textContent = 'Cancelling...';
    try {
      const ts = await LH.cancelOrder(o);
      o.status = 'rejected'; o.statusTs = ts; o.reason = CX.REASON;
      delete o.otp;
      saveOrders();
      riders.delete(id);
      if ($('#ordersDrawer').classList.contains('open')) renderOrders();
      if (trackId === id) { drawRider(); renderTrack(); }
      showCancelled(o);
    } catch (err) {
      if (err && err.code === 'permission-denied') showCancelClosed(o, true);
      else {
        toast('Could not reach the server. Please try again, or call the cafe.', 'bad');
        delete btn.dataset.busy;
        delete $('#cxConfirm').dataset.busy;
        btn.disabled = false;
        btn.textContent = 'Yes, cancel order';
      }
    }
  }

  document.addEventListener('click', (e) => {
    const ask = e.target.closest('[data-cancel]');
    if (ask) { askCancel(ask.dataset.cancel); return; }
    const yes = e.target.closest('[data-cx-yes]');
    if (yes) { doCancel(yes.dataset.cxYes); return; }
    const again = e.target.closest('[data-cx-again]');
    if (again) { closeModal(); reorder(again.dataset.cxAgain); }
  });

  /* ---------- My orders ---------- */
  const FLOW = ['pending', 'accepted', 'cooking', 'ready', 'completed'];
  const FLOW_DELIVERY = ['pending', 'accepted', 'cooking', 'ready', 'out', 'completed'];
  const FLOW_ICON = { pending: '📥', accepted: '👍', cooking: '🔥', ready: '🛎️', out: '🛵', completed: '✅' };
  const ago = (ms) => (ms < 10000 ? 'just now' : ms < 60000 ? `${Math.round(ms / 1000)} s ago` : `${Math.round(ms / 60000)} min ago`);
  const riderInfo = (o) => {
    const r = riders.get(o.id);
    if (!r || o.status !== 'out') return null;
    const km = LH.distKm(r, o);
    return { r, km, min: LH.etaMin(km), age: Math.max(0, Date.now() - r.lts) };
  };
  function renderOrders() {
    const body = $('#ordersBody');
    if (!orders.length) {
      body.innerHTML = '<div class="empty-cart"><span class="big">🧾</span><h3>No orders yet</h3><p>Orders you place on this device appear here with live tracking.</p></div>';
      return;
    }
    const finished = orders.some((o) => o.status === 'completed' || o.status === 'rejected');
    body.innerHTML = orders.map((o) => {
      const st = STATUS[o.status] || STATUS.pending;
      const flow = o.svc === 'deliver' ? FLOW_DELIVERY : FLOW;
      const step = Math.max(0, flow.indexOf(o.status));
      const label = (s) => (s === 'completed' && o.svc === 'deliver' ? 'Delivered' : STATUS[s].short);
      const tracker = o.status === 'rejected'
        ? (o.reason === CX.REASON ? '<div class="rej cx-cancelled">You cancelled this order.</div>' : `<div class="rej">Sorry, the kitchen could not take this order${o.reason ? `: ${esc(o.reason)}` : '.'}</div>`)
        : `<div class="tracker">${flow.map((s, i) => `<div class="st ${i < step || o.status === 'completed' ? 'done' : ''} ${i === step && o.status !== 'completed' ? 'now' : ''}"><i>${i < step || o.status === 'completed' ? '✓' : FLOW_ICON[s]}</i>${label(s)}</div>`).join('')}</div>`;
      const ri = riderInfo(o);
      let eta = !['completed', 'rejected', 'ready', 'out'].includes(o.status) ? `<div class="verify">Estimated ready in about ${esc(String(LH.getCfg().prep))} minutes after acceptance.</div>` : '';
      if (o.status === 'out') eta = ri ? `<div class="verify ok">🛵 About ${ri.min} min away · ${ri.km.toFixed(1)} km · updated ${ago(ri.age)}</div>` : '<div class="verify ok">🛵 On the way. Live location appears here shortly.</div>';
      const pay = o.pay === 'upi'
        ? `<div class="verify ${o.payVerified ? 'ok' : ''}">${o.payVerified ? '✔ Payment verified' : 'UPI payment awaiting verification'}</div>`
        : `<div class="verify">${o.svc === 'deliver' ? 'Cash on delivery' : 'Pay at counter'}</div>`;
      const where = o.svc === 'take' ? 'Takeaway' : o.svc === 'deliver' ? `Delivery${o.fee ? ` (incl. ${fmt(o.fee)})` : ' (free)'}` : `Dine-in${o.tbl ? ` · Table ${esc(o.tbl)}` : ''}`;
      return `<article class="order-card" data-id="${esc(o.id)}">
        <div class="head"><span class="oid">${esc(o.id)}</span><span class="badge" style="background:${st.color}">${esc(LH.statusLabel(o, o.status, o.reason))}</span></div>
        <div class="items-list">${o.it.map(([id, q]) => `${q} × ${esc(ITEMS.get(id)?.name || id)}`).join(', ')}</div>
        <strong>${fmt(o.total)}</strong> <span style="color:var(--muted);font-size:.8rem">· ${where} · ${new Date(o.ts).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
        ${o.svc === 'deliver' ? `<div class="verify">📍 ${esc(o.addr)}</div>` : ''}
        ${tracker}${eta}${otpBox(o)}${pay}${cancelBox(o)}
        ${o.svc === 'deliver' && !['rejected', 'completed'].includes(o.status) ? `<button class="btn ${o.status === 'out' ? 'primary' : 'ghost'}" style="margin-top:10px;width:100%" data-track="${esc(o.id)}">🗺️ Track on map</button>` : ''}
        ${o.pay === 'upi' && !o.payVerified && !['rejected', 'completed'].includes(o.status) ? `<button class="btn ghost" style="margin-top:10px;width:100%" data-pay="${esc(o.id)}">Show payment QR</button>` : ''}
        ${o.status === 'completed' ? (o.fb ? `<div class="fb-done" aria-label="Your rating: ${o.fb.sr} out of 5">Your rating <b aria-hidden="true">${'★'.repeat(o.fb.sr)}${'☆'.repeat(5 - o.fb.sr)}</b> Thank you for your feedback!</div>` : `<button class="btn primary" style="margin-top:10px;width:100%" data-rate="${esc(o.id)}">⭐ Rate your order</button>`) : ''}
        ${['completed', 'rejected'].includes(o.status) ? `<button class="btn ghost" style="margin-top:10px;width:100%" data-again="${esc(o.id)}">🔁 Order again</button>` : ''}
        ${o.status === 'rejected' ? '' : `<button class="btn ghost" style="margin-top:10px;width:100%" data-invoice="${esc(o.id)}">🧾 Invoice</button>`}
      </article>`;
    }).join('') + (finished ? '<button class="btn ghost" style="width:100%" id="clearDone">Clear finished orders</button>' : '');
    cxSync();
  }

  /* Invoice (no GST) for the customer's own order, printed or saved as PDF from the browser's print dialog. */
  function printInvoice(o) {
    if (!o || !window.LHMail) return;
    const area = $('#printArea');
    area.innerHTML = window.LHMail.invoiceHtml(LH, o, { paid: !!o.payVerified || o.status === 'completed' });
    const prev = document.title;
    document.title = `Invoice ${o.id}`;
    window.print();
    document.title = prev;
  }

  /* ---------- Feedback: star ratings for the service and each product, plus an optional comment ---------- */
  const STAR_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  const starRow = (key, label, value) => `<div class="stars" role="radiogroup" aria-label="${esc(label)}" data-key="${esc(key)}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${n === value}" aria-label="${n} star${n > 1 ? 's' : ''}" class="${n <= value ? 'on' : ''}" data-n="${n}">★</button>`).join('')}<span class="star-word">${STAR_WORDS[value] || ''}</span></div>`;
  let rate = null;

  function openRate(o) {
    if (!o || o.status !== 'completed' || o.fb) return;
    rate = { o, sr: 0, it: {}, busy: false };
    const lines = o.it.filter(([id]) => ITEMS.has(id));
    openModal(`<h2 id="modalTitle">How was your order?</h2>
      <p style="color:var(--muted)">Order <span class="oid">${esc(o.id)}</span>. Your feedback helps us serve you better.</p>
      <div class="rate-block"><h3>Our service</h3><small>Ordering, speed and staff</small>${starRow('sr', 'Service rating', 0)}</div>
      <div class="rate-block"><h3>The food and drinks</h3><small>Rate what you had (optional)</small>
        ${lines.map(([id]) => `<div class="rate-item"><span>${ITEMS.get(id).icon} ${esc(ITEMS.get(id).name)}</span>${starRow(`it:${id}`, `Rating for ${ITEMS.get(id).name}`, 0)}</div>`).join('')}</div>
      <div class="field"><label for="fbText">Comments (optional)</label><textarea id="fbText" rows="3" maxlength="300" placeholder="Tell us what you liked or what we can improve"></textarea></div>
      <div class="msg rate-msg" id="fbMsg" role="alert"></div>
      <div class="row-btns"><button class="btn primary" id="fbSend">Send feedback</button><button class="btn ghost" data-modal-close>Not now</button></div>`);
  }

  async function sendRate() {
    if (!rate || rate.busy) return;
    const msg = $('#fbMsg');
    if (!rate.sr) { msg.textContent = 'Please rate our service with the stars first.'; return; }
    rate.busy = true; msg.textContent = '';
    const btn = $('#fbSend');
    btn.disabled = true; btn.textContent = 'Sending...';
    const { o } = rate;
    try {
      const v = await LH.publishFeedback(o, { sr: rate.sr, ir: Object.entries(rate.it), c: $('#fbText').value });
      o.fb = { sr: v.sr, ts: Date.now() };
      saveOrders();
      rate = null;
      closeModal();
      toast('Thank you for your feedback!', 'ok');
      renderOrders();
    } catch (err) {
      rate.busy = false;
      btn.disabled = false; btn.textContent = 'Send feedback';
      msg.textContent = err && err.code === 'permission-denied' ? 'We could not save your feedback. It may already have been sent, or feedback is not open yet.' : 'Could not send your feedback. Please check your connection and try again.';
    }
  }

  $('#modalCard').addEventListener('click', (e) => {
    if (!rate) return;
    const star = e.target.closest('.stars button');
    if (star) {
      const grp = star.closest('.stars');
      const key = grp.dataset.key;
      let n = Number(star.dataset.n);
      if (key === 'sr') rate.sr = n;
      else { const id = key.slice(3); if (rate.it[id] === n) { delete rate.it[id]; n = 0; } else rate.it[id] = n; }
      $$('button', grp).forEach((b) => { const on = Number(b.dataset.n) <= n; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(Number(b.dataset.n) === n)); });
      $('.star-word', grp).textContent = STAR_WORDS[n] || '';
      $('#fbMsg').textContent = '';
    } else if (e.target.closest('#fbSend')) sendRate();
  });

  $('#ordersBody').addEventListener('click', (e) => {
    const rt = e.target.closest('[data-rate]');
    if (rt) { openRate(orders.find((x) => x.id === rt.dataset.rate)); return; }
    const inv = e.target.closest('[data-invoice]');
    if (inv) { printInvoice(orders.find((x) => x.id === inv.dataset.invoice)); return; }
    const again = e.target.closest('[data-again]');
    if (again) { reorder(again.dataset.again); return; }
    const tr = e.target.closest('[data-track]');
    if (tr) { openTrack(tr.dataset.track); return; }
    const pay = e.target.closest('[data-pay]');
    if (pay) { const o = orders.find((x) => x.id === pay.dataset.pay); if (o) { closeDrawers(true); showSuccess(o); } return; }
    if (e.target.closest('#clearDone')) {
      orders = orders.filter((o) => o.status !== 'completed' && o.status !== 'rejected');
      saveOrders(); renderOrders();
    }
  });

  function reorder(id) {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    let added = 0; let skipped = 0;
    o.it.forEach(([item, q]) => {
      if (!orderable(item) || isOut(item)) { skipped++; return; }
      cart[item] = Math.min(25, (cart[item] || 0) + q);
      added++;
    });
    if (!added) { toast('Those items are not available right now.', 'bad'); return; }
    saveCart();
    if (['dine', 'take', 'deliver'].includes(o.svc)) { service = o.svc; store.set('svc', service); }
    $$('.card').forEach((c) => updateCard(c.dataset.id));
    openDrawer('cartDrawer');
    toast(skipped ? `Added to your cart. ${skipped} item${skipped === 1 ? ' is' : 's are'} unavailable right now.` : 'Added to your cart.', skipped ? '' : 'ok');
  }

  /* ---------- Live delivery tracking (OpenStreetMap) ---------- */
  let trackId = null, trackCtl = null, trackToken = 0, trackTimer = 0, userMoved = false, trackFocus = null;
  const trackOrder = () => orders.find((x) => x.id === trackId);

  function drawRider() {
    const o = trackOrder();
    if (!trackCtl || !o) return;
    const r = riders.get(o.id);
    if (r && o.status === 'out') trackCtl.setRider(r.lat, r.lng); else trackCtl.clearRider();
    if (!userMoved) trackCtl.fit();
  }

  function renderTrack() {
    const o = trackOrder();
    if (!o || $('#trackView').hidden) return;
    const ri = riderInfo(o);
    let sub, info;
    if (o.status === 'completed') { sub = 'Delivered ✅'; info = '<b>Your order has been delivered.</b> Enjoy your meal!'; }
    else if (o.status === 'rejected') { sub = 'Cancelled'; info = o.reason === CX.REASON ? '<b>You cancelled this order.</b>' : `<b>This order was not accepted.</b>${o.reason ? ` ${esc(o.reason)}` : ''}`; }
    else if (o.status === 'out' && ri) {
      sub = `About ${ri.min} min away`;
      info = `<b>🛵 ${ri.km.toFixed(1)} km from you</b> · updated ${ago(ri.age)}${ri.age > 180000 ? '<br><span class="tv-warn">Live location is delayed. The delivery partner may be in a low-signal area.</span>' : ''}`;
    } else if (o.status === 'out') { sub = 'On the way'; info = '<b>🛵 Your order is out for delivery.</b> Live location appears here as soon as it is shared.'; }
    else { sub = LH.statusLabel(o, o.status); info = "<b>We're preparing your order.</b> You'll see your delivery partner here once it is out for delivery."; }
    $('#tvSub').textContent = sub;
    $('#tvInfo').innerHTML = `<div>${info}</div>${otpBox(o)}<div class="tv-addr">📍 ${esc(o.addr)}</div>`;
  }

  async function openTrack(id) {
    const o = orders.find((x) => x.id === id);
    if (!o || o.svc !== 'deliver') return;
    closeDrawers(true);
    trackId = id; userMoved = false;
    trackFocus = document.activeElement;
    $('#trackView').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#tvTitle').textContent = `Order ${o.id}`;
    renderTrack();
    $('#tvClose').focus();
    clearInterval(trackTimer);
    trackTimer = setInterval(renderTrack, 15000);
    const token = ++trackToken;
    try {
      const ctl = await window.LHMap.create($('#tvMap'), { pan: true });
      if (token !== trackToken) { ctl.destroy(); return; }
      trackCtl = ctl;
      ctl.map.on('dragstart', () => { userMoved = true; });
      ctl.setDest(o.lat, o.lng);
      ctl.fit();
      drawRider();
    } catch (e) {
      $('#tvMap').innerHTML = '<p class="tv-fail">The map could not load. Your order status is still updating live.</p>';
    }
  }

  function closeTrack() {
    if ($('#trackView').hidden) return;
    trackToken++;
    clearInterval(trackTimer);
    if (trackCtl) { try { trackCtl.destroy(); } catch (e) { /* already gone */ } trackCtl = null; }
    $('#tvMap').innerHTML = '';
    $('#trackView').hidden = true;
    trackId = null;
    document.body.style.overflow = '';
    if (trackFocus && trackFocus.focus) trackFocus.focus();
  }
  $('#tvClose').addEventListener('click', closeTrack);
  $('#tvFit').addEventListener('click', () => { userMoved = false; if (trackCtl) trackCtl.fit(); });

  /* ---------- Event bookings (parties, celebrations, meetups) ---------- */
  const EV = LH.EVENT;
  const EVS = LH.EVENT_STATUS;
  const cafePhone = () => (window.LHMail && window.LHMail.CAFE && window.LHMail.CAFE.phone) || '';
  let events = store.get('events', []).map((e) => {
    const v = LH.validateEvent(e);
    return v ? { ...v, status: EVS[e.status] ? e.status : 'pending', statusTs: Number(e.statusTs) || 0, reason: LH.clean(e.reason, 80), moved: LH.validMove(e.moved) } : null;
  }).filter(Boolean);
  const saveEvents = () => {
    store.set('events', events.slice(0, 25));
    LH.watchEv(events.filter((e) => ['pending', 'confirmed'].includes(e.status)).map((e) => e.id));
  };
  saveEvents();
  let lastEvent = 0;
  let evView = 'book';
  const addDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return LH.dateKey(d); };
  const evForm = { ty: 'bday', d: addDays(1), st: 18 * 60, h: 3, g: 10, dec: false, nt: '', n: undefined, p: '' };
  const evOn = () => LH.getEvCfg().on;
  const evDay = (s) => LH.parseDateKey(s).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const evWhen = (e) => `${evDay(e.d)} · ${LH.eventRange(e.st, e.h)}`;
  const hrs = (h) => `${h} hour${h === 1 ? '' : 's'}`;
  const maxHours = (st) => Math.min(EV.MAX_H, Math.floor((EV.CLOSE - st) / 60));

  const quoteRows = (h, dec) => {
    const q = LH.eventQuote(h, dec);
    return `<dl class="ev-quote"><div><dt>Venue · ${hrs(q.hours)} × ${fmt(EV.RATE)}</dt><dd>${fmt(q.rent)}</dd></div>
      <div><dt>Post-event cleaning</dt><dd>${fmt(q.clean)}</dd></div>
      ${q.decor ? `<div><dt>Basic decoration</dt><dd>${fmt(q.decor)}</dd></div>` : ''}
      <div class="tot"><dt>Total</dt><dd>${fmt(q.total)}</dd></div></dl>`;
  };

  function evFormHTML() {
    const f = evForm;
    if (f.n === undefined) { const prof = store.get('profile', {}); f.n = prof.n || ''; f.p = prof.p || ''; }
    if (!LH.inEventWindow(f.d)) f.d = addDays(1);
    const types = LH.EVENT_TYPES.map((t) => `<option value="${t.id}"${f.ty === t.id ? ' selected' : ''}>${t.icon} ${esc(t.label)}</option>`).join('');
    const starts = [];
    for (let m = EV.OPEN; m <= EV.LAST_START; m += EV.STEP) starts.push(`<option value="${m}"${m === f.st ? ' selected' : ''}>${LH.clock(m)}</option>`);
    return `<form class="form ev-form" id="evForm" novalidate>
      <div class="pay-note">🎉 <b>${fmt(EV.RATE)}</b> per hour · <b>${fmt(EV.CLEAN)}</b> post-event cleaning · optional basic decoration <b>${fmt(EV.DECOR)}</b>. You pay at the cafe on the day.</div>
      <div class="field"><label for="evType">Type of event</label><select id="evType">${types}</select></div>
      <div class="field" id="fEvDate"><label for="evDate">Date</label><input id="evDate" type="date" min="${addDays(0)}" max="${addDays(EV.DAYS)}" value="${esc(f.d)}"><div class="msg"></div></div>
      <div class="ev-two">
        <div class="field"><label for="evStart">Start time</label><select id="evStart">${starts.join('')}</select></div>
        <div class="field"><label for="evHours">Duration</label><select id="evHours"></select></div>
      </div>
      <div class="ev-avail" id="evAvail" role="status" aria-live="polite"></div>
      <div class="field" id="fEvGuests"><label for="evGuests">Number of guests</label><input id="evGuests" type="number" inputmode="numeric" min="1" max="${EV.MAX_GUESTS}" value="${esc(f.g)}"><div class="msg"></div></div>
      <div class="field" id="fEvName"><label for="evName">Your name</label><input id="evName" maxlength="40" autocomplete="name" value="${esc(f.n)}" placeholder="e.g. Anita"><div class="msg"></div></div>
      <div class="field" id="fEvPhone"><label for="evPhone">Mobile number</label><input id="evPhone" inputmode="tel" maxlength="14" autocomplete="tel" value="${esc(f.p)}" placeholder="10-digit number"><div class="msg"></div></div>
      <label class="ev-check"><input type="checkbox" id="evDecor"${f.dec ? ' checked' : ''}><span>🎈 Basic decoration <b>+${fmt(EV.DECOR)}</b></span></label>
      <div class="field"><label for="evNote">Special requests (optional)</label><textarea id="evNote" rows="2" maxlength="200" placeholder="Cake, theme, seating, music...">${esc(f.nt)}</textarea></div>
      <div id="evQuote"></div>
    </form>`;
  }

  function fillHours() {
    const sel = $('#evHours');
    if (!sel) return;
    const max = maxHours(evForm.st);
    if (evForm.h > max) evForm.h = max;
    sel.innerHTML = Array.from({ length: max - EV.MIN_H + 1 }, (_, i) => EV.MIN_H + i).map((h) => `<option value="${h}"${h === evForm.h ? ' selected' : ''}>${hrs(h)}</option>`).join('');
  }

  const slotText = ([a, b]) => `${LH.clock(a)} - ${LH.clock(b)}`;
  function evClash() {
    return LH.inEventWindow(evForm.d) ? LH.slotsClash(evForm.st, evForm.h, LH.getEvCfg().busy[evForm.d]) : null;
  }

  function updateEvForm() {
    if (!$('#evForm')) return;
    const f = evForm;
    const av = $('#evAvail');
    if (!LH.inEventWindow(f.d)) av.innerHTML = '';
    else {
      const busy = LH.getEvCfg().busy[f.d] || [];
      const clash = LH.slotsClash(f.st, f.h, busy);
      av.innerHTML = clash
        ? `<div class="ev-bad">⛔ That time overlaps an existing booking (${esc(slotText(clash))}). Please pick another time.</div>`
        : busy.length
          ? `<div class="ev-ok">✅ Your slot is free. Already booked that day: ${busy.map((s) => esc(slotText(s))).join(', ')}.</div>`
          : '<div class="ev-ok">✅ That day is open. We confirm every booking personally.</div>';
    }
    $('#evQuote').innerHTML = quoteRows(f.h, f.dec);
    const total = $('#evTotal');
    if (total) total.textContent = fmt(LH.eventQuote(f.h, f.dec).total);
    const send = $('#evSend');
    if (send && !send.dataset.busy) send.disabled = !!evClash();
  }

  const evDone = (e) => ['declined', 'cancelled', 'completed'].includes(e.status);
  function evListHTML() {
    if (!events.length) return '<div class="empty-cart"><span class="big">🎉</span><h3>No bookings yet</h3><p>Event bookings you make on this device appear here.</p></div>';
    const tel = cafePhone();
    return events.map((e) => {
      const st = EVS[e.status] || EVS.pending;
      const t = LH.EVENT_TYPE.get(e.ty);
      const foot = e.status === 'pending' ? 'Awaiting our confirmation. You pay at the cafe on the day.'
        : e.status === 'confirmed' ? `✅ Your slot is reserved. Please pay ${fmt(e.total)} at the cafe on the day.`
          : e.status === 'completed' ? 'Thank you for celebrating with us!' : '';
      return `<article class="order-card ev-card" data-ev="${esc(e.id)}">
        <div class="head"><span class="oid">${esc(e.id)}</span><span class="badge" style="background:${st.color}">${esc(st.label)}</span></div>
        <h3>${t.icon} ${esc(t.label)}</h3>
        <p class="ev-when">📅 ${esc(evWhen(e))}</p>
        ${e.moved && e.moved.od ? `<p class="ev-meta">🔁 Rescheduled from ${esc(evDay(e.moved.od))} · ${esc(LH.eventRange(e.moved.os, e.moved.oh))}</p>` : ''}
        <p class="ev-meta">${e.g} guest${e.g === 1 ? '' : 's'} · ${esc(e.n)}${e.nt ? ` · “${esc(e.nt)}”` : ''}</p>
        ${quoteRows(e.h, e.dec)}
        ${e.status === 'declined' || e.status === 'cancelled' ? `<div class="rej">${e.status === 'declined' ? 'Sorry, we could not take this booking' : 'This booking was cancelled'}${e.reason ? `: ${esc(e.reason)}` : '.'}</div>` : ''}
        ${foot ? `<div class="verify ${e.status === 'confirmed' ? 'ok' : ''}">${foot}</div>` : ''}
        ${!evDone(e) && tel ? `<div class="verify">To change or cancel, call <a href="tel:${esc(tel)}">${esc(tel)}</a>.</div>` : ''}
      </article>`;
    }).join('') + (events.some(evDone) ? '<button class="btn ghost" style="width:100%" id="evClear">Clear finished bookings</button>' : '');
  }

  function renderEvents() {
    const body = $('#eventsBody');
    const foot = $('#eventsFoot');
    const seg = `<div class="seg" role="group" aria-label="Event bookings"><button type="button" data-evv="book" class="${evView === 'book' ? 'on' : ''}">Book an event</button><button type="button" data-evv="mine" class="${evView === 'mine' ? 'on' : ''}">My bookings${events.length ? ` (${events.length})` : ''}</button></div>`;
    if (evView === 'book' && evOn()) {
      body.innerHTML = `${seg}<div style="margin-top:1rem">${evFormHTML()}</div>`;
      foot.hidden = false;
      foot.innerHTML = `<div class="sum"><span>Total</span><strong id="evTotal"></strong></div><button class="btn primary" style="width:100%" id="evSend" type="button">Request booking</button>`;
      fillHours();
      updateEvForm();
      return;
    }
    foot.hidden = true;
    const tel = cafePhone();
    const closed = evView === 'book' ? `<div class="empty-cart"><span class="big">🎉</span><h3>Bookings are closed</h3><p>We are not taking event bookings online right now.${tel ? ` Please call us on ${esc(tel)}.` : ''}</p></div>` : evListHTML();
    body.innerHTML = `${seg}<div style="margin-top:1rem">${closed}</div>`;
  }

  const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  async function sendEvent() {
    if (!evOn()) { toast('Event bookings are closed right now.', 'bad'); return; }
    const f = evForm;
    const name = LH.clean(f.n, 40);
    const phone = String(f.p || '').replace(/[^\d+]/g, '');
    const digits = phone.replace(/\D/g, '');
    const g = Math.floor(Number(f.g));
    const dateOk = LH.inEventWindow(f.d);
    const gOk = g >= 1 && g <= EV.MAX_GUESTS;
    const phOk = digits.length >= 10 && digits.length <= 13;
    setErr('fEvDate', dateOk ? '' : `Choose a date within the next ${EV.DAYS} days`);
    setErr('fEvGuests', gOk ? '' : `Enter between 1 and ${EV.MAX_GUESTS} guests`);
    setErr('fEvName', name ? '' : 'Please enter your name');
    setErr('fEvPhone', phOk ? '' : 'Enter a valid mobile number');
    if (!dateOk || !gOk || !name || !phOk) { const bad = $('#evForm .field.err input'); if (bad) bad.focus(); return; }
    if (evClash()) { toast('That time is already booked. Please pick another time.', 'bad'); return; }
    if (f.d === addDays(0) && f.st <= nowMinutes()) { toast('That start time has already passed today.', 'bad'); return; }
    if (Date.now() - lastEvent < 15000) { toast('Please wait a few seconds before sending another booking.', 'bad'); return; }
    const btn = $('#evSend');
    btn.disabled = true;
    btn.dataset.busy = '1';
    btn.textContent = 'Sending securely...';
    try {
      const ev = await LH.publishEvent({ ty: f.ty, d: f.d, st: f.st, h: f.h, g, dec: f.dec, nt: f.nt, n: name, p: phone });
      lastEvent = Date.now();
      store.set('profile', { ...store.get('profile', {}), n: name, p: phone });
      events.unshift({ ...ev, status: 'pending', statusTs: 0, reason: '' });
      saveEvents();
      f.nt = '';
      evView = 'mine';
      closeDrawers(true);
      showEventSuccess(events[0]);
      confetti();
    } catch (err) {
      toast(err && err.code === 'permission-denied' ? 'Event bookings are not available right now. Please call us.' : 'Could not send the booking. Please try again.', 'bad');
      delete btn.dataset.busy;
      btn.textContent = 'Request booking';
      btn.disabled = false;
      updateEvForm();
    }
  }

  function showEventSuccess(e) {
    const t = LH.EVENT_TYPE.get(e.ty);
    openModal(`<h2 id="modalTitle">Booking requested 🎉</h2>
      <p style="color:var(--muted)">Your booking ID is <span class="oid">${esc(e.id)}</span>. It is not final until we confirm it. The status updates live in My bookings.</p>
      <div class="pay-note"><b>${t.icon} ${esc(t.label)}</b><br>${esc(evWhen(e))} · ${e.g} guest${e.g === 1 ? '' : 's'}<br>Total <b>${fmt(e.total)}</b>, payable at the cafe on the day.</div>
      <div class="row-btns"><button class="btn ghost" id="evMine">View my bookings</button><button class="btn ghost" data-modal-close>Close</button></div>`);
    $('#evMine').addEventListener('click', () => { closeModal(); openDrawer('eventsDrawer'); });
  }

  function onEvInput(ev) {
    const t = ev.target;
    if (evView !== 'book') return;
    switch (t.id) {
      case 'evType': evForm.ty = t.value; break;
      case 'evDate': evForm.d = t.value; break;
      case 'evStart': evForm.st = Number(t.value); fillHours(); break;
      case 'evHours': evForm.h = Number(t.value); break;
      case 'evGuests': evForm.g = t.value; break;
      case 'evName': evForm.n = t.value; break;
      case 'evPhone': evForm.p = t.value; break;
      case 'evDecor': evForm.dec = t.checked; break;
      case 'evNote': evForm.nt = t.value; break;
      default: return;
    }
    $$('#evForm .field').forEach((f) => { f.classList.remove('err'); const m = $('.msg', f); if (m) m.textContent = ''; });
    updateEvForm();
  }
  $('#eventsBody').addEventListener('input', onEvInput);
  $('#eventsBody').addEventListener('change', onEvInput);
  $('#eventsBody').addEventListener('click', (e) => {
    const v = e.target.closest('[data-evv]');
    if (v) { evView = v.dataset.evv; renderEvents(); return; }
    if (e.target.closest('#evClear')) { events = events.filter((x) => !evDone(x)); saveEvents(); renderEvents(); }
  });
  $('#eventsFoot').addEventListener('click', (e) => { if (e.target.closest('#evSend')) sendEvent(); });
  const openEvents = () => { if (!evOn()) evView = 'mine'; openDrawer('eventsDrawer'); };
  $('#eventsBtn').addEventListener('click', openEvents);
  $('#heroEvents').addEventListener('click', () => { evView = 'book'; openDrawer('eventsDrawer'); });

  let evWas = null;
  function applyEvCfg() {
    const on = evOn();
    $('#eventsBtn').hidden = !(on || events.length);
    $('#heroEvents').hidden = !on;
    $('#evHeroNote').hidden = !on;
    const open = $('#eventsDrawer').classList.contains('open');
    if (open && evView === 'book') { if (evWas !== null && evWas !== on) renderEvents(); else updateEvForm(); }
    evWas = on;
  }
  LH.on('evcfg', applyEvCfg);
  // The owner cleared all storefront data: forget saved orders and bookings placed before that moment.
  LH.on('wipe', ({ ts }) => {
    if (ts <= Number(store.get('wipeTs', 0))) return;
    store.set('wipeTs', ts);
    orders = orders.filter((o) => o.ts > ts);
    events = events.filter((e) => e.ts > ts);
    saveOrders(); saveEvents();
    if ($('#ordersDrawer').classList.contains('open')) renderOrders();
    if ($('#eventsDrawer').classList.contains('open')) renderEvents();
  });
  LH.on('evstatus', ({ id, s, r, ts, mv }) => {
    const e = events.find((x) => x.id === id);
    if (!e || ts < e.statusTs) return;
    const changed = e.status !== s;
    const moved = !!mv && (e.d !== mv.d || e.st !== mv.st || e.h !== mv.h);
    e.status = s; e.statusTs = ts; e.reason = r || '';
    if (mv) Object.assign(e, LH.moveEvent(e, mv), { moved: mv.od ? mv : e.moved });
    saveEvents();
    if (moved) {
      toast(`Booking ${id} moved to ${evWhen(e)}`, 'ok');
      if (!$('#eventsDrawer').classList.contains('open')) $('#eventsDot').hidden = false;
    } else if (changed) {
      toast(`Booking ${id}: ${EVS[s].label}`, s === 'declined' || s === 'cancelled' ? 'bad' : 'ok');
      if (!$('#eventsDrawer').classList.contains('open')) $('#eventsDot').hidden = false;
    }
    if ($('#eventsDrawer').classList.contains('open') && evView === 'mine') renderEvents();
  });

  /* ---------- Live events from the admin console ---------- */
  LH.on('status', ({ id, s, r, ts }) => {
    const o = orders.find((x) => x.id === id);
    if (!o || ts < o.statusTs) return;
    const changed = o.status !== s;
    o.status = s; o.statusTs = ts; o.reason = r || '';
    if (s === 'completed' || s === 'rejected') delete o.otp;
    saveOrders();
    if (s === 'completed' || s === 'rejected') riders.delete(id);
    if (changed) {
      toast(`Order ${id}: ${LH.statusLabel(o, s, r)}${s === 'ready' ? (o.svc === 'deliver' ? ' - packed and about to leave!' : ' - come and get it!') : s === 'out' ? ` 🛵 - track it live in My orders${o.otp ? `. Your delivery code is ${o.otp}` : ''}` : s === 'completed' && !o.fb ? ' - how was it? Rate it in My orders' : ''}`, s === 'rejected' ? 'bad' : 'ok');
      if (s === 'ready' && o.svc !== 'deliver') confetti();
      if (!$('#ordersDrawer').classList.contains('open')) $('#ordersDot').hidden = false;
    }
    if ($('#ordersDrawer').classList.contains('open')) renderOrders();
    if (trackId === id) { drawRider(); renderTrack(); }
  });
  LH.on('loc', ({ id, lat, lng, acc, lts }) => {
    const o = orders.find((x) => x.id === id);
    if (!o || o.svc !== 'deliver' || ['completed', 'rejected'].includes(o.status)) return;
    const prev = riders.get(id);
    if (prev && prev.lts > lts) return;
    riders.set(id, { lat, lng, acc, lts: lts || Date.now() });
    if ($('#ordersDrawer').classList.contains('open')) renderOrders();
    if (trackId === id) { drawRider(); renderTrack(); }
  });
  LH.on('pay', ({ id, v, ts }) => {
    const o = orders.find((x) => x.id === id);
    if (!o || ts < (o.payTs || 0)) return;
    o.payVerified = v; o.payTs = ts; saveOrders();
    if ($('#ordersDrawer').classList.contains('open')) renderOrders();
  });
  LH.on('cfg', applyCfg);
  LH.on('menu', () => {
    const before = Object.keys(cart).length;
    cart = Object.fromEntries(Object.entries(cart && typeof cart === 'object' ? cart : {}).filter(([id, q]) => orderable(id) && Number.isInteger(q) && q > 0 && q <= 25));
    if (Object.keys(cart).length !== before) { saveCart(); toast('Some items in your cart are no longer on the menu.', 'bad'); }
    buildMenu();
    applyFilters();
    syncMenuText();
    $$('[data-stat]').forEach((el) => { el.textContent = el.dataset.count; });
    buildMarquee();
    renderCartUI();
  });
  LH.on('relay', ({ ops, queued }) => {
    const pill = $('#livePill');
    pill.classList.toggle('up', ops);
    pill.classList.toggle('down', !ops);
    $('span', pill).textContent = ops ? (queued ? `Sending ${queued}` : 'Live') : (queued ? `Offline - ${queued} queued` : 'Reconnecting');
  });

  function applyCfg() {
    const cfg = LH.getCfg();
    const banner = $('#banner');
    if (!cfg.open) { banner.hidden = false; banner.className = 'banner'; banner.textContent = "We're closed for orders right now. Browse the menu and come back soon!"; }
    else if (cfg.note) { banner.hidden = false; banner.className = 'banner info'; banner.textContent = cfg.note; }
    else banner.hidden = true;
    $('#prepStat').textContent = `~${cfg.prep}m`;
    const dn = $('#delivNote');
    if (dn) dn.hidden = !cfg.del;
    $$('.card').forEach((c) => updateCard(c.dataset.id));
    renderCartUI();
    if (checkout && service === 'deliver' && $('#fDeliver')) { renderGeo(); if (cfg.del) mountPick(); }
  }

  /* ---------- Visual flourishes ---------- */
  function observeReveal() {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    $$('.reveal:not(.in)').forEach((el) => io.observe(el));
  }

  function buildMarquee() {
    const shown = [...ITEMS.values()].filter((i) => !i.hide);
    const names = shown.filter((i) => i.best).concat(shown.filter((i, n) => n % 7 === 0));
    const row = names.map((i) => `<span><b>${i.icon}</b>${esc(i.name)}</span>`).join('');
    $('#marquee').innerHTML = row + row;
  }

  // Item and category counts in the hero follow the live menu.
  function syncMenuText() {
    const s = { items: [...ITEMS.values()].filter((i) => !i.hide).length, cats: MENU.filter((c) => c.items.length).length };
    const lead = $('#menuCount');
    if (lead) lead.textContent = s.items;
    $('#search').placeholder = `Search ${s.items} dishes, drinks, combos...`;
    $$('[data-stat]').forEach((el) => { el.dataset.count = s[el.dataset.stat]; });
  }

  function setupHero() {
    const emojis = ['🍔', '🥟', '🌯', '🍟', '🍗', '☕', '🥤', '🍢', '🥗', '🍳', '🍫', '🥭'];
    $('#floaters').innerHTML = emojis.map((e, i) => `<span style="--x:${(i * 83) % 96}%;--y:${(i * 37 + 8) % 80}%;--s:${28 + (i % 4) * 14}px;--d:${4 + (i % 5)}s;--b:${i % 3 ? 0 : '2px'}">${e}</span>`).join('');
    buildMarquee();
    syncMenuText();
    $$('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const start = performance.now();
      const tick = (t) => { const p = Math.min(1, (t - start) / 1400); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    requestAnimationFrame(() => $$('.hero .reveal').forEach((el) => el.classList.add('in')));
  }

  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  window.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', scrollY > 10), { passive: true });

  function syncStickyOffsets() {
    const bar = $('#topbar');
    const chips = $('#chips');
    const root = document.documentElement.style;
    root.setProperty('--topbar-h', `${getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0}px`);
    root.setProperty('--chips-h', `${chips.offsetHeight}px`);
  }

  function spy() {
    syncStickyOffsets();
    if ('ResizeObserver' in window) new ResizeObserver(syncStickyOffsets).observe($('#topbar'));
    addEventListener('resize', syncStickyOffsets, { passive: true });
    const chipBar = $('#chips');
    let current = null;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || e.target.dataset.cat === current) return;
        current = e.target.dataset.cat;
        $$('.chip').forEach((c) => c.classList.toggle('on', c.dataset.cat === current));
        const on = $('.chip.on');
        if (on) chipBar.scrollTo({ left: on.offsetLeft - (chipBar.clientWidth - on.offsetWidth) / 2, behavior: 'auto' });
      });
    }, { rootMargin: `-${Math.round((parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 140) + 8)}px 0px -65% 0px` });
    $$('.cat').forEach((s) => io.observe(s));
    addEventListener('scroll', () => {
      if (innerHeight + scrollY < document.documentElement.scrollHeight - 4) return;
      const last = [...$$('.cat')].reverse().find((s) => !s.hidden && s.offsetParent);
      if (!last || last.dataset.cat === current) return;
      current = last.dataset.cat;
      $$('.chip').forEach((c) => c.classList.toggle('on', c.dataset.cat === current));
      const on = $('.chip.on');
      if (on) chipBar.scrollTo({ left: on.offsetLeft - (chipBar.clientWidth - on.offsetWidth) / 2, behavior: 'auto' });
    }, { passive: true });
  }

  function confetti() {
    if (reduceMotion) return;
    const cv = $('#confetti');
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const colors = ['#ffb454', '#ff7a45', '#34d399', '#60a5fa', '#ff4d8d'];
    const bits = Array.from({ length: 130 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0] }));
    let frames = 0;
    (function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      bits.forEach((b) => { b.vy += 0.4; b.x += b.vx; b.y += b.vy; b.r += b.vr; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.6); ctx.restore(); });
      if (++frames < 170) requestAnimationFrame(draw); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }

  /* ---------- Boot ---------- */
  buildMenu();
  applyFilters();
  setupHero();
  spy();
  applyCfg();
  applyEvCfg();
  renderCartUI();
  window.addEventListener('storage', () => { orders = loadOrders(orders); });
  window.__lh = { get cart() { return cart; }, get orders() { return orders; }, get events() { return events; } };
})();
