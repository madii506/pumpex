// which coins pump.fun accepts as a quote ("pair") for a new coin right now, for up to 40 mints at once
const { sdk } = require('./_util');
const cache = new Map();
module.exports = async (req, res) => {
  const mints = (new URL(req.url, 'http://x').searchParams.get('mints') || '').split(',').filter(s => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)).slice(0, 40);
  const out = {};
  try {
    const { online } = sdk(); const { PublicKey } = require('@solana/web3.js');
    let i = 0;
    const worker = async () => {
      while (i < mints.length) {
        const m = mints[i++]; const c = cache.get(m);
        if (c && Date.now() - c.at < 6e5) { out[m] = c.v; continue; }
        let v; try { const q = await online.resolveQuoteMint(new PublicKey(m)); v = { ok: true, pump: !!q.pumpQuote }; }
        catch (e) { v = { ok: false, why: String(e.message || e).replace(/ [1-9A-HJ-NP-Za-km-z]{32,44}/g, '').slice(0, 110) }; }
        cache.set(m, { at: Date.now(), v }); out[m] = v;
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=900');
    res.end(JSON.stringify({ ok: true, pairs: out }));
  } catch (e) { res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 200), pairs: out })); }
};
