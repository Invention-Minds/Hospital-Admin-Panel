import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;
  let component: EmptyStateComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('renders the primary text', () => {
    component.text = 'No progress notes yet';
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="empty-state-text"]')?.textContent).toContain(
      'No progress notes yet'
    );
  });

  it('renders the default PrimeIcon pi-inbox when no icon override', () => {
    component.text = 'Empty';
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const icon = host.querySelector('[data-testid="empty-state-icon"]');
    expect(icon?.classList).toContain('pi');
    expect(icon?.classList).toContain('pi-inbox');
  });

  it('renders the icon override when provided', () => {
    component.text = 'Something went wrong';
    component.icon = 'pi pi-exclamation-triangle';
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const icon = host.querySelector('[data-testid="empty-state-icon"]');
    expect(icon?.classList).toContain('pi-exclamation-triangle');
    expect(icon?.classList).not.toContain('pi-inbox');
  });

  it('hides secondary text by default and shows it when supplied', () => {
    component.text = 'No data';
    fixture.detectChanges();
    let host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="empty-state-secondary"]')).toBeNull();

    component.secondaryText = 'Try refreshing.';
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="empty-state-secondary"]')?.textContent).toContain(
      'Try refreshing.'
    );
  });
});
