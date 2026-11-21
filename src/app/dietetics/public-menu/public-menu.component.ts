import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { DieteticsService, PublicMenu, PublicMenuCell } from '../../services/dietetics.service';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIET_KEY = 'dm-public-menu-diet';

/**
 * Public weekly menu — opened from the "Scan to see the menu" QR poster.
 * Route: /menu (no login, no app shell). `?diet=CODE` preselects a diet.
 */
@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-menu.component.html',
  styleUrls: ['./public-menu.component.css'],
})
export class PublicMenuComponent implements OnInit {
  menu: PublicMenu | null = null;
  loading = true;
  errorMessage = '';

  readonly today = new Date().getDay();
  day = this.today;
  dietId = '';

  constructor(private svc: DieteticsService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.svc.getPublicMenu().subscribe({
      next: (m) => {
        this.menu = m;
        this.loading = false;
        this.dietId = this.pickDiet(m);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'The menu could not be loaded. Please check your connection and try again.';
      },
    });
  }

  private pickDiet(m: PublicMenu): string {
    const code = (this.route.snapshot.queryParamMap.get('diet') || '').toLowerCase();
    const byCode = code && m.diets.find((d) => d.code.toLowerCase() === code);
    if (byCode) return byCode.id;
    let saved = '';
    try { saved = localStorage.getItem(DIET_KEY) || ''; } catch { /* private mode */ }
    if (saved && m.diets.some((d) => d.id === saved)) return saved;
    return m.diets[0]?.id ?? '';
  }

  /** Days in order starting from today, so "Today" and "Tomorrow" come first. */
  get days(): Array<{ day: number; label: string; sub: string }> {
    return [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const day = (this.today + i) % 7;
      return { day, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_SHORT[day], sub: i < 2 ? DAY_SHORT[day] : '' };
    });
  }

  get dayName(): string { return DAY_LONG[this.day]; }

  get diet() { return this.menu?.diets.find((d) => d.id === this.dietId) ?? null; }

  setDiet(id: string): void {
    this.dietId = id;
    try { localStorage.setItem(DIET_KEY, id); } catch { /* private mode */ }
  }

  /** Meal times with what this diet gets on the chosen day. */
  get meals(): Array<{ id: string; name: string; time: string; cell: PublicMenuCell | null; state: 'past' | 'now' | 'next' | '' }> {
    if (!this.menu || !this.diet) return [];
    const cells = this.diet.cells.filter((c) => c.day === this.day);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    let nextMarked = false;
    return this.menu.slots.map((s) => {
      let state: 'past' | 'now' | 'next' | '' = '';
      if (this.day === this.today) {
        const start = mins(s.startTime), end = mins(s.endTime);
        if (nowMin > end) state = 'past';
        else if (nowMin >= start) { state = 'now'; nextMarked = true; }
        else if (!nextMarked) { state = 'next'; nextMarked = true; }
      }
      return {
        id: s.id, name: s.name, time: `${this.clock(s.startTime)} – ${this.clock(s.endTime)}`,
        cell: cells.find((c) => c.slotId === s.id) ?? null, state,
      };
    });
  }

  /** "13:30" → "1:30 PM" — easier for patients and families. */
  clock(t: string): string {
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h)) return t;
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ap}`;
  }

  trackId(_: number, x: { id: string }): string { return x.id; }
}
