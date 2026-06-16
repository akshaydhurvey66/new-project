# Script Explorer & Editor (Browser-Only)

A mobile-first, single-page web application that lets you load a project as either:

- **ZIP Upload (read-only)**: browse files, view contents, copy, multi-select combine, export all files
- **Folder Select (editable)**: same features + edit and save back to the original files using the File System Access API

## Run Locally

Folder mode requires a secure context. Run a local server (recommended):

```bash
cd /workspace
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/`

## Usage

### Home
- **Upload ZIP**: loads ZIP in memory (read-only)
- **Select Folder**: requests read/write permissions and scans the folder recursively (editable)
- **Copy Structure**: copies a text tree of the entire folder structure

### Single Script
- Tap a file to view its content
- **Copy** respects “Show Line Numbers” and “Show File Name”
- **Save** is available only in folder mode

### Multi File
- Select multiple files with checkboxes
- Combined output updates automatically
- **Copy All** copies the combined output

### All Files
- Automatically combines every readable file
- Download exports:
  - **Markdown (.md)** (recommended default)
  - **Text (.txt)**
  - **XML (.xml)**

## Browser Support Notes

- ZIP mode works in modern browsers.
- Folder mode requires the **File System Access API** (Chromium-based browsers such as Chrome/Edge) and a secure context (https/localhost).

