import { createStore } from "./store.js"
import { createRouter } from "./router.js"
import { mountHome } from "./views/home.js"
import { mountSingle } from "./views/single.js"
import { mountMulti } from "./views/multi.js"
import { mountAll } from "./views/all.js"

const store = createStore({
  mode: null,
  projectName: "",
  root: null,
  structureText: "",
  filesByPath: new Map(),
  filePaths: [],
  selection: new Set(),
  activePath: null,
  viewerOptions: { showLineNumbers: false, showFileName: true },
  busy: false,
  rev: 0,
})

const main = document.getElementById("appMain")
const backBtn = document.getElementById("backBtn")
const viewTitle = document.getElementById("viewTitle")
const modeChip = document.getElementById("modeChip")
const projectName = document.getElementById("projectName")

const navButtons = Array.from(document.querySelectorAll(".app-nav .nav-btn"))

const titles = {
  home: "Home",
  single: "Single Script",
  multi: "Multi File",
  all: "All Files",
}

let cleanup = null
let currentView = "home"

function mountView(view) {
  cleanup?.()
  cleanup = null
  main.innerHTML = ""

  if (view === "home") cleanup = mountHome(main, store)
  else if (view === "single") cleanup = mountSingle(main, store)
  else if (view === "multi") cleanup = mountMulti(main, store)
  else cleanup = mountAll(main, store)
}

function setHeader(st) {
  if (!st.mode) {
    modeChip.textContent = "No project"
    projectName.textContent = ""
    return
  }
  if (st.mode === "zip") modeChip.textContent = "ZIP (read-only)"
  else modeChip.textContent = "Folder (editable)"
  projectName.textContent = st.projectName || ""
}

store.subscribe((st) => setHeader(st))
setHeader(store.getState())

function setView(view, canBack) {
  currentView = view
  viewTitle.textContent = titles[view] || "Home"
  backBtn.disabled = !canBack
  navButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.nav === view))
  mountView(view)
}

const router = createRouter({
  getView: () => currentView,
  setView,
})

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.nav
    if (!v || v === currentView) return
    router.navigate(v, "push")
  })
})

backBtn.addEventListener("click", () => history.back())

if (window.Prism?.plugins?.autoloader) {
  window.Prism.plugins.autoloader.languages_path = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/"
}

