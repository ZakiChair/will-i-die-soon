# Local lab parser assets

These browser assets are vendored from the npm dependencies locked in
`package-lock.json`:

- PDF.js worker from `pdfjs-dist` 6.2.108.
- OCR worker from `tesseract.js` 7.0.0.
- OCR WebAssembly cores from `tesseract.js-core` 7.0.0.
- English OCR data from `@tesseract.js-data/eng` 1.0.0 (`4.0.0`).

The application loads these paths from its own origin only after a user selects a PDF
or image. Asset requests contain only the fixed worker, WebAssembly, or language-data
path. The selected report and its extracted text are passed to browser APIs and local
workers in memory; neither is included in an asset URL or request body.
Persistent OCR language-data caching is disabled, so the import does not write the
report or OCR support data to IndexedDB.

Corresponding license files are stored beside this document.
