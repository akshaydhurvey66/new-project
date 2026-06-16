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

async function* walkDir(dirHandle, prefix) {
  for await (const [name, handle] of dirHandle.entries()) {
    const path = prefix ? prefix + "/" + name : name
    if (handle.kind === "directory") {
      yield { kind: "directory", name, path, handle }
      yield* walkDir(handle, path)
    } else {
      yield { kind: "file", name, path, handle }
    }
  }
}

export async function loadFolderProject(dirHandle, onProgress) {
  const root = { kind: "dir", name: "", path: "", children: [] }
  const filesByPath = new Map()
  const filePaths = []

  let n = 0
  for await (const item of walkDir(dirHandle, "")) {
    n += 1
    if (item.kind === "directory") {
      const parts = item.path.split("/").filter(Boolean)
      let cur = root
      let rel = ""
      for (const part of parts) {
        rel = rel ? rel + "/" + part : part
        cur = ensureDir(cur, part, rel)
      }
      continue
    }

    const parts = item.path.split("/").filter(Boolean)
    let cur = root
    let rel = ""
    for (let j = 0; j < parts.length - 1; j += 1) {
      rel = rel ? rel + "/" + parts[j] : parts[j]
      cur = ensureDir(cur, parts[j], rel)
    }
    addFile(cur, parts[parts.length - 1], item.path)

    filesByPath.set(item.path, {
      path: item.path,
      name: item.name,
      ext: extOfPath(item.path),
      size: undefined,
      isBinary: null,
      text: undefined,
      handle: item.handle,
      readBytes: async () => {
        const f = await item.handle.getFile()
        const buf = await f.arrayBuffer()
        return new Uint8Array(buf)
      },
    })
    filePaths.push(item.path)

    if (n % 160 === 0) {
      onProgress?.({ phase: "scanning", current: n, total: null })
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  filePaths.sort((a, b) => a.localeCompare(b))
  sortTree(root)
  onProgress?.({ phase: "ready", current: filePaths.length, total: filePaths.length })
  return { mode: "folder", projectName: dirHandle.name || "Folder", root, filesByPath, filePaths }
}

