/* eslint-disable @typescript-eslint/no-explicit-any */

export const hasOwnProperty = Object.prototype.hasOwnProperty;

export function objectType(object: any) {
  if (object === undefined) {
    return 'undefined';
  }
  if (object === null) {
    return 'null';
  }
  if (Array.isArray(object)) {
    return 'array';
  }
  return typeof object;
}
