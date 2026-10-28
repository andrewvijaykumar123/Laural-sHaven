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
  let orders = store.get('orders', []);
  const filters = { q: '', diet: 'all' };
  let checkout = false;
  let payMethod = store.get('pay', 'upi');
  let service = store.get('svc', 'dine');
  if (!['dine', 'take', 'deliver'].includes(service)) service = 'dine';
  let lastPlaced = store.get('lastPlaced', 0);
  // Delivery: the customer's chosen spot (GPS or map pin). Only reused for 30 minutes, then we ask again.
  let geo = store.get('geo', null);
  if (!geo || !LH.validPoint(geo.lat, geo.lng) || Date.now() - (geo.ts || 0) > 30 * 60000) geo = null;
  let geoState = 'idle', geoNote = '', locReq = 0, pickCtl = null, pickToken = 0;
  const riders = new Map();

  cart = Object.fromEntries(Object.entries(cart).filter(([id, q]) => ITEMS.has(id) && q > 0 && q <= 25));
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
    if (!ITEMS.has(id) || (delta > 0 && isOut(id))) return;
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
    const profile = store.get('profile', { n: '', p: '', em: '', addr: '' });
    body.innerHTML = `<button class="back" id="backCart">← Back to cart</button>
      <form class="form" id="coForm" novalidate>
        <div class="field" id="fName"><label for="coName">Your name</label><input id="coName" maxlength="40" autocomplete="name" value="${esc(profile.n)}" placeholder="e.g. Anita"><div class="msg"></div></div>
        <div class="field" id="fPhone"><label for="coPhone">Mobile number</label><input id="coPhone" inputmode="tel" maxlength="14" autocomplete="tel" value="${esc(profile.p)}" placeholder="10-digit number"><div class="msg"></div></div>
        <div class="field" id="fEmail"><label for="coEmail">Email (optional)</label><input id="coEmail" type="email" inputmode="email" maxlength="80" autocomplete="email" value="${esc(profile.em || '')}" placeholder="you@example.com"><div class="msg"></div><small class="hint">We email you within seconds when your order is received, confirmed, ready or on its way.</small></div>
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

  const upiLink = (o) => `upi://pay?pa=${encodeURIComponent(UPI.id)}&pn=${encodeURIComponent(UPI.name)}&am=${o.total}&cu=INR&tn=${encodeURIComponent(`Order ${o.id}`)}`;

  function showSuccess(o) {
    const pay = o.pay === 'upi'
      ? `<div class="pay-note">Scan with any UPI app and pay <b>${fmt(o.total)}</b>. ${o.svc === 'deliver' ? 'We confirm your payment before the order leaves.' : 'We confirm your payment at the counter.'}</div>
         <div class="qr"><img id="qrImg" alt="UPI QR code for ${fmt(o.total)}" width="240" height="240"><small>${esc(UPI.id)}</small></div>
         <div class="row-btns"><a class="btn primary upi-open" href="${esc(upiLink(o))}">Open UPI app</a></div>`
      : `<div class="pay-note">${o.svc === 'deliver' ? `Please keep <b>${fmt(o.total)}</b> in cash ready for the delivery partner.` : 'Please pay at the counter when you collect or finish your meal.'}</div>`;
    openModal(`<h2 id="modalTitle">Order placed 🎉</h2>
      <p style="color:var(--muted)">Your order ID is <span class="oid">${esc(o.id)}</span>. Keep this page open to see live status.${o.svc === 'deliver' ? ' When your order is out for delivery you can follow it live on the map.' : ''}</p>
      ${pay}
      <div class="row-btns"><button class="btn ghost" id="trackNow">Track my order</button><button class="btn ghost" data-modal-close>Keep browsing</button></div>`);
    const img = $('#qrImg');
    if (img) {
      img.addEventListener('error', () => { img.src = 'assets/payment-upi.jpeg'; }, { once: true });
      try { img.src = window.LH_QR(upiLink(o)); } catch (e) { img.src = 'assets/payment-upi.jpeg'; }
    }
    $('#trackNow').addEventListener('click', () => { closeModal(); openDrawer('ordersDrawer'); });
  }

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
        ? `<div class="rej">Sorry, the kitchen could not take this order${o.reason ? `: ${esc(o.reason)}` : '.'}</div>`
        : `<div class="tracker">${flow.map((s, i) => `<div class="st ${i < step || o.status === 'completed' ? 'done' : ''} ${i === step && o.status !== 'completed' ? 'now' : ''}"><i>${i < step || o.status === 'completed' ? '✓' : FLOW_ICON[s]}</i>${label(s)}</div>`).join('')}</div>`;
      const ri = riderInfo(o);
      let eta = !['completed', 'rejected', 'ready', 'out'].includes(o.status) ? `<div class="verify">Estimated ready in about ${LH.getCfg().prep} minutes after acceptance.</div>` : '';
      if (o.status === 'out') eta = ri ? `<div class="verify ok">🛵 About ${ri.min} min away · ${ri.km.toFixed(1)} km · updated ${ago(ri.age)}</div>` : '<div class="verify ok">🛵 On the way. Live location appears here shortly.</div>';
      const pay = o.pay === 'upi'
        ? `<div class="verify ${o.payVerified ? 'ok' : ''}">${o.payVerified ? '✔ Payment verified' : 'UPI payment awaiting verification'}</div>`
        : `<div class="verify">${o.svc === 'deliver' ? 'Cash on delivery' : 'Pay at counter'}</div>`;
      const where = o.svc === 'take' ? 'Takeaway' : o.svc === 'deliver' ? `Delivery${o.fee ? ` (incl. ${fmt(o.fee)})` : ' (free)'}` : `Dine-in${o.tbl ? ` · Table ${esc(o.tbl)}` : ''}`;
      return `<article class="order-card" data-id="${esc(o.id)}">
        <div class="head"><span class="oid">${esc(o.id)}</span><span class="badge" style="background:${st.color}">${esc(LH.statusLabel(o, o.status))}</span></div>
        <div class="items-list">${o.it.map(([id, q]) => `${q} × ${esc(ITEMS.get(id)?.name || id)}`).join(', ')}</div>
        <strong>${fmt(o.total)}</strong> <span style="color:var(--muted);font-size:.8rem">· ${where} · ${new Date(o.ts).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
        ${o.svc === 'deliver' ? `<div class="verify">📍 ${esc(o.addr)}</div>` : ''}
        ${tracker}${eta}${pay}
        ${o.svc === 'deliver' && !['rejected', 'completed'].includes(o.status) ? `<button class="btn ${o.status === 'out' ? 'primary' : 'ghost'}" style="margin-top:10px;width:100%" data-track="${esc(o.id)}">🗺️ Track on map</button>` : ''}
        ${o.pay === 'upi' && !o.payVerified && !['rejected', 'completed'].includes(o.status) ? `<button class="btn ghost" style="margin-top:10px;width:100%" data-pay="${esc(o.id)}">Show payment QR</button>` : ''}
        ${['completed', 'rejected'].includes(o.status) ? `<button class="btn ghost" style="margin-top:10px;width:100%" data-again="${esc(o.id)}">🔁 Order again</button>` : ''}
      </article>`;
    }).join('') + (finished ? '<button class="btn ghost" style="width:100%" id="clearDone">Clear finished orders</button>' : '');
  }

  $('#ordersBody').addEventListener('click', (e) => {
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
      if (!ITEMS.has(item) || isOut(item)) { skipped++; return; }
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
    else if (o.status === 'rejected') { sub = 'Cancelled'; info = `<b>This order was not accepted.</b>${o.reason ? ` ${esc(o.reason)}` : ''}`; }
    else if (o.status === 'out' && ri) {
      sub = `About ${ri.min} min away`;
      info = `<b>🛵 ${ri.km.toFixed(1)} km from you</b> · updated ${ago(ri.age)}${ri.age > 180000 ? '<br><span class="tv-warn">Live location is delayed. The delivery partner may be in a low-signal area.</span>' : ''}`;
    } else if (o.status === 'out') { sub = 'On the way'; info = '<b>🛵 Your order is out for delivery.</b> Live location appears here as soon as it is shared.'; }
    else { sub = LH.statusLabel(o, o.status); info = "<b>We're preparing your order.</b> You'll see your delivery partner here once it is out for delivery."; }
    $('#tvSub').textContent = sub;
    $('#tvInfo').innerHTML = `<div>${info}</div><div class="tv-addr">📍 ${esc(o.addr)}</div>`;
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

  /* ---------- Live events from the admin console ---------- */
  LH.on('status', ({ id, s, r, ts }) => {
    const o = orders.find((x) => x.id === id);
    if (!o || ts < o.statusTs) return;
    const changed = o.status !== s;
    o.status = s; o.statusTs = ts; o.reason = r || '';
    saveOrders();
    if (s === 'completed' || s === 'rejected') riders.delete(id);
    if (changed) {
      toast(`Order ${id}: ${LH.statusLabel(o, s)}${s === 'ready' ? (o.svc === 'deliver' ? ' - packed and about to leave!' : ' - come and get it!') : s === 'out' ? ' 🛵 - track it live in My orders' : ''}`, s === 'rejected' ? 'bad' : 'ok');
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

  function setupHero() {
    const emojis = ['🍔', '🥟', '🌯', '🍟', '🍗', '☕', '🥤', '🍢', '🥗', '🍳', '🍫', '🥭'];
    $('#floaters').innerHTML = emojis.map((e, i) => `<span style="--x:${(i * 83) % 96}%;--y:${(i * 37 + 8) % 80}%;--s:${28 + (i % 4) * 14}px;--d:${4 + (i % 5)}s;--b:${i % 3 ? 0 : '2px'}">${e}</span>`).join('');
    const names = [...ITEMS.values()].filter((i) => i.best).concat([...ITEMS.values()].filter((i, n) => n % 7 === 0));
    const row = names.map((i) => `<span><b>${i.icon}</b>${esc(i.name)}</span>`).join('');
    $('#marquee').innerHTML = row + row;
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
  renderCartUI();
  window.addEventListener('storage', () => { orders = store.get('orders', orders); });
  window.__lh = { get cart() { return cart; }, get orders() { return orders; } };
})();
