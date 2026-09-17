import * as echarts from 'echarts';

type EChart = ReturnType<typeof echarts.init>;

/**
 * Tracks the ECharts instances a component creates so they can be disposed.
 *
 * ECharts keeps every instance in a global registry until dispose() is called,
 * so charts belonging to destroyed components (or to closed "view more" dialogs,
 * whose DOM is recreated on each open) otherwise hold their canvas and DOM forever.
 *
 * Usage: replace `echarts.init(dom)` with `this.charts.init(dom)` and call
 * `this.charts.disposeAll()` from ngOnDestroy.
 */
export class EChartsTracker {
  private readonly instances = new Set<EChart>();

  init(...args: Parameters<typeof echarts.init>): EChart {
    this.disposeDetached();
    const chart = echarts.init(...args);
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
