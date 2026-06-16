import { extOfPath } from "../utils/text.js"

function ensureDir(parent, name, path) {
  let found = parent.children.find((c) => c.kind === "dir" && c.name === name)
  if (found) return found
  found = { kind: "dir", name, path, children: [] }
  parent.children.push(found)
  return found
}

function addFile(parent, name, path) {
  parent.children.push({ kind: "file", name, path })
}

function sortTree(node) {
  if (node.kind !== "dir" || !node.children) return
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const c of node.children) sortTree(c)
}

export async function loadZipProject(file, onProgress) {
  const zip = await window.JSZip.loadAsync(file)
  const root = { kind: "dir", name: "", path: "", children: [] }
  const filesByPath = new Map()
  const filePaths = []

  const names = Object.keys(zip.files).filter((p) => !zip.files[p].dir)
  names.sort((a, b) => a.localeCompare(b))

  for (let i = 0; i < names.length; i += 1) {
    const path = names[i]
    const parts = path.split("/").filter(Boolean)
    let cur = root
    let rel = ""
    for (let j = 0; j < parts.length - 1; j += 1) {
      rel = rel ? rel + "/" + parts[j] : parts[j]
      cur = ensureDir(cur, parts[j], rel)
    }
    addFile(cur, parts[parts.length - 1], path)

    const entry = zip.file(path)
    const size = entry?._data?.uncompressedSize
    filesByPath.set(path, {
      path,
      name: parts[parts.length - 1],
      ext: extOfPath(path),
      size: typeof size === "number" ? size : undefined,
      isBinary: null,
      text: undefined,
      handle: undefined,
      readBytes: async () => {
        const e = zip.file(path)
        if (!e) return new Uint8Array()
        return e.async("uint8array")
      },
    })
    filePaths.push(path)

    if (i % 120 === 0) {
      onProgress?.({ phase: "indexing", current: i + 1, total: names.length })
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  sortTree(root)
  onProgress?.({ phase: "ready", current: names.length, total: names.length })
  return { mode: "zip", projectName: file.name, root, filesByPath, filePaths }
}

