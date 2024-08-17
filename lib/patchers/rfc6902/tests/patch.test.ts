import { expect, test } from 'vitest';
import { applyPatch } from '../index';

import { MissingError } from '../patch';

test.concurrent('broken add', () => {
  const user = { id: 'chbrown' };
  expect(() => applyPatch(user, [{ op: 'add', path: '/a/b', value: 1 }])).toThrow(MissingError);
});

test.concurrent('broken remove', () => {
  const user = { id: 'chbrown' };
  expect(() => applyPatch(user, [{ op: 'remove', path: '/name' }])).toThrow(MissingError);
});

test.concurrent('broken replace', () => {
  const user = { id: 'chbrown' };
  expect(() => applyPatch(user, [{ op: 'replace', path: '/name', value: 1 }])).toThrow(MissingError);
});

test.concurrent('broken replace (array)', () => {
  const users = [{ id: 'chbrown' }];
  expect(() => applyPatch(users, [{ op: 'replace', path: '/1', value: { id: 'chbrown2' } }])).toThrow(MissingError);
});

test.concurrent('broken move (from)', () => {
  const user = { id: 'chbrown' };
  expect(() => applyPatch(user, [{ op: 'move', from: '/name', path: '/id' }])).toThrow(MissingError);
});

test.concurrent('broken move (path)', () => {
  const user = { id: 'chbrown' };
  expect(() => applyPatch(user, [{ op: 'move', from: '/id', path: '/a/b' }])).toThrow(MissingError);
});

test.concurrent('broken copy (from)', () => {
  const user = { id: 'chbrown' };
  expect(() => applyPatch(user, [{ op: 'copy', from: '/name', path: '/id' }])).toThrow(MissingError);
});

test.concurrent('broken copy (path)', () => {
  const user = { id: 'chbrown' };
  expect(() => applyPatch(user, [{ op: 'copy', from: '/id', path: '/a/b' }])).toThrow(MissingError);
});
