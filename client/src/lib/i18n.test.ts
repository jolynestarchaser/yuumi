import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../locales/en.json';
import th from '../locales/th.json';
import { translate, useLanguageStore } from './i18n.js';

test('English and Thai catalogs have matching keys and interpolation variables', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(th).sort());
  const variables = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(en)) assert.deepEqual(variables(en[key]), variables(th[key]), key);
});

test('language switching interpolates UI labels and safely preserves unknown content', () => {
  useLanguageStore.getState().setLanguage('en');
  assert.equal(translate('Level'), 'Level');
  assert.equal(translate('Hello, {name}.', { name: 'Joe' }), 'Hello, Joe.');
  useLanguageStore.getState().setLanguage('th');
  assert.notEqual(translate('Level'), 'Level');
  assert.equal(translate('s'), '');
  assert.equal(translate('A user-written note not in the catalog'), 'A user-written note not in the catalog');
  assert.equal(translate('__proto__'), '__proto__');
  assert.equal(translate('constructor'), 'constructor');
});
