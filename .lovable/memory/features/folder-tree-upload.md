---
name: Folder Tree Upload
description: Files page "Upload folder" — recursive webkitdirectory/drag-drop ingest of nested artwork photo folders, folder name kept as label
type: feature
---

- Users never have to flatten or zip a nested photo archive. `FolderUploadDialog` (`src/components/FolderUploadDialog.tsx`) reads a whole tree via `webkitdirectory` (Choose folder) or a dropped directory (`webkitGetAsEntry` recursion in `readDroppedItems`).
- Subfolders are named `"<line number> - <Title>"` (e.g. `1 - Harlem`). `parseFolderName` splits that into `folder_number` + `folder_label`; both are stored on `user_uploads` together with `folder_path` (path relative to the chosen root).
- Files land in the unlinked image library; the Files list shows `Folder: 1 - Harlem` as the linked title and `folder_label` as caption so it is searchable.
- Upload queue: 4 parallel workers, per-file quota check via `uploadOptimizedImage`, web derivatives generated, progress bar, and resume — completed relative paths are persisted in `localStorage` under `garf.folderUpload.done.<userId>` and skipped on the next run. `QuotaExceededError` stops the whole run with a clear toast.
- Junk filtered on read: `__MACOSX/`, `._*`, `.DS_Store`, dotfiles, and non-image files.
