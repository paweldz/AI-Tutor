/* Simple markdown → React for chat bubbles (bold, italic, bullet lists) */

function inlineMd(text) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={match.index} style={{ background: "rgba(0,0,0,0.06)", padding: "1px 4px", borderRadius: 4, fontSize: "0.9em" }}>{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

export function renderMd(text) {
  if (!text) return text;
  const lines = text.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[\-\*]\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\-\*]\s+/, ""));
        i++;
      }
      result.push({ type: "ul", items });
      continue;
    }
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[\.\)]\s+/, ""));
        i++;
      }
      result.push({ type: "ol", items });
      continue;
    }
    result.push({ type: "line", text: line });
    i++;
  }
  return result.map((block, bi) => {
    if (block.type === "ul") return <ul key={bi} style={{ margin: "6px 0", paddingLeft: 20 }}>{block.items.map((item, ii) => <li key={ii} style={{ marginBottom: 3 }}>{inlineMd(item)}</li>)}</ul>;
    if (block.type === "ol") return <ol key={bi} style={{ margin: "6px 0", paddingLeft: 20 }}>{block.items.map((item, ii) => <li key={ii} style={{ marginBottom: 3 }}>{inlineMd(item)}</li>)}</ol>;
    return <span key={bi}>{bi > 0 && "\n"}{inlineMd(block.text)}</span>;
  });
}

export { inlineMd };
