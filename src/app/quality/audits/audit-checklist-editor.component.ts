import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QualityAuditService, AuditChecklistItem, AuditGroup } from '../../services/quality-audit.service';
import { QualityService } from '../../services/quality.service';
import { isQualityEditor } from '../quality-access';

/**
 * Checklist builder (Quality Manager) / read-only view (others).
 * Route: /quality/audits/checklists/:id  ('new' creates one).
 * Removing a question that past audits used retires it instead of deleting.
 */
@Component({
  selector: 'app-audit-checklist-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './audit-checklist-editor.component.html',
  styleUrls: ['./audit-checklist-editor.component.css'],
})
export class AuditChecklistEditorComponent implements OnInit, OnDestroy {
  readonly canEdit = isQualityEditor();
  id: number | null = null;
  name = '';
  group: AuditGroup = 'clinical';
  frequency: 'weekly' | 'monthly' | 'quarterly' | null = 'monthly';
  description = '';
  isActive = true;
  items: AuditChecklistItem[] = [];
  qiCodes: string[] = [];
  saving = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  readonly GROUPS: Array<{ value: AuditGroup; label: string }> = [
    { value: 'clinical', label: 'Clinical / infection control / patient safety' },
    { value: 'quality', label: 'Quality & records' },
    { value: 'facility', label: 'Facility & support services' },
  ];

  constructor(private route: ActivatedRoute, private router: Router, private svc: QualityAuditService, private quality: QualityService) {}

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    if (raw && raw !== 'new') {
      this.id = Number(raw);
      this.loading = true;
      this.svc.checklist(this.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          const c = r.data;
          Object.assign(this, { name: c.name, group: c.group, frequency: c.frequency, description: c.description ?? '', isActive: c.isActive });
          this.items = (c.items ?? []).map((i) => ({ ...i }));
          this.loading = false;
        },
        error: (e) => { this.loading = false; this.errorMessage = e?.error?.message || 'Failed to load the checklist'; },
      });
    } else {
      this.addItem();
    }
    if (this.canEdit) {
      this.quality.auditBackedCodes().pipe(takeUntil(this.destroy$)).subscribe({ next: (r) => (this.qiCodes = r.data ?? []), error: () => {} });
    }
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get activeItems(): AuditChecklistItem[] { return this.items.filter((i) => i.isActive); }

  addItem(): void {
    const last = this.activeItems[this.activeItems.length - 1];
    this.items.push({ text: '', section: last?.section ?? null, critical: false, qiCode: last?.qiCode ?? null, isActive: true });
  }
  move(item: AuditChecklistItem, dir: -1 | 1): void {
    const i = this.items.indexOf(item);
    const j = i + dir;
    if (j < 0 || j >= this.items.length) return;
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }
  remove(item: AuditChecklistItem): void {
    // Saved questions are retired (kept for past audits); new ones just disappear.
    if (item.id) item.isActive = false;
    else this.items.splice(this.items.indexOf(item), 1);
  }
  restore(item: AuditChecklistItem): void { item.isActive = true; }

  save(): void {
    if (!this.canEdit || this.saving) return;
    this.errorMessage = '';
    if (this.name.trim().length < 3) { this.errorMessage = 'Give the checklist a name.'; return; }
    const items = this.items.filter((i) => i.id || i.text.trim()).map((i) => ({
      ...(i.id && { id: i.id }), text: i.text.trim(), section: i.section?.trim() || null,
      critical: !!i.critical, qiCode: i.qiCode || null, isActive: i.isActive,
    }));
    if (items.some((i) => i.isActive && i.text.length < 3)) { this.errorMessage = 'Every question needs at least 3 characters.'; return; }
    if (!items.some((i) => i.isActive)) { this.errorMessage = 'Add at least one question.'; return; }
    const body = {
      name: this.name.trim(), group: this.group, frequency: this.frequency,
      description: this.description.trim() || null, isActive: this.isActive, items,
    };
    this.saving = true;
    const req = this.id ? this.svc.updateChecklist(this.id, body) : this.svc.createChecklist(body);
    req.pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.saving = false;
        if (!this.id) { this.router.navigate(['/quality/audits/checklists', r.data.id]); return; }
        this.items = (r.data.items ?? []).map((i) => ({ ...i }));
        this.successMessage = 'Checklist saved.';
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to save'; },
    });
  }
}
