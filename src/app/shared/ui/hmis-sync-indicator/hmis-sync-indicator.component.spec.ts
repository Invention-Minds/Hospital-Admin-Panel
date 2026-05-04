import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { HmisSyncIndicatorComponent } from './hmis-sync-indicator.component';

describe('HmisSyncIndicatorComponent', () => {
  let fixture: ComponentFixture<HmisSyncIndicatorComponent>;
  let component: HmisSyncIndicatorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [HmisSyncIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HmisSyncIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('renders "Sync pending" with the muted pending icon when hmisId is null', () => {
    component.hmisId = null;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hmis-sync--pending')).not.toBeNull();
    expect(host.querySelector('.hmis-sync--synced')).toBeNull();
    expect(host.querySelector('[data-testid="hmis-sync-label"]')?.textContent).toContain('Sync pending');
    expect(host.querySelector('[data-testid="hmis-sync-icon"]')?.classList).toContain('pi-circle');
  });

  it('renders "Synced · <prefix>-<id>" when hmisId does not already carry the prefix', () => {
    component.hmisId = '7';
    component.prefix = 'HMIS-LAMA';
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hmis-sync--synced')).not.toBeNull();
    expect(host.querySelector('[data-testid="hmis-sync-label"]')?.textContent).toContain('Synced · HMIS-LAMA-7');
    expect(host.querySelector('[data-testid="hmis-sync-icon"]')?.classList).toContain('pi-check-circle');
  });

  it('does not double the prefix when hmisId already starts with it (case-insensitive)', () => {
    component.hmisId = 'HMIS-MLC-999';
    component.prefix = 'HMIS-MLC';
    fixture.detectChanges();
    const label = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="hmis-sync-label"]');
    expect(label?.textContent).toContain('Synced · HMIS-MLC-999');
    expect(label?.textContent).not.toContain('HMIS-MLC-HMIS-MLC');
  });

  it('respects the small size variant', () => {
    component.hmisId = '42';
    component.prefix = 'HMIS-DAMA';
    component.size = 'small';
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hmis-sync--small')).not.toBeNull();
    // Copy is unchanged between sizes
    expect(host.querySelector('[data-testid="hmis-sync-label"]')?.textContent).toContain('Synced · HMIS-DAMA-42');
  });
});
