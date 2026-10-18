import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { RecordingErrorHandler, ViewAwareErrorHandler } from './error-handlers';
import { SETTINGS, readSettings } from './failure';

const settings = readSettings(window.location.search);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: SETTINGS, useValue: settings },
    {
      provide: ErrorHandler,
      useClass: settings.handler === 'view' ? ViewAwareErrorHandler : RecordingErrorHandler,
    },
  ],
};
