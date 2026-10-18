import { Component } from '@angular/core';
import { OrdersTile, ProductsTile, RevenueTile, VisitorsTile } from './tiles';

const TILES = [RevenueTile, OrdersTile, ProductsTile, VisitorsTile];

/** No boundary anywhere: what Angular 22 does today when one tile throws. */
@Component({
  selector: 'app-plain-dashboard',
  imports: TILES,
  template: `
    <div class="grid">
      <section class="tile"><app-revenue-tile /></section>
      <section class="tile"><app-orders-tile /></section>
      <section class="tile" data-test="products-tile"><app-products-tile /></section>
      <section class="tile"><app-visitors-tile /></section>
    </div>
  `,
})
export class PlainDashboard {}

/** One @boundary per tile. */
@Component({
  selector: 'app-tile-boundary-dashboard',
  imports: TILES,
  template: `
    <div class="grid">
      <section class="tile">
        @boundary {
          <app-revenue-tile />
        } @error {
          <div class="fallback" data-test="fallback">
            <p>This panel couldn't load.</p>
            <button data-test="retry" (click)="$reset()">Retry</button>
          </div>
        }
      </section>
      <section class="tile">
        @boundary {
          <app-orders-tile />
        } @error {
          <div class="fallback" data-test="fallback">
            <p>This panel couldn't load.</p>
            <button data-test="retry" (click)="$reset()">Retry</button>
          </div>
        }
      </section>
      <section class="tile" data-test="products-tile">
        @boundary {
          <app-products-tile />
        } @error {
          <div class="fallback" data-test="fallback">
            <p>This panel couldn't load.</p>
            <button data-test="retry" (click)="$reset()">Retry</button>
          </div>
        }
      </section>
      <section class="tile">
        @boundary {
          <app-visitors-tile />
        } @error {
          <div class="fallback" data-test="fallback">
            <p>This panel couldn't load.</p>
            <button data-test="retry" (click)="$reset()">Retry</button>
          </div>
        }
      </section>
    </div>
  `,
})
export class TileBoundaryDashboard {}

/** One @boundary around the whole grid. */
@Component({
  selector: 'app-page-boundary-dashboard',
  imports: TILES,
  template: `
    @boundary {
      <div class="grid">
        <section class="tile"><app-revenue-tile /></section>
        <section class="tile"><app-orders-tile /></section>
        <section class="tile" data-test="products-tile"><app-products-tile /></section>
        <section class="tile"><app-visitors-tile /></section>
      </div>
    } @error {
      <div class="fallback" data-test="fallback">
        <p>The dashboard couldn't load.</p>
        <button data-test="retry" (click)="$reset()">Retry</button>
      </div>
    }
  `,
})
export class PageBoundaryDashboard {}
