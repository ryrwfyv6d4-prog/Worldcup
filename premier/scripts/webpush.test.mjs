// Goal alerts are encrypted to each phone's key (RFC 8291) and signed with
// the server's key (RFC 8292). If either is wrong the push services drop the
// message without a word, so both are checked here against an independent
// implementation written with node:crypto rather than WebCrypto.
import crypto from 'node:crypto';
import { encrypt, vapidToken, makeVapidKeys, b64u } from '../../worker/src/webpush.js';

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', name, extra); } };
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();

// The phone's side of RFC 8291, done the long way
function decrypt(body, ua, auth) {
  const salt = body.subarray(0, 16);
  const rs = body.readUInt32BE(16);
  const idlen = body[20];
  const asPublic = body.subarray(21, 21 + idlen);
  const ct = body.subarray(21 + idlen);
  const ecdh = ua.computeSecret(asPublic);
  const prkKey = hmac(auth, ecdh);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPublic, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return { rs, idlen, text: plain.subarray(0, plain.lastIndexOf(2)).toString() };
}

console.log('— message encryption —');
const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
const auth = crypto.randomBytes(16);
const msg = JSON.stringify({ title: '⚽ Goal, Man City', body: 'Man City 2–1 Arsenal · 63\' · yours!' });
const body = Buffer.from(await encrypt(msg, b64u.enc(ua.getPublicKey()), b64u.enc(auth)));
const out = decrypt(body, ua, auth);
check('decrypts to the same message', out.text === msg, out.text);
check('record size 4096', out.rs === 4096);
check('key id is an uncompressed P-256 point', out.idlen === 65 && body[21] === 4);
const again = Buffer.from(await encrypt(msg, b64u.enc(ua.getPublicKey()), b64u.enc(auth)));
check('fresh salt and key every time', !again.subarray(0, 16).equals(body.subarray(0, 16)));

console.log('— server signature —');
const keys = await makeVapidKeys();
const jwt = await vapidToken('https://web.push.apple.com/QGuQyavXutnMH6...', keys, 'https://example.org/');
const [h, c, s] = jwt.split('.');
const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
check('audience is the push service origin', claims.aud === 'https://web.push.apple.com');
check('expires within 24h', claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 86400);
check('ES256 header', JSON.parse(Buffer.from(h, 'base64url').toString()).alg === 'ES256');
const pub = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: keys.jwk.x, y: keys.jwk.y }, format: 'jwk' });
check('signature verifies against the public key',
  crypto.verify('sha256', Buffer.from(`${h}.${c}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
check('public key is 65 raw bytes', b64u.dec(keys.publicKey).length === 65);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
