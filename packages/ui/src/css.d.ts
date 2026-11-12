// TypeScript 7 (native `tsc`) no longer tolerates side-effect imports of
// non-TS files the way TS 5's `moduleResolution: bundler` did: without a
// declaration, `import "./styles/tokens.css"` fails with TS2882. This ambient
// declaration covers the package's CSS side-effect import in `src/index.ts`.
// (CSS is still bundled by the consuming app's bundler, not by `tsc`.)
declare module "*.css";
