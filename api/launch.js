// builds the launch transaction: pump.fun create_v2 with holder rewards ON, so the coin's creator is its own
// holder-rewards PDA and every creator fee goes to holders on-chain. Optional quote = any pump.fun meme.
// The launcher's wallet pays and signs; the browser adds the mint keypair's signature. No keys on this server.
const { send, body, sdk } = require('./_util');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req);
    const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = require('@solana/web3.js');
    const { P, conn, online, offline } = sdk();
    const user = new PublicKey(b.user), mint = new PublicKey(b.mint);
    const name = String(b.name || '').trim().slice(0, 32), symbol = String(b.symbol || '').trim().replace(/^\$/, '').slice(0, 10);
    const uri = String(b.uri || '');
    if (!name || !symbol) return send(res, 400, { error: 'name and ticker are required' });
    if (!/^https:\/\//.test(uri)) return send(res, 400, { error: 'metadata is missing' });
    const global = await online.fetchGlobal();
    if (!global.isHolderRewardEnabled) return send(res, 503, { error: 'pump.fun has holder rewards switched off right now, so launches are paused. Try again later.' });
    let q = {};
    if (b.pair && b.pair !== 'SOL') {
      try { q = await online.resolveQuoteMint(new PublicKey(b.pair)); }
      catch (e) { return send(res, 400, { error: 'that meme cannot be a pair right now: ' + String(e.message || e).slice(0, 140) }); }
    }
    const creator = P.holderRewardsPda(mint);
    const ix = await offline.createV2Instruction({ mint, name, symbol, uri, creator, user, mayhemMode: false, holderReward: true,
      quoteMint: q.quoteMint || (b.pair && b.pair !== 'SOL' ? new PublicKey(b.pair) : undefined), quoteTokenProgram: q.quoteTokenProgram, pumpQuote: q.pumpQuote });
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
    const msg = new TransactionMessage({ payerKey: user, recentBlockhash: blockhash, instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 350000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 150000 }), ix] }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    const sim = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true }).catch(e => ({ value: { err: String(e.message) } }));
    if (sim.value && sim.value.err) {
      const logs = (sim.value.logs || []).slice(-4).join(' | ');
      if (!/insufficient|0x1\b/i.test(JSON.stringify(sim.value.err) + logs)) return send(res, 400, { error: 'pump.fun would reject this launch: ' + JSON.stringify(sim.value.err).slice(0, 120), logs: logs.slice(0, 300) });
    }
    send(res, 200, { tx: Buffer.from(tx.serialize()).toString('base64'), creator: creator.toBase58(), lastValidBlockHeight, pair: b.pair || 'SOL' });
  } catch (e) { send(res, 500, { error: String(e.message || e).slice(0, 220) }); }
};
