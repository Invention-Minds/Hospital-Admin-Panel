import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 0 — Feature-flag service.
 *
 * Loads all flags once on app boot via `loadAll()` (call from a top-level
 * APP_INITIALIZER or in your auth shell after login). Subsequently `isOn()`
 * is synchronous and cheap, suitable for *ngIf bindings.
 *
 * Server-side authority is `/api/feature-flag`; this client cache is for
 * convenience only and refreshes on every page reload.
 */

export interface FeatureFlag {
  id: number;
  flagKey: string;
  description: string;
  enabled: boolean;
  rolloutScope: string; // "global" | "role:doctor" | "ward:icu-1" | comma-list
  updatedBy?: string | null;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private apiUrl = `${environment.apiUrl}/feature-flag`;
  private cache = new Map<string, FeatureFlag>();
  private loaded = false;

  /** Stream of (key → flag) updates for components that want live reactivity. */
  private flags$ = new BehaviorSubject<Map<string, FeatureFlag>>(new Map());
  readonly flags = this.flags$.asObservable();

  constructor(private http: HttpClient) {}

  /** Load all flags once. Idempotent — subsequent calls are no-ops unless force=true. */
  loadAll(force = false): Observable<FeatureFlag[]> {
    if (this.loaded && !force) {
      return of(Array.from(this.cache.values()));
    }
    return this.http.get<FeatureFlag[]>(this.apiUrl).pipe(
      tap((flags) => {
        this.cache.clear();
        flags.forEach((f) => this.cache.set(f.flagKey, f));
        this.loaded = true;
        this.flags$.next(new Map(this.cache));
      }),
      catchError((err) => {
        // If flags can't load, fail closed (everything off). Don't block the app.
        console.warn('[feature-flag] failed to load flags; defaulting all OFF', err);
        this.loaded = true;
        return of([] as FeatureFlag[]);
      })
    );
  }

  /**
   * Synchronous flag check. Defaults to false (off) if the flag is unknown
   * or the cache hasn't loaded yet.
   *
   * For role/ward scope checks, pass the relevant context.
   */
  isOn(
    flagKey: string,
    context?: { role?: string; wardCode?: string }
  ): boolean {
    const flag = this.cache.get(flagKey);
    if (!flag || !flag.enabled) return false;
    if (!flag.rolloutScope || flag.rolloutScope === 'global') return true;

    // rolloutScope can be a comma-separated list of `role:X` / `ward:Y` clauses.
    const clauses = flag.rolloutScope.split(',').map((s) => s.trim().toLowerCase());
    return clauses.some((clause) => {
      if (clause === 'global') return true;
      if (clause.startsWith('role:') && context?.role) {
        return clause.slice(5) === context.role.toLowerCase();
      }
      if (clause.startsWith('ward:') && context?.wardCode) {
        return clause.slice(5) === context.wardCode.toLowerCase();
      }
      return false;
    });
  }

  /** Single-flag fetch (always hits the server). */
  getFlag(flagKey: string): Observable<FeatureFlag> {
    return this.http.get<FeatureFlag>(`${this.apiUrl}/${flagKey}`);
  }

  /** Admin-only: toggle a flag. */
  updateFlag(flagKey: string, patch: Partial<FeatureFlag>): Observable<FeatureFlag> {
    return this.http.patch<FeatureFlag>(`${this.apiUrl}/${flagKey}`, patch).pipe(
      tap((updated) => {
        this.cache.set(updated.flagKey, updated);
        this.flags$.next(new Map(this.cache));
      })
    );
  }

  /** Admin-only: create a new flag. */
  createFlag(flag: Pick<FeatureFlag, 'flagKey' | 'description'> & Partial<FeatureFlag>): Observable<FeatureFlag> {
    return this.http.post<FeatureFlag>(this.apiUrl, flag).pipe(
      tap((created) => {
        this.cache.set(created.flagKey, created);
        this.flags$.next(new Map(this.cache));
      })
    );
  }

  /** Snapshot of all currently cached flags. */
  all(): FeatureFlag[] {
    return Array.from(this.cache.values());
  }

  /** Reset cache — used by tests and the admin "Reload" button. */
  reset(): void {
    this.cache.clear();
    this.loaded = false;
    this.flags$.next(new Map());
  }
}
