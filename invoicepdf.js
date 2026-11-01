/* Builds the customer's invoice as a real PDF file in the browser (no libraries): the page is drawn on a canvas,
   then each page is embedded as a JPEG in a minimal PDF. Same content as LHMail.invoiceHtml. */
(function () {
  'use strict';
  const W = 794, H = 1123, M = 48, S = 2; // A4 at 96 dpi, drawn at 2x for a sharp print
  const FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const BRAND = '#b45309', INK = '#1f2937', MUTED = '#6b7280', LINE = '#e5e7eb';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function istDate(ts) {
    const d = new Date(ts + 330 * 60000);
    const h = d.getUTCHours();
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(h % 12 || 12).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} IST`;
  }

  function drawPages(LH, Mail, o, paid) {
    const pages = [];
    let cv, g, y;
    const newPage = () => {
      cv = document.createElement('canvas');
      cv.width = W * S; cv.height = H * S;
      g = cv.getContext('2d');
      g.scale(S, S);
      g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      g.textBaseline = 'alphabetic';
      pages.push(cv);
      y = M;
    };
    const font = (size, weight) => { g.font = `${weight || 400} ${size}px ${FONT}`; };
    const text = (s, x, yy, size, o2 = {}) => {
      font(size, o2.weight); g.fillStyle = o2.color || INK; g.textAlign = o2.align || 'left';
      g.fillText(s, x, yy);
    };
    const rule = (yy, w, color, x1 = M, x2 = W - M) => { g.fillStyle = color; g.fillRect(x1, yy, x2 - x1, w); };
    const wrap = (s, maxW, size, weight) => {
      font(size, weight);
      const out = [];
      let cur = '';
      for (const word of String(s).split(/\s+/)) {
        const t = cur ? `${cur} ${word}` : word;
        if (g.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = word; }
      }
      if (cur) out.push(cur);
      return out.length ? out : [''];
    };
    const ensure = (h) => { if (y + h > H - M) newPage(); };

    const del = o.svc === 'deliver';
    const fee = del ? (o.fee || 0) : 0;
    const serve = o.svc === 'take' ? 'Takeaway' : del ? 'Home delivery' : `Dine-in${o.tbl ? `, table ${o.tbl}` : ''}`;
    const pay = o.pay === 'upi' ? 'UPI' : del ? 'Cash on delivery' : 'Cash at counter';
    const status = paid ? ['PAID', '#15803d'] : o.pay === 'upi' ? ['UPI PAYMENT PENDING', BRAND] : ['PAYMENT DUE', BRAND];
    const cafe = Mail.CAFE;

    newPage();
    // Header
    text(cafe.name, M, y + 22, 24, { weight: 800, color: BRAND });
    text(`Phone: ${cafe.phone}`, M, y + 46, 12.5, { color: '#4b5563' });
    text(`Google Maps: ${cafe.mapLabel}`, M, y + 64, 12.5, { color: '#4b5563' });
    text('INVOICE', W - M, y + 24, 26, { weight: 800, align: 'right' });
    font(11.5, 700);
    const bw = g.measureText(status[0]).width + 22;
    g.strokeStyle = status[1]; g.lineWidth = 1.5;
    g.strokeRect(W - M - bw, y + 36, bw, 24);
    text(status[0], W - M - bw / 2, y + 52, 11.5, { weight: 700, color: status[1], align: 'center' });
    y += 82;
    rule(y, 3, BRAND);
    y += 22;

    // Billed to / details
    const lblY = y + 10;
    text('BILLED TO', M, lblY, 11, { color: MUTED, weight: 600 });
    text('INVOICE DETAILS', W - M, lblY, 11, { color: MUTED, weight: 600, align: 'right' });
    let ly = lblY + 20;
    text(o.n, M, ly, 14, { weight: 700 }); ly += 19;
    text(o.p, M, ly, 13.5); ly += 19;
    if (o.em) { text(o.em, M, ly, 13.5); ly += 19; }
    if (del && o.addr) for (const l of wrap(o.addr, 330, 13.5)) { text(l, M, ly, 13.5); ly += 19; }
    let ry = lblY + 20;
    const det = [['Invoice no: ', o.id, true], ['Date: ', istDate(o.ts)], ['Service: ', serve], ['Payment: ', pay]];
    for (const [k, v, b] of det) {
      font(13.5, b ? 700 : 400);
      const vw = g.measureText(v).width;
      text(v, W - M, ry, 13.5, { weight: b ? 700 : 400, align: 'right' });
      text(k, W - M - vw, ry, 13.5, { align: 'right' });
      ry += 19;
    }
    y = Math.max(ly, ry) + 14;

    // Items
    const cols = { n: M + 6, name: M + 36, qty: 500, rate: 620, amt: W - M - 6 };
    const header = () => {
      const hy = y + 14;
      text('#', cols.n, hy, 11, { color: MUTED, weight: 600 });
      text('ITEM', cols.name, hy, 11, { color: MUTED, weight: 600 });
      text('QTY', cols.qty, hy, 11, { color: MUTED, weight: 600, align: 'center' });
      text('RATE', cols.rate, hy, 11, { color: MUTED, weight: 600, align: 'right' });
      text('AMOUNT', cols.amt, hy, 11, { color: MUTED, weight: 600, align: 'right' });
      y += 24;
      rule(y, 2, INK);
      y += 2;
    };
    header();
    o.it.forEach(([id, q], i) => {
      const it = LH.ITEMS.get(id);
      const lines = wrap(it.name, 390, 13.5);
      const rh = 12 + 19 * lines.length;
      if (y + rh > H - M - 60) { newPage(); header(); }
      const by = y + 6 + 14;
      text(String(i + 1), cols.n, by, 13.5, { color: MUTED });
      lines.forEach((l, k) => text(l, cols.name, by + 19 * k, 13.5));
      text(String(q), cols.qty, by, 13.5, { align: 'center' });
      text(LH.fmt(LH.unit(o, id)), cols.rate, by, 13.5, { align: 'right' });
      text(LH.fmt(LH.unit(o, id) * q), cols.amt, by, 13.5, { align: 'right' });
      y += rh;
      rule(y, 1, LINE);
      y += 1;
    });
    y += 8;

    // Totals
    const sums = [['Subtotal', LH.fmt(o.total - fee)]];
    if (del) sums.push(['Delivery charge', o.fee ? LH.fmt(o.fee) : 'Free']);
    sums.push(['GST', 'Not applicable']);
    ensure(sums.length * 24 + 40 + 60);
    for (const [k, v] of sums) {
      text(k, 520, y + 16, 13.5, { color: '#4b5563' });
      text(v, cols.amt, y + 16, 13.5, { align: 'right' });
      y += 24;
    }
    rule(y, 2, INK, 520, W - M);
    text('Total', 520, y + 24, 16, { weight: 700 });
    text(LH.fmt(o.total), cols.amt, y + 24, 16, { weight: 700, align: 'right' });
    y += 42;

    // Words, note
    const tail = [`Amount in words: ${Mail.rupeesInWords(o.total)}`];
    if (o.nt) tail.push(`Note: ${o.nt}`);
    for (const t of tail) {
      for (const l of wrap(t, W - 2 * M, 12.5)) { ensure(20); text(l, M, y + 14, 12.5, { color: '#4b5563' }); y += 18; }
      y += 4;
    }

    // Footer
    ensure(100);
    y += 14;
    rule(y, 1, LINE);
    y += 26;
    text(`Thank you for dining with ${cafe.name}. We look forward to serving you again.`, W / 2, y, 12.5, { weight: 700, align: 'center' });
    text('This is a computer-generated invoice and does not need a signature.', W / 2, y + 20, 12, { color: MUTED, align: 'center' });
    text(`${cafe.phone} · ${cafe.mapLabel}`, W / 2, y + 40, 12, { color: MUTED, align: 'center' });
    return pages;
  }

  const toJpeg = (cv) => new Promise((res, rej) => cv.toBlob((b) => (b ? b.arrayBuffer().then((a) => res({ bytes: new Uint8Array(a), w: cv.width, h: cv.height })) : rej(new Error('encode'))), 'image/jpeg', 0.92));

  function buildPdf(imgs) {
    const enc = new TextEncoder();
    const parts = []; const offs = []; let len = 0;
    const put = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); body(); put('\nendobj\n'); };
    const PW = 595.28, PH = 841.89;
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => put(`<< /Type /Pages /Count ${imgs.length} /Kids [${imgs.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] >>`));
    imgs.forEach((im, i) => {
      const p = 3 + 3 * i;
      obj(p, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`));
      const cs = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
      obj(p + 1, () => put(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
      obj(p + 2, () => {
        put(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`);
        put(im.bytes); put('\nendstream');
      });
    });
    const count = 3 + 3 * imgs.length;
    const xref = len;
    put(`xref\n0 ${count}\n0000000000 65535 f \n`);
    for (let n = 1; n < count; n++) put(`${String(offs[n]).padStart(10, '0')} 00000 n \n`);
    put(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  /* Resolves once the PDF has been handed to the browser's download. */
  async function download(LH, Mail, o, paid) {
    const imgs = await Promise.all(drawPages(LH, Mail, o, paid).map(toJpeg));
    const blob = buildPdf(imgs);
    const name = `Invoice-${o.id}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  window.LHInvoicePdf = { download };
})();
