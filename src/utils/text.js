const decoder = new TextDecoder("utf-8", { fatal: false })

export function isProbablyBinary(bytes) {
  const n = Math.min(bytes.length, 8000)
  for (let i = 0; i < n; i += 1) {
    if (bytes[i] === 0) return true
  }
  return false
}

export function decodeUtf8(bytes) {
  return decoder.decode(bytes)
}

export function extOfPath(path) {
  const base = path.split("/").pop() || path
  const idx = base.lastIndexOf(".")
  if (idx <= 0) return ""
  return base.slice(idx + 1).toLowerCase()
}

export function escapeHtml(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}

export function toTreeText(node) {
  const lines = []

  function walk(n, prefix, isLast) {
    const name = n.path === "" ? "" : n.name
    if (n.path !== "") {
      const connector = prefix === "" ? "" : isLast ? "└── " : "├── "
      lines.push(prefix + connector + name + (n.kind === "dir" ? "/" : ""))
    }

    if (n.kind !== "dir" || !n.children || n.children.length === 0) return

    const nextPrefix = n.path === "" ? "" : prefix + (isLast ? "    " : "│   ")
    const children = n.children
    for (let i = 0; i < children.length; i += 1) {
      walk(children[i], nextPrefix, i === children.length - 1)
      if (n.path === "" && children[i].kind === "dir") lines.push("")
    }
  }

  walk(node, "", true)
  return lines.join("\n").replaceAll("\n\n\n", "\n\n").trim()
}

