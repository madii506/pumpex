// metadata: forwards the image and fields to pump.fun's IPFS upload and returns the metadata URI.
const { send, body } = require('./_util');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req);
    const m = /^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i.exec(b.image || '');
    if (!m) return send(res, 400, { error: 'add an image' });
    const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
    const fd = new FormData();
    fd.append('file', new Blob([Buffer.from(m[2], 'base64')], { type: m[1] }), 'image.' + (m[1].split('/')[1] || 'png'));
    fd.append('name', clean(b.name, 32)); fd.append('symbol', clean(b.symbol, 10)); fd.append('description', clean(b.description, 500));
    if (b.twitter) fd.append('twitter', clean(b.twitter, 200)); if (b.telegram) fd.append('telegram', clean(b.telegram, 200));
    fd.append('website', clean(b.website, 200) || 'https://pumpex.vercel.app'); fd.append('showName', 'true');
    const r = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: fd, headers: { 'user-agent': 'Mozilla/5.0 pumpex', origin: 'https://pump.fun', referer: 'https://pump.fun/create' }, signal: AbortSignal.timeout(25000) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
    if (!r.ok || !j || !j.metadataUri) return send(res, 502, { error: 'pump.fun metadata upload failed (' + r.status + ')', detail: t.slice(0, 160) });
    send(res, 200, { uri: j.metadataUri, image: j.metadata && j.metadata.image });
  } catch (e) { send(res, 500, { error: String(e.message || e).slice(0, 200) }); }
};
