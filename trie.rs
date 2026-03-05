use std::collections::HashMap;

struct TrieNode {
    children: HashMap<char, TrieNode>,
    is_end: bool,
}

impl TrieNode {
    fn new() -> Self {
        Self {
            children: HashMap::new(),
            is_end: false,
        }
    }
}

pub struct Trie {
    root: TrieNode,
}

impl Trie {
    pub fn new() -> Self {
        Self {
            root: TrieNode::new(),
        }
    }

    pub fn insert(&mut self, word: &str) {
        let mut node = &mut self.root;
        for c in word.chars() {
            node = node.children.entry(c).or_insert_with(TrieNode::new);
        }
        node.is_end = true;
    }

    pub fn contains(&self, word: &str) -> bool {
        self.find_node(word).map_or(false, |n| n.is_end)
    }

    pub fn starts_with(&self, prefix: &str) -> bool {
        self.find_node(prefix).is_some()
    }

    fn find_node(&self, s: &str) -> Option<&TrieNode> {
        let mut node = &self.root;
        for c in s.chars() {
            node = node.children.get(&c)?;
        }
        Some(node)
    }
}

impl Default for Trie {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trie() {
        let mut t = Trie::new();
        t.insert("apple");
        t.insert("app");
        assert!(t.contains("app"));
        assert!(t.contains("apple"));
        assert!(!t.contains("ap"));
        assert!(t.starts_with("ap"));
        assert!(t.starts_with("app"));
        assert!(!t.starts_with("b"));
    }
}
