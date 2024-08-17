/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect, test } from 'vitest';

import { Pointer } from '../pointer';
import { clone } from './_index';

test.concurrent('Pointer.fromJSON empty', () => {
  expect(() => Pointer.fromJSON('')).not.toThrow();
});
test.concurrent('Pointer.fromJSON slash', () => {
  expect(() => Pointer.fromJSON('/')).not.toThrow();
});
test.concurrent('Pointer.fromJSON invalid', () => {
  expect(() => Pointer.fromJSON('a'), 'thrown error should have descriptive message').toThrow(/Invalid JSON Pointer/);
});

const example = { bool: false, arr: [10, 20, 30], obj: { a: 'A', b: 'B' } };

test.concurrent('Pointer#get bool', () => {
  expect(Pointer.fromJSON('/bool').get(example), 'should get bool value').toEqual(false);
});
test.concurrent('Pointer#get array', () => {
  expect(Pointer.fromJSON('/arr/1').get(example), 'should get array value').toEqual(20);
});
test.concurrent('Pointer#get object', () => {
  expect(Pointer.fromJSON('/obj/b').get(example), 'should get object value').toEqual('B');
});
test.concurrent('Pointer#push', () => {
  const pointer = Pointer.fromJSON('/obj');
  pointer.push('a');
  expect(pointer.toString(), 'should add token').toBe('/obj/a');
});
test.concurrent('Pointer#get∘push', () => {
  const pointer = Pointer.fromJSON('/obj');
  pointer.push('a');
  expect(pointer.get(example), 'should get object value after adding token').toEqual('A');
});

test.concurrent('Pointer#set bool', () => {
  const input = { bool: true };
  Pointer.fromJSON('/bool').set(input, false);
  expect(input.bool, 'should set bool value in-place').toEqual(false);
});

test.concurrent('Pointer#set array middle', () => {
  const input: any = { arr: ['10', '20', '30'] };
  Pointer.fromJSON('/arr/1').set(input, 0);
  expect(input.arr[1], 'should set array value in-place').toEqual(0);
});

test.concurrent('Pointer#set array beyond', () => {
  const input: any = { arr: ['10', '20', '30'] };
  Pointer.fromJSON('/arr/3').set(input, 40);
  expect(input.arr[3], 'should set array value in-place').toEqual(40);
});

test.concurrent('Pointer#set top-level', () => {
  const input: any = { obj: { a: 'A', b: 'B' } };
  const original = clone(input);
  Pointer.fromJSON('').set(input, { other: { c: 'C' } });
  expect(input, 'should not mutate object for top-level pointer').toEqual(original);
  // You might think, well, why? Why shouldn't we do it and then have a test:
  // t.deepEqual(input, {other: {c: 'C'}}, 'should replace whole object')
  // And true, we could hack that by removing the current properties and setting the new ones,
  // but that only works for the case of object-replacing-object;
  // the following is just as valid (though clearly impossible)...
  Pointer.fromJSON('').set(input, 'root');
  expect(input, 'should not mutate object for top-level pointer').toEqual(original);
  // ...and it'd be weird to have it work for one but not the other.
  // See Issue #92 for more discussion of this limitation / behavior.
});

test.concurrent('Pointer#set object existing', () => {
  const input = { obj: { a: 'A', b: 'B' } };
  Pointer.fromJSON('/obj/b').set(input, 'BBB');
  expect(input.obj.b, 'should set object value in-place').toEqual('BBB');
});

test.concurrent('Pointer#set object new', () => {
  const input: any = { obj: { a: 'A', b: 'B' } };
  Pointer.fromJSON('/obj/c').set(input, 'C');
  expect(input.obj.c, 'should add object value in-place').toEqual('C');
});

test.concurrent('Pointer#set deep object new', () => {
  const input: any = { obj: { subobj: { a: 'A', b: 'B' } } };
  Pointer.fromJSON('/obj/subobj/c').set(input, 'C');
  expect(input.obj.subobj.c, 'should add deep object value in-place').toEqual('C');
});

test.concurrent('Pointer#set not found', () => {
  const input: any = { obj: { a: 'A', b: 'B' } };
  const original = clone(input);
  Pointer.fromJSON('/notfound/c').set(input, 'C');
  expect(input, 'should not mutate object if parent not found').toEqual(original);
  Pointer.fromJSON('/obj/notfound/c').set(input, 'C');
  expect(input, 'should not mutate object if parent not found').toEqual(original);
  Pointer.fromJSON('/notfound/subobj/c').set(input, 'C');
  expect(input, 'should not mutate object if parent not found').toEqual(original);
});
