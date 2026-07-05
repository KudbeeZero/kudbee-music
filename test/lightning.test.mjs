// The Lightning adapter's pure core — request shaping + response extraction,
// proven with an injected fetch so no live key or endpoint is needed. The CLI
// half (studio/lightning.mjs main()) is a thin wrapper over these, deliberately
// untested here (same discipline as watchdog.test.mjs / claudeLyricsProvider).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, extractText, generate } from '../studio/lightning.mjs';

test('buildRequest targets the endpoint with a bearer token and a JSON prompt body', () => {
  const { url, init } = buildRequest({ endpoint: 'https://x.litng.ai/predict', apiKey: 'lit_KEY', prompt: 'hello' });
  assert.equal(url, 'https://x.litng.ai/predict');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer lit_KEY');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(init.body), { prompt: 'hello' });
});

test('buildRequest omits Authorization for a public endpoint and honors a custom field + extra params', () => {
  const { init } = buildRequest({ endpoint: 'https://x', prompt: 'hi', field: 'input', extra: { max_tokens: 64 } });
  assert.equal(init.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(init.body), { input: 'hi', max_tokens: 64 });
});

test('buildRequest throws without an endpoint (never a silent no-op that posts nowhere)', () => {
  assert.throws(() => buildRequest({ prompt: 'x' }), /endpoint/);
});

test('buildRequest rejects prototype-pollution field values (__proto__, constructor, prototype)', () => {
  assert.throws(() => buildRequest({ endpoint: 'https://x', prompt: 'x', field: '__proto__' }), /invalid field/);
  assert.throws(() => buildRequest({ endpoint: 'https://x', prompt: 'x', field: 'constructor' }), /invalid field/);
  assert.throws(() => buildRequest({ endpoint: 'https://x', prompt: 'x', field: 'prototype' }), /invalid field/);
});

test('buildRequest filters dangerous keys from extra parameter', () => {
  const { init } = buildRequest({
    endpoint: 'https://x',
    prompt: 'test',
    extra: { __proto__: 'bad', constructor: 'bad', prototype: 'bad', safe_key: 'good' },
  });
  const body = JSON.parse(init.body);
  // Only prompt (the main field) and safe_key should be in the body
  assert.deepEqual(Object.keys(body).sort(), ['prompt', 'safe_key']);
  assert.equal(body.prompt, 'test');
  assert.equal(body.safe_key, 'good');
  // Dangerous keys should never be in the serialized JSON
  assert(!JSON.stringify(body).includes('__proto__'));
  assert(!JSON.stringify(body).includes('prototype'));
});

test('extractText pulls text from the common LitServe / OpenAI-compatible shapes', () => {
  assert.equal(extractText('raw string'), 'raw string');
  assert.equal(extractText({ output: 'a' }), 'a');
  assert.equal(extractText({ generated_text: 'b' }), 'b');
  assert.equal(extractText({ lyrics: 'c' }), 'c');
  assert.equal(extractText({ output: { text: 'nested' } }), 'nested');
  assert.equal(extractText({ choices: [{ text: 'compl' }] }), 'compl');
  assert.equal(extractText({ choices: [{ message: { content: 'chat' } }] }), 'chat');
  assert.equal(extractText({ nope: 1 }), '');
  assert.equal(extractText(null), '');
});

test('generate posts and returns the extracted text via an injected fetch', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, text: async () => JSON.stringify({ output: 'the lyrics' }) };
  };
  const out = await generate({ endpoint: 'https://x/predict', apiKey: 'K', prompt: 'write a hook', fetchImpl });
  assert.equal(out, 'the lyrics');
  assert.equal(calls[0].url, 'https://x/predict');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer K');
  assert.deepEqual(JSON.parse(calls[0].init.body), { prompt: 'write a hook' });
});

test('generate surfaces a server error instead of returning empty', async () => {
  const fetchImpl = async () => ({ ok: false, status: 502, text: async () => 'bad gateway' });
  await assert.rejects(generate({ endpoint: 'https://x', prompt: 'p', fetchImpl }), /502/);
});

test('generate tolerates a plain-text (non-JSON) 200 body', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => 'just some lyrics' });
  const out = await generate({ endpoint: 'https://x', prompt: 'p', fetchImpl });
  assert.equal(out, 'just some lyrics');
});
