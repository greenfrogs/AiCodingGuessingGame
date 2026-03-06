function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (Array.isArray(value)) {
    const clonedArray = [];
    seen.set(value, clonedArray);
    for (let i = 0; i < value.length; i++) {
      clonedArray[i] = deepClone(value[i], seen);
    }
    return clonedArray;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  const clonedObj = Object.create(Object.getPrototypeOf(value));
  seen.set(value, clonedObj);
  for (const key of Object.keys(value)) {
    clonedObj[key] = deepClone(value[key], seen);
  }
  return clonedObj;
}
