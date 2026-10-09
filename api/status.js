// live engine status: pump.fun's global flags (holder rewards, pump-coin pairs), the slot, RPC latency,
// and, with ?pair=<mint>, whether that coin can be a quote for a new coin right now.
const { send, sdk } = require('./_util');
module.exports = async (req, res) => {
  const t0 = Date.now();
  try {
    const { online, conn, P } = sdk();
    const { PublicKey } = require('@solana/web3.js');
    const [g, slot] = await Promise.all([online.fetchGlobal(), conn.getSlot('confirmed')]);
    const out = { ok: true, ms: Date.now() - t0, slot, holderRewards: !!g.isHolderRewardEnabled, maxCurveDepth: g.maxCurveDepth ?? null,
      creatorFeeConfigurable: !!g.creatorFeeConfigurable };
    const pair = new URL(req.url, 'http://x').searchParams.get('pair');
    if (pair && pair !== 'SOL') {
      try { const q = await online.resolveQuoteMint(new PublicKey(pair)); out.pair = { ok: true, pump: !!q.pumpQuote, depth: q.pumpQuote ? q.pumpQuote.depth : 0 }; }
      catch (e) { out.pair = { ok: false, why: String(e.message || e).slice(0, 160) }; }
    }
    send(res, 200, out);
  } catch (e) { send(res, 200, { ok: false, ms: Date.now() - t0, error: String(e.message || e).slice(0, 200) }); }
};
