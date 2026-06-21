// Ambient declarations for non-JS imports handled by Bun's bundler.
declare module "*.html" {
  const content: unknown;
  export default content;
}
declare module "*.css";
