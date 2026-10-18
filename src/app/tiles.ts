import { Component, Injectable, OnDestroy, OnInit, inject, resource, signal } from '@angular/core';
import { SETTINGS } from './failure';

/** Shared state for the healthy tiles, so the tests can see whether the page still updates. */
@Injectable({ providedIn: 'root' })
export class DashboardState {
  readonly orders = signal(128);
  readonly visitors = signal(0);
}

/** How many times the faulty tile has been created. */
@Injectable({ providedIn: 'root' })
export class Attempts {
  count = 0;
}

@Component({
  selector: 'app-revenue-tile',
  template: `<h2>Revenue</h2><p class="big" data-test="revenue">$48,210</p>`,
})
export class RevenueTile {}

@Component({
  selector: 'app-orders-tile',
  template: `
    <h2>Orders</h2>
    <p class="big" data-test="orders">{{ state.orders() }}</p>
    <button data-test="add-order" (click)="state.orders.update((n) => n + 1)">Add order</button>
  `,
})
export class OrdersTile {
  protected readonly state = inject(DashboardState);
}

@Component({
  selector: 'app-visitors-tile',
  template: `<h2>Live visitors</h2><p class="big" data-test="visitors">{{ state.visitors() }}</p>`,
})
export class VisitorsTile implements OnInit, OnDestroy {
  protected readonly state = inject(DashboardState);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.timer = setInterval(() => this.state.visitors.update((n) => n + 1), 200);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }
}

interface Product {
  name: string;
  sold: number;
}

interface ProductStats {
  top?: Product;
  list: Product[];
}

const PRODUCTS: Product[] = [
  { name: 'Desk lamp', sold: 412 },
  { name: 'Standing mat', sold: 380 },
  { name: 'Cable tray', sold: 297 },
];

/** The tile that breaks. Which way it breaks comes from the address bar. */
@Component({
  selector: 'app-products-tile',
  template: `
    <h2>Top products</h2>
    <p class="big" data-test="top-product">{{ stats.top!.name }}</p>
    <ul>
      @for (p of products.value(); track p.name) {
        <li>{{ p.name }} · {{ p.sold }}</li>
      }
    </ul>
    <button data-test="refresh" (click)="refresh()">Refresh</button>
  `,
})
export class ProductsTile implements OnInit {
  private readonly settings = inject(SETTINGS);
  private readonly attempt = ++inject(Attempts).count;
  private readonly failing = this.attempt <= this.settings.times;
  private readonly mode = this.failing ? this.settings.fail : 'none';

  // In 'template' mode the stats arrive without a top product, and the
  // template reads stats.top!.name, as plenty of real templates do.
  protected stats: ProductStats =
    this.mode === 'template' ? { list: PRODUCTS } : { top: PRODUCTS[0], list: PRODUCTS };

  protected readonly products = resource({
    loader: async () => {
      if (this.mode === 'resource') throw new Error('Top products: the API returned 500');
      return PRODUCTS;
    },
    defaultValue: PRODUCTS,
  });

  constructor() {
    if (this.mode === 'ctor') throw new Error('Top products: constructor failed');
  }

  ngOnInit() {
    if (this.mode === 'init') throw new Error('Top products: ngOnInit failed');
    if (this.mode === 'async') {
      setTimeout(() => {
        throw new Error('Top products: async callback failed');
      }, 300);
    }
  }

  refresh() {
    if (this.mode === 'click') throw new Error('Top products: click handler failed');
    this.stats = { ...this.stats };
  }
}
