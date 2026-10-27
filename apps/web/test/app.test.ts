import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { App } from '../src/App.js';

test('web shell presents a truthful empty state with accessible landmarks and skip navigation', () => {
  const dom = new JSDOM(renderToStaticMarkup(createElement(App)));
  const document = dom.window.document;
  assert.equal(document.querySelectorAll('h1').length, 1);
  assert.equal(document.querySelector('h1')?.textContent, 'Secure local connection');
  const skip = document.querySelector('a');
  assert.equal(skip?.getAttribute('href'), '#main');
  assert.equal(document.querySelector('main')?.id, 'main');
  assert.equal(document.querySelector('main')?.tabIndex, -1);
  assert.ok(document.querySelector('header'));
  assert.ok(document.querySelector('footer'));
  assert.match(document.body.textContent ?? '', /No agents are connected and no tasks are running/);
  assert.match(document.body.textContent ?? '', /Disconnected/);
  assert.equal(document.querySelectorAll('button').length, 2);
  assert.equal(document.querySelectorAll('input, form').length, 0);
  dom.window.close();
});

test('HTML entry point declares English, a descriptive title and responsive viewport', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html);
  assert.equal(dom.window.document.documentElement.lang, 'en');
  assert.equal(dom.window.document.title, 'OrbiGuild — Local Connection');
  assert.match(dom.window.document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '', /width=device-width/);
  dom.window.close();
});
