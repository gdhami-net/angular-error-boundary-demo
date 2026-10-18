import { Component, inject } from '@angular/core';
import { PageBoundaryDashboard, PlainDashboard, TileBoundaryDashboard } from './dashboards';
import { SETTINGS } from './failure';

@Component({
  selector: 'app-root',
  imports: [PlainDashboard, TileBoundaryDashboard, PageBoundaryDashboard],
  styleUrl: './app.css',
  template: `
    <h1>Sales dashboard</h1>
    <p class="mode" data-test="mode">fail={{ settings.fail }} · layout={{ settings.layout }}</p>
    @switch (settings.layout) {
      @case ('tiles') { <app-tile-boundary-dashboard /> }
      @case ('page') { <app-page-boundary-dashboard /> }
      @default { <app-plain-dashboard /> }
    }
  `,
})
export class App {
  protected readonly settings = inject(SETTINGS);
}
