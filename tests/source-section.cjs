// Locate code boundaries without coupling behavior tests to formatting.
// Missing boundaries must fail loudly instead of accidentally slicing at -1.
function sourceIndex(source, snippet, from = 0) {
  const tokens = snippet.match(/[A-Za-z_$][\w$]*|\d+|[^\s]/g) || [];
  const pattern = tokens
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s*");
  const match = new RegExp(pattern).exec(source.slice(from));
  if (!match) throw new Error(`Source boundary not found: ${snippet}`);
  return from + match.index;
}

module.exports = { sourceIndex };
