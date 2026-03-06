use std::collections::HashMap;

pub struct LruCache<K, V> {
    cap: usize,
    map: HashMap<K, V>,
    order: Vec<K>,
}

impl<K: Eq + std::hash::Hash + Clone, V> LruCache<K, V> {
    pub fn new(cap: usize) -> Self {
        Self { cap, map: HashMap::new(), order: Vec::new() }
    }

    pub fn get(&mut self, key: &K) -> Option<&V> {
        let pos = self.order.iter().position(|k| k == key)?;
        let k = self.order.remove(pos);
        self.order.push(k);
        self.map.get(key)
    }

    pub fn put(&mut self, key: K, value: V) {
        if let Some(pos) = self.order.iter().position(|k| k == &key) {
            self.order.remove(pos);
        } else if self.map.len() >= self.cap {
            let lru = self.order.remove(0);
            self.map.remove(&lru);
        }
        self.order.push(key.clone());
        self.map.insert(key, value);
    }
}
