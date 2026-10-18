import { InjectionToken } from '@angular/core';

/**
 * How the "Top products" tile breaks, read from the address bar so each
 * Playwright test can open one case:
 *
 *   ?fail=template   the template reads a property of undefined
 *   ?fail=init       ngOnInit throws
 *   ?fail=ctor       the constructor throws
 *   ?fail=click      the Refresh button's handler throws
 *   ?fail=async      a setTimeout callback started in ngOnInit throws
 *   ?fail=resource   a resource() loader rejects and the template reads .value()
 *
 *   &times=1         fail only on the first render, so a retry can succeed
 *   &layout=plain    no boundary (default)
 *   &layout=tiles    one @boundary around each tile
 *   &layout=page     one @boundary around the whole grid
 *   &handler=view    install an ErrorHandler that implements onViewError
 */
export type FailMode = 'none' | 'template' | 'init' | 'ctor' | 'click' | 'async' | 'resource';
export type Layout = 'plain' | 'tiles' | 'page';

export interface DemoSettings {
  fail: FailMode;
  times: number;
  layout: Layout;
  handler: 'default' | 'view';
}

export function readSettings(search: string): DemoSettings {
  const q = new URLSearchParams(search);
  return {
    fail: (q.get('fail') as FailMode) ?? 'none',
    times: Number(q.get('times') ?? Infinity),
    layout: (q.get('layout') as Layout) ?? 'plain',
    handler: q.get('handler') === 'view' ? 'view' : 'default',
  };
}

export const SETTINGS = new InjectionToken<DemoSettings>('demo settings');
