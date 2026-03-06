function minWindow(s, t) {
  const need = {};
  for (const c of t) need[c] = (need[c] || 0) + 1;
  let have = 0;
  const want = Object.keys(need).length;
  let best = "";
  let left = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (need[c] !== undefined) {
      need[c]--;
      if (need[c] === 0) have++;
    }
    while (have === want) {
      if (!best || right - left + 1 < best.length) {
        best = s.slice(left, right + 1);
      }
      const d = s[left++];
      if (need[d] !== undefined) {
        if (need[d] === 0) have--;
        need[d]++;
      }
    }
  }
  return best;
}
