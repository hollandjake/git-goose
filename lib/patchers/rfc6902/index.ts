// TODO: make a custom rfc6902 implementation as we can skip a load of formalities
//  npm install rfc6902
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Diff, diffAny, isDestructive, Operation, TestOperation, VoidableDiff } from './diff';
import { apply } from './patch';
import { Pointer } from './pointer';

export { Pointer };

export { Operation, TestOperation };
export type Patch = Operation[];

/**
 Apply a 'application/json-patch+json'-type patch to an object.

 `patch` *must* be an array of operations.

 > Operation objects MUST have exactly one "op" member, whose value
 > indicates the operation to perform.  Its value MUST be one of "add",
 > "remove", "replace", "move", "copy", or "test"; other values are
 > errors.

 This method mutates the target object in-place. in the event of a total replace use the return value

 @returns the mutated object
 */
export function applyPatch(object: any, patch: Operation[]) {
  for (const operation of patch) {
    object = apply(object, operation);
  }
  return object;
}

function wrapVoidableDiff(diff: VoidableDiff): Diff {
  function wrappedDiff(input: any, output: any, ptr: Pointer): Operation[] {
    const custom_patch = diff(input, output, ptr);
    // ensure an array is always returned
    return Array.isArray(custom_patch) ? custom_patch : diffAny(input, output, ptr, wrappedDiff);
  }

  return wrappedDiff;
}

/**
 Produce a 'application/json-patch+json'-type patch to get from one object to
 another.

 This does not alter `input` or `output` unless they have a property getter with
 side-effects (which is not a good idea anyway).

 `diff` is called on each pair of comparable non-primitive nodes in the
 `input`/`output` object trees, producing nested patches. Return `undefined`
 to fall back to default behaviour.

 Returns list of operations to perform on `input` to produce `output`.
 */
export function createPatch(input: any, output: any, diff?: VoidableDiff): Operation[] {
  const ptr = new Pointer();
  // a new Pointer gets a default path of [''] if not specified
  return (diff ? wrapVoidableDiff(diff) : diffAny)(input, output, ptr);
}

/**
 Create a test operation based on `input`'s current evaluation of the JSON
 Pointer `path`; if such a pointer cannot be resolved, returns undefined.
 */
function createTest(input: any, path: string): TestOperation | undefined {
  const endpoint = Pointer.fromJSON(path).evaluate(input);
  if (endpoint !== undefined) return { op: 'test', path, value: endpoint.value };
  return undefined;
}

/**
 Produce an 'application/json-patch+json'-type list of tests, to verify that
 existing values in an object are identical to the those captured at some
 checkpoint (whenever this function is called).

 This does not alter `input` or `output` unless they have a property getter with
 side-effects (which is not a good idea anyway).

 Returns list of test operations.
 */
export function createTests(input: any, patch: Operation[]): TestOperation[] {
  const tests = new Array<TestOperation>();
  patch.filter(isDestructive).forEach(operation => {
    const pathTest = createTest(input, operation.path);
    if (pathTest) tests.push(pathTest);
    if ('from' in operation) {
      const fromTest = createTest(input, operation.from);
      if (fromTest) tests.push(fromTest);
    }
  });
  return tests;
}
