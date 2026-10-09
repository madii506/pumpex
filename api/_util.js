const RPCS = (process.env.RPC_URL || 'https://solana-rpc.publicnode.com,https://api.mainnet-beta.solana.com').split(',');
function send(res, code, obj) { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); }
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const c = []; for await (const x of req) c.push(x); try { return JSON.parse(Buffer.concat(c).toString() || '{}'); } catch { return {}; }
}
function sdk() {
  const P = require('@pump-fun/pump-sdk');
  const { Connection } = require('@solana/web3.js');
  const conn = new Connection(RPCS[0], 'confirmed');
  return { P, conn, online: new P.OnlinePumpSdk(conn), offline: P.PUMP_SDK || new P.PumpSdk() };
}
module.exports = { send, body, sdk, RPCS };
