// Lets the specs read the log that src/app/error-handlers.ts keeps on window.
interface Window {
  errorLog: { via: 'handleError' | 'onViewError'; message: string; boundary?: string }[];
}
