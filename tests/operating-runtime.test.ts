import assert from 'node:assert/strict'
import { test } from 'node:test'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

test('adapters invoke native workerd fetch without an incompatible class receiver', { timeout: 60000 }, async () => {
  const compiled = await build({ bundle: true, write: false, format: 'esm', platform: 'browser', stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
    import { FirebasePublisher } from './server/operating/publisher.ts';
    import { MailjetMailer } from './server/operating/mail.ts';
    export default { async fetch() {
      const database = new FirebasePublisher('https://demo.firebaseio.com', async () => 'fake-token');
      const value = await database.read('operating/config');
      await new MailjetMailer('key','secret','admin@example.invalid','https://admin.example.invalid').send('user@example.invalid','a'.repeat(64));
      return Response.json(value.value);
    }};
  ` } })
  let calls = 0
  const runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, script: compiled.outputFiles[0].text, compatibilityDate: '2026-11-08',
    outboundService: async request => {
      calls++
      return request.url.startsWith('https://api.mailjet.') ? Response.json({ Messages: [{ Status: 'success' }] }) : Response.json({ version: 1 }, { headers: { ETag: 'test' } })
    },
  }))
  try {
    const response = await runtime.dispatchFetch('https://test.invalid')
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { version: 1 })
    assert.equal(calls, 2)
  } finally { await runtime.dispose() }
})

test('real workerd accepts all server adapter requests and refuses redirects', { timeout: 60000 }, async () => {
  const compiled = await build({ bundle: true, write: false, format: 'esm', platform: 'browser', stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
    import { serviceAccountToken, firebaseIdentity } from './server/operating/credentials.ts';
    import { FirebasePublisher } from './server/operating/publisher.ts';
    import { MailjetMailer } from './server/operating/mail.ts';
    export default { async fetch() {
      let calls = 0, redirect = false;
      const transport = async (url, init) => {
        // Construct inside workerd: Node's Request accepts redirect:error but
        // Workers rejects it before the provider is contacted.
        const request = new Request(url, init);
        if (request.redirect !== 'manual') throw new Error('Unsafe redirect mode');
        calls++;
        if (redirect) return new Response('', { status: 302, headers: { Location: 'https://other.invalid' } });
        if (request.url.startsWith('https://oauth2.')) return Response.json({ access_token: 'fake', expires_in: 3600 });
        if (request.url.startsWith('https://api.mailjet.')) return Response.json({ Messages: [{ Status: 'success' }] });
        if (request.url.startsWith('https://identitytoolkit.')) return Response.json({ users: [{ localId: 'host' }] });
        return Response.json({ version: 1 }, { headers: { ETag: 'test' } });
      };
      const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
      const bytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
      const credentials = JSON.stringify({ client_email: 'test@demo.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\\n' + btoa(String.fromCharCode(...bytes)) + '\\n-----END PRIVATE KEY-----' });
      const token = serviceAccountToken(credentials, transport);
      await token();
      const db = new FirebasePublisher('https://demo.firebaseio.com', token, transport);
      await db.read('operating/config');
      const mail = new MailjetMailer('key','secret','admin@example.invalid','https://admin.example.invalid',transport);
      await mail.send('user@example.invalid','a'.repeat(64));
      const claims = btoa(JSON.stringify({ aud: 'demo', iss: 'https://securetoken.google.com/demo', sub: 'host', firebase: { sign_in_provider: 'anonymous' } }));
      const identity = firebaseIdentity('demo','public',transport);
      await identity('header.' + claims + '.signature');
      redirect = true;
      let rejected = 0;
      for (const action of [() => serviceAccountToken(credentials, transport)(), () => db.read('operating/config'), () => mail.send('user@example.invalid','a'.repeat(64)), () => identity('header.' + claims + '.signature')]) {
        try { await action(); } catch { rejected++; }
      }
      return Response.json({ calls, rejected });
    }};
  ` } })
  const runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, script: compiled.outputFiles[0].text, compatibilityDate: '2026-11-08' }))
  try {
    const response = await runtime.dispatchFetch('https://test.invalid')
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { calls: 8, rejected: 4 })
  } finally { await runtime.dispose() }
})
