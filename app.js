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
  let lastPlaced = store.get('lastPlaced', 0);

  cart = Object.fromEntries(Object.entries(cart).filter(([id, q]) => ITEMS.has(id) && q > 0 && q <= 25));
  const saveCart = () => store.set('cart', cart);
  const saveOrders = () => store.set('orders', orders.slice(0, 25));
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
    if ($('#cartDrawer').classList.contains('open')) renderCartDrawer();
  }

  function renderCartDrawer() {
    const body = $('#cartBody');
    const foot = $('#cartFoot');
    const lines = cartLines();
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
    const profile = store.get('profile', { n: '', p: '' });
    body.innerHTML = `<button class="back" id="backCart">← Back to cart</button>
      <form class="form" id="coForm" novalidate>
        <div class="field" id="fName"><label for="coName">Your name</label><input id="coName" maxlength="40" autocomplete="name" value="${esc(profile.n)}" placeholder="e.g. Anita"><div class="msg"></div></div>
        <div class="field" id="fPhone"><label for="coPhone">Mobile number</label><input id="coPhone" inputmode="tel" maxlength="14" autocomplete="tel" value="${esc(profile.p)}" placeholder="10-digit number"><div class="msg"></div></div>
        <div class="field"><label>Service</label><div class="seg" id="svcSeg"><button type="button" data-v="dine" class="${service === 'dine' ? 'on' : ''}">🍽️ Dine-in</button><button type="button" data-v="take" class="${service === 'take' ? 'on' : ''}">🥡 Takeaway</button></div></div>
        <div class="field" id="fTable" ${service === 'dine' ? '' : 'hidden'}><label for="coTable">Table number (optional)</label><input id="coTable" maxlength="8" placeholder="e.g. 4"></div>
        <div class="field"><label for="coNote">Note for the kitchen (optional)</label><textarea id="coNote" rows="2" maxlength="140" placeholder="Less spicy, no onion..."></textarea></div>
        <div class="field"><label>Payment</label><div class="seg" id="paySeg"><button type="button" data-v="upi" class="${payMethod === 'upi' ? 'on' : ''}">📲 Pay by UPI</button><button type="button" data-v="counter" class="${payMethod === 'counter' ? 'on' : ''}">💵 Pay at counter</button></div></div>
      </form>`;
    foot.innerHTML = `<div class="sum"><span>To pay</span><strong>${fmt(cartTotal())}</strong></div><button class="btn primary" style="width:100%" id="placeOrder">Place order</button>`;
  }

  $('#cartDrawer').addEventListener('click', (e) => {
    const t = e.target;
    const act = t.closest('[data-act]');
    if (act) { change(act.closest('.line').dataset.id, act.dataset.act === 'inc' ? 1 : -1); return; }
    if (t.closest('#toCheckout')) { checkout = true; renderCartDrawer(); }
    else if (t.closest('#backCart')) { checkout = false; renderCartDrawer(); }
    else if (t.closest('#svcSeg button')) {
      service = t.closest('button').dataset.v; store.set('svc', service);
      $$('#svcSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === service));
      $('#fTable').hidden = service !== 'dine';
    } else if (t.closest('#paySeg button')) {
      payMethod = t.closest('button').dataset.v; store.set('pay', payMethod);
      $$('#paySeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === payMethod));
    } else if (t.closest('#placeOrder')) placeOrder();
  });

  /* ---------- Drawers ---------- */
  let lastFocus = null;
  function openDrawer(id) {
    closeDrawers(true);
    lastFocus = document.activeElement;
    const d = $(`#${id}`);
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    $('#scrim').hidden = false;
    document.body.style.overflow = 'hidden';
    if (id === 'cartDrawer') { checkout = false; renderCartDrawer(); renderCartUI(); }
    if (id === 'ordersDrawer') { renderOrders(); $('#ordersDot').hidden = true; }
    setTimeout(() => { const f = $('button, input', d); if (f) f.focus(); }, 80);
  }
  function closeDrawers(silent) {
    $$('.drawer.open').forEach((d) => { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); });
    $('#scrim').hidden = true;
    document.body.style.overflow = '';
    if (!silent) { renderCartUI(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  }
  $('#scrim').addEventListener('click', () => closeDrawers());
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => closeDrawers()));
  $('#cartDrawer').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawers(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawers(); } });
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
    if (!name || digits.length < 10 || digits.length > 13) return;
    if (cartLines().some((l) => isOut(l.item.id))) { toast('Please remove sold-out items.', 'bad'); checkout = false; renderCartDrawer(); return; }
    if (Date.now() - lastPlaced < 15000) { toast('Please wait a few seconds before placing another order.', 'bad'); return; }

    const btn = $('#placeOrder');
    btn.disabled = true;
    btn.textContent = 'Sending securely...';
    const draft = {
      n: name, p: phone, nt: $('#coNote').value, pay: payMethod, svc: service, tbl: service === 'dine' ? $('#coTable').value : '',
      it: Object.entries(cart)
    };
    try {
      const order = await LH.publishOrder(draft);
      lastPlaced = Date.now();
      store.set('lastPlaced', lastPlaced);
      store.set('profile', { n: name, p: phone });
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
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  }

  const upiLink = (o) => `upi://pay?pa=${encodeURIComponent(UPI.id)}&pn=${encodeURIComponent(UPI.name)}&am=${o.total}&cu=INR&tn=${encodeURIComponent(`Order ${o.id}`)}`;

  function showSuccess(o) {
    const pay = o.pay === 'upi'
      ? `<div class="pay-note">Scan with any UPI app and pay <b>${fmt(o.total)}</b>. We confirm your payment at the counter.</div>
         <div class="qr"><img id="qrImg" alt="UPI QR code for ${fmt(o.total)}" width="240" height="240"><small>${esc(UPI.id)}</small></div>
         <div class="row-btns"><a class="btn primary upi-open" href="${esc(upiLink(o))}">Open UPI app</a></div>`
      : '<div class="pay-note">Please pay at the counter when you collect or finish your meal.</div>';
    openModal(`<h2 id="modalTitle">Order placed 🎉</h2>
      <p style="color:var(--muted)">Your order ID is <span class="oid">${esc(o.id)}</span>. Keep this page open to see live status.</p>
      ${pay}
      <div class="row-btns"><button class="btn ghost" id="trackNow">Track my order</button><button class="btn ghost" data-modal-close>Keep browsing</button></div>`);
    const img = $('#qrImg');
    if (img) {
      img.addEventListener('error', () => { img.src = 'assets/payment-upi.jpeg'; }, { once: true });
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(upiLink(o))}`;
    }
    $('#trackNow').addEventListener('click', () => { closeModal(); openDrawer('ordersDrawer'); });
  }

  /* ---------- My orders ---------- */
  const FLOW = ['pending', 'accepted', 'cooking', 'ready', 'completed'];
  const FLOW_ICON = ['📥', '👍', '🔥', '🛎️', '✅'];
  function renderOrders() {
    const body = $('#ordersBody');
    if (!orders.length) {
      body.innerHTML = '<div class="empty-cart"><span class="big">🧾</span><h3>No orders yet</h3><p>Orders you place on this device appear here with live tracking.</p></div>';
      return;
    }
    const finished = orders.some((o) => o.status === 'completed' || o.status === 'rejected');
    body.innerHTML = orders.map((o) => {
      const st = STATUS[o.status] || STATUS.pending;
      const step = Math.max(0, st.step);
      const tracker = o.status === 'rejected'
        ? `<div class="rej">Sorry, the kitchen could not take this order${o.reason ? `: ${esc(o.reason)}` : '.'}</div>`
        : `<div class="tracker">${FLOW.map((s, i) => `<div class="st ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}"><i>${i < step ? '✓' : FLOW_ICON[i]}</i>${STATUS[s].short}</div>`).join('')}</div>`;
      const eta = !['completed', 'rejected', 'ready'].includes(o.status) ? `<div class="verify">Estimated ready in about ${LH.getCfg().prep} minutes after acceptance.</div>` : '';
      const pay = o.pay === 'upi'
        ? `<div class="verify ${o.payVerified ? 'ok' : ''}">${o.payVerified ? '✔ Payment verified' : 'UPI payment awaiting verification'}</div>`
        : '<div class="verify">Pay at counter</div>';
      return `<article class="order-card" data-id="${esc(o.id)}">
        <div class="head"><span class="oid">${esc(o.id)}</span><span class="badge" style="background:${st.color}">${st.label}</span></div>
        <div class="items-list">${o.it.map(([id, q]) => `${q} × ${esc(ITEMS.get(id)?.name || id)}`).join(', ')}</div>
        <strong>${fmt(o.total)}</strong> <span style="color:var(--muted);font-size:.8rem">· ${o.svc === 'take' ? 'Takeaway' : `Dine-in${o.tbl ? ` · Table ${esc(o.tbl)}` : ''}`} · ${new Date(o.ts).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
        ${tracker}${eta}${pay}
        ${o.pay === 'upi' && !o.payVerified && !['rejected', 'completed'].includes(o.status) ? `<button class="btn ghost" style="margin-top:10px;width:100%" data-pay="${esc(o.id)}">Show payment QR</button>` : ''}
      </article>`;
    }).join('') + (finished ? '<button class="btn ghost" style="width:100%" id="clearDone">Clear finished orders</button>' : '');
  }

  $('#ordersBody').addEventListener('click', (e) => {
    const pay = e.target.closest('[data-pay]');
    if (pay) { const o = orders.find((x) => x.id === pay.dataset.pay); if (o) { closeDrawers(true); showSuccess(o); } return; }
    if (e.target.closest('#clearDone')) {
      orders = orders.filter((o) => o.status !== 'completed' && o.status !== 'rejected');
      saveOrders(); renderOrders();
    }
  });

  /* ---------- Live events from the admin console ---------- */
  LH.on('status', ({ id, s, r, ts }) => {
    const o = orders.find((x) => x.id === id);
    if (!o || ts < o.statusTs) return;
    const changed = o.status !== s;
    o.status = s; o.statusTs = ts; o.reason = r || '';
    saveOrders();
    if (changed) {
      toast(`Order ${id}: ${STATUS[s].label}${s === 'ready' ? ' - come and get it!' : ''}`, s === 'rejected' ? 'bad' : 'ok');
      if (s === 'ready') confetti();
      if (!$('#ordersDrawer').classList.contains('open')) $('#ordersDot').hidden = false;
    }
    if ($('#ordersDrawer').classList.contains('open')) renderOrders();
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
    $$('.card').forEach((c) => updateCard(c.dataset.id));
    renderCartUI();
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

  function spy() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        $$('.chip').forEach((c) => c.classList.toggle('on', c.dataset.cat === e.target.dataset.cat));
        const on = $('.chip.on');
        if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }, { rootMargin: '-140px 0px -65% 0px' });
    $$('.cat').forEach((s) => io.observe(s));
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
