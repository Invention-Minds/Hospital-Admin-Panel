import type * as echarts from 'echarts';

type EChart = echarts.ECharts;

let libPromise: Promise<typeof echarts> | undefined;

/**
 * Loads ECharts on demand.
 *
 * ECharts is the single heaviest library in the app. Importing it statically put
 * it in the initial bundle, so every user downloaded it before the login screen
 * appeared — even though only the analytics and dashboard screens draw charts.
 * The dynamic import puts it in its own file, fetched the first time a chart is
 * drawn and cached by the browser afterwards.
 */
export function loadECharts(): Promise<typeof echarts> {
  return (libPromise ??= import('echarts'));
}

/**
 * Tracks the ECharts instances a component creates so they can be disposed.
 *
 * ECharts keeps every instance in a global registry until dispose() is called,
 * so charts belonging to destroyed components (or to closed "view more" dialogs,
 * whose DOM is recreated on each open) otherwise hold their canvas and DOM forever.
 *
 * Usage: replace `echarts.init(dom)` with `await this.charts.init(dom)` and call
 * `this.charts.disposeAll()` from ngOnDestroy.
 */
export class EChartsTracker {
  private readonly instances = new Set<EChart>();

  async init(...args: Parameters<typeof echarts.init>): Promise<EChart> {
    const lib = await loadECharts();
    this.disposeDetached();
    const chart = lib.init(...args);
    this.instances.add(chart);
    return chart;
  }

  /** Dispose charts whose container has been removed from the page. */
  disposeDetached(): void {
    this.instances.forEach(chart => {
      if (chart.isDisposed() || !chart.getDom()?.isConnected) {
        if (!chart.isDisposed()) chart.dispose();
        this.instances.delete(chart);
      }
    });
  }

  disposeAll(): void {
    this.instances.forEach(chart => {
      if (!chart.isDisposed()) chart.dispose();
    });
    this.instances.clear();
  }
}
