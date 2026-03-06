function minWindow(s, t) {
  if (!s || !t || s.length < t.length) return "";
  const need = {};
  for (const c of t) need[c] = (need[c] || 0) + 1;
  let have = 0;
  const required = Object.keys(need).length;
  const window = {};
  let left = 0;
  let best = "";
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window[c] = (window[c] || 0) + 1;
    if (need[c] !== undefined && window[c] === need[c]) have++;
    while (have === required) {
      const sub = s.slice(left, right + 1);
      if (!best || sub.length < best.length) best = sub;
      const lc = s[left];
      window[lc]--;
      if (need[lc] !== undefined && window[lc] < need[lc]) have--;
      left++;
    }
  }
  return best;
}
