import { ErrorDetails, ErrorHandler, Injectable } from '@angular/core';

export interface LoggedError {
  via: 'handleError' | 'onViewError';
  message: string;
  boundary?: string;
}

declare global {
  interface Window {
    errorLog: LoggedError[];
  }
}
window.errorLog = [];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Behaves like the default ErrorHandler (it still prints "ERROR" to the
 * console) and also records what it was given, so the tests can read it.
 */
@Injectable()
export class RecordingErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    window.errorLog.push({ via: 'handleError', message: messageOf(error) });
    super.handleError(error);
  }
}

/** The same, plus the optional onViewError hook that boundaries call instead. */
@Injectable()
export class ViewAwareErrorHandler extends RecordingErrorHandler {
  override onViewError(error: Error, details: ErrorDetails): void {
    window.errorLog.push({
      via: 'onViewError',
      message: error.message,
      boundary: details.boundary?.type.name,
    });
    console.error('Caught by a boundary:', error.message);
  }
}
