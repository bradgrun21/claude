# Tesseract.js (vendored)

Reads text from bank-app screenshots, entirely on the phone. Hosted with the app so scanning never depends on a third-party server.

- `tesseract.min.js`, `worker.min.js`: tesseract.js 6.0.1 (Apache-2.0), from npm `tesseract.js@6.0.1`
- `core/`: tesseract.js-core 6.0.0, LSTM builds with and without SIMD, from npm `tesseract.js-core@6.0.0`
- `lang/eng.traineddata`: English, `4.0.0_best_int`, from npm `@tesseract.js-data/eng@1.0.0` (ungzipped)

Loaded lazily, only the first time someone scans.
