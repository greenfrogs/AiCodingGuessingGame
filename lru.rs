use std::collections::HashMap;
const NIL: usize = usize::MAX;
struct Node<K, V> { key: K, val: V, prev: usize, next: usize }
struct LruCache<K, V> { cap: usize, map: HashMap<K, usize>, nodes: Vec<Node<K, V>>, head: usize, tail: usize }

impl<K: Clone + std::hash::Hash + Eq, V> LruCache<K, V> {
    fn new(cap: usize) -> Self { LruCache { cap, map: HashMap::new(), nodes: Vec::new(), head: NIL, tail: NIL } }
    fn get(&mut self, key: &K) -> Option<&V> {
        let idx = *self.map.get(key)?;
        self.detach(idx);
        self.push_front(idx);
        Some(&self.nodes[idx].val)
    }
    fn put(&mut self, key: K, val: V) {
        if let Some(&idx) = self.map.get(&key) {
            self.nodes[idx].val = val;
            self.detach(idx);
            self.push_front(idx);
            return;
        }
        let idx = if self.nodes.len() >= self.cap && self.tail != NIL {
            let old = self.tail;
            self.detach(old);
            self.map.remove(&self.nodes[old].key);
            self.nodes[old] = Node { key: key.clone(), val, prev: NIL, next: NIL };
            self.map.insert(key.clone(), old);
            old
        } else {
            let idx = self.nodes.len();
            self.nodes.push(Node { key: key.clone(), val, prev: NIL, next: NIL });
            self.map.insert(key, idx);
            idx
        };
        self.push_front(idx);
    }
    fn detach(&mut self, idx: usize) {
        let (p, n) = (self.nodes[idx].prev, self.nodes[idx].next);
        if p != NIL { self.nodes[p].next = n; } else { self.head = n; }
        if n != NIL { self.nodes[n].prev = p; } else { self.tail = p; }
    }
    fn push_front(&mut self, idx: usize) {
        self.nodes[idx].prev = NIL;
        self.nodes[idx].next = self.head;
        if self.head != NIL { self.nodes[self.head].prev = idx; }
        self.head = idx;
        if self.tail == NIL { self.tail = idx; }
    }
}
