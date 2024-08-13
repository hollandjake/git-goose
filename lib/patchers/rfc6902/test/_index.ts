/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 This module is prefixed with an underscore so that ava recognizes it as a helper,
 instead of failing the entire test suite with a "No tests found" error.
 */

export function resultName<T extends { name?: string | null }>(result: T | null): string | null | undefined | T {
  return result?.name ?? result;
}

export const hasOwnProperty = Object.prototype.hasOwnProperty;

function isNonPrimitive(value: any): value is object {
  // loose-equality checking for null is faster than strict checking for each of null/undefined/true/false
  // checking null first, then calling typeof, is faster than vice-versa
  return value !== null && typeof value === 'object';
}

/**
 Recursively copy a value.

 @param source - should be a JavaScript primitive, Array, Date, or (plain old) Object.
 @returns copy of source where every Array and Object have been recursively
  reconstructed from their constituent elements
 */
export function clone<T>(source: T): T {
  if (!isNonPrimitive(source)) {
    // short-circuiting is faster than a single return
    return source;
  }
  // x.constructor == Array is the fastest way to check if x is an Array
  if (source.constructor === Array) {
    // construction via imperative for-loop is faster than source.map(arrayVsObject)
    const length = (source as Array<any>).length;
    // setting the Array length during construction is faster than just `[]` or `new Array()`
    const arrayTarget: any = new Array(length);
    for (let i = 0; i < length; i++) {
      arrayTarget[i] = clone(source[i]);
    }
    return arrayTarget;
  }
  // Date
  if (source.constructor === Date) {
    const dateTarget: any = new Date(+source);
    return dateTarget;
  }
  // Object
  const objectTarget: any = {};
  // declaring the variable (with const) inside the loop is faster
  for (const key in source) {
    // hasOwnProperty costs a bit of performance, but it's semantically necessary
    // using a global helper is MUCH faster than calling source.hasOwnProperty(key)
    if (hasOwnProperty.call(source, key)) {
      objectTarget[key] = clone(source[key]);
    }
  }
  return objectTarget;
}
