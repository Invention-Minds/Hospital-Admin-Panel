import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { concatMap, toArray, catchError, map } from 'rxjs/operators';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { LAB_TEST_SEED, RADIOLOGY_TEST_SEED, CatalogSeedItem } from './investigation-catalog.seed';

export interface SeedResult {
  total: number;
  inserted: number;
  skipped: number;
  failed: number;
  failures: { description: string; error: string }[];
}

/**
 * One-time populator for the lab/radiology catalogs from the paper-form seed.
 * Idempotent: reads the live catalog first and only POSTs descriptions that
 * are missing (case-insensitive match). Re-running after a partial failure is
 * safe — already-inserted rows are skipped.
 *
 * Uses the existing endpoints (POST /investigation/lab-tests, /radiology-tests)
 * via AppointmentConfirmService — no new backend route required.
 *
 * Trigger from an admin action and inspect the SeedResult; this is not wired
 * into normal app flow.
 */
@Injectable({ providedIn: 'root' })
export class InvestigationSeederService {
  constructor(private api: AppointmentConfirmService) {}

  seedLabTests(): Observable<SeedResult> {
    return this.seed(
      LAB_TEST_SEED,
      () => this.api.getLabTests(),
      (item) => this.api.addLabTest(item),
    );
  }

  seedRadiologyTests(): Observable<SeedResult> {
    return this.seed(
      RADIOLOGY_TEST_SEED,
      () => this.api.getRadiologyTests(),
      (item) => this.api.addRadiologyTest(item),
    );
  }

  private seed(
    seedItems: CatalogSeedItem[],
    fetchExisting: () => Observable<any[]>,
    insert: (item: CatalogSeedItem) => Observable<any>,
  ): Observable<SeedResult> {
    return fetchExisting().pipe(
      concatMap((existing) => {
        const have = new Set(
          (existing ?? []).map((t) => (t.description ?? '').trim().toLowerCase()),
        );
        const missing = seedItems.filter(
          (s) => !have.has(s.description.trim().toLowerCase()),
        );
        const skipped = seedItems.length - missing.length;

        const result: SeedResult = {
          total: seedItems.length,
          inserted: 0,
          skipped,
          failed: 0,
          failures: [],
        };

        if (missing.length === 0) {
          return of(result);
        }

        // Insert sequentially so the backend isn't hammered and partial
        // progress survives an error mid-run.
        return from(missing).pipe(
          concatMap((item) =>
            insert(item).pipe(
              map(() => {
                result.inserted++;
                return item;
              }),
              catchError((err) => {
                result.failed++;
                result.failures.push({
                  description: item.description,
                  error: err?.message ?? String(err),
                });
                return of(item);
              }),
            ),
          ),
          toArray(),
          map(() => result),
        );
      }),
    );
  }
}
