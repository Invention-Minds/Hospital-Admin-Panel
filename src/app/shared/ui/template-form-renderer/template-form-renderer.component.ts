import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FieldDef } from '../../../services/note-template.service';

/**
 * Template form renderer — given a NoteTemplate's `fields[]` and a
 * value-map, renders a dynamic form. Emits value changes upward via
 * `(valuesChange)` so the parent component owns the model and can save it.
 *
 * Used in two places:
 *   • The admin preview pane on /note-templates (read-only-ish — admin tests
 *     the form before publishing).
 *   • The discharge / OPD assessment / doctor manual-notes screens (real
 *     doctor data entry).
 *
 * Field types: see FieldDef.type — text, textarea, number, date, datetime,
 * select, multiselect, checkbox, radio, handwritten.
 */
@Component({
  selector: 'app-template-form-renderer',
  templateUrl: './template-form-renderer.component.html',
  styleUrls: ['./template-form-renderer.component.css'],
})
export class TemplateFormRendererComponent implements OnChanges {
  /** The fields[] from the NoteTemplate.  */
  @Input() fields: FieldDef[] = [];

  /** Current values map keyed by field.key. Two-way bind via `[values]` + `(valuesChange)`. */
  @Input() values: Record<string, unknown> = {};

  /** Disables every input — used post-sign and on the admin preview. */
  @Input() readOnly = false;

  /** Emitted whenever any field's value changes. Parent stores the map. */
  @Output() valuesChange = new EventEmitter<Record<string, unknown>>();

  /** Pre-computed groups for rendering (sorted by group then order). */
  groupedFields: Array<{ group: string; fields: FieldDef[] }> = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      this.groupedFields = groupAndSort(this.fields ?? []);
    }
  }

  // ─── Single-value field bindings ────────────────────────────────────
  setValue(key: string, value: unknown): void {
    if (this.readOnly) return;
    this.values = { ...this.values, [key]: value };
    this.valuesChange.emit(this.values);
  }

  /** Multiselect toggle — flips a single option in/out of the value array. */
  toggleMulti(key: string, option: string, checked: boolean): void {
    if (this.readOnly) return;
    const current = Array.isArray(this.values[key])
      ? [...(this.values[key] as string[])]
      : [];
    const idx = current.indexOf(option);
    if (checked && idx === -1) current.push(option);
    if (!checked && idx !== -1) current.splice(idx, 1);
    this.setValue(key, current);
  }

  isMultiSelected(key: string, option: string): boolean {
    const arr = this.values[key];
    return Array.isArray(arr) && (arr as string[]).includes(option);
  }

  /** Convenience cast for templates so we don't sprinkle `$any()` everywhere. */
  asString(value: unknown): string {
    return value == null ? '' : String(value);
  }

  asBoolean(value: unknown): boolean {
    return value === true || value === 'true';
  }

  /** Used by the handwritten widget — get the data-URL so the canvas pre-fills. */
  asDataUrl(value: unknown): string {
    return typeof value === 'string' && value.startsWith('data:image') ? value : '';
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function groupAndSort(fields: FieldDef[]): Array<{ group: string; fields: FieldDef[] }> {
  // Stable-sort by (group ?? '') then (order ?? 0) then declaration index.
  const indexed = fields.map((f, idx) => ({ ...f, _idx: idx }));
  indexed.sort((a, b) => {
    const ga = a.group ?? '';
    const gb = b.group ?? '';
    if (ga !== gb) return ga.localeCompare(gb);
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    return (a as { _idx: number })._idx - (b as { _idx: number })._idx;
  });

  const map = new Map<string, FieldDef[]>();
  for (const f of indexed) {
    const g = f.group ?? '';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(f);
  }
  return Array.from(map.entries()).map(([group, fields]) => ({ group, fields }));
}
