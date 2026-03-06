function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const clone = new Map();
    seen.set(value, clone);
    value.forEach((v, k) => clone.set(deepClone(k, seen), deepClone(v, seen)));
    return clone;
  }

  if (value instanceof Set) {
    const clone = new Set();
    seen.set(value, clone);
    value.forEach((v) => clone.add(deepClone(v, seen)));
    return clone;
  }

  const result = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, result);

  for (const key of Reflect.ownKeys(value)) {
    result[key] = deepClone(value[key], seen);
  }

  return result;
}
