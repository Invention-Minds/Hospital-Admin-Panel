import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConfirmDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
  });

  it('renders title, message, and button labels when visible', () => {
    component.visible = true;
    component.title = 'Discard unsaved changes?';
    component.message = 'You have unsaved progress notes. Leave anyway?';
    component.confirmLabel = 'Discard';
    component.cancelLabel = 'Keep editing';
    component.severity = 'danger';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="confirm-scrim"]')).not.toBeNull();
    expect(host.querySelector('.confirm-header__title')?.textContent).toContain(
      'Discard unsaved changes?'
    );
    expect(host.querySelector('.confirm-body__message')?.textContent).toContain(
      'You have unsaved progress notes. Leave anyway?'
    );
    expect(host.querySelector('[data-testid="confirm-cancel"]')?.textContent?.trim()).toBe(
      'Keep editing'
    );
    expect(host.querySelector('[data-testid="confirm-confirm"]')?.textContent?.trim()).toBe(
      'Discard'
    );
    expect(host.querySelector('.confirm-header--danger')).not.toBeNull();
  });

  it('renders nothing when visible=false', () => {
    component.visible = false;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="confirm-scrim"]')).toBeNull();
  });

  it('emits confirm + visibleChange(false) when confirm button clicked', () => {
    component.visible = true;
    fixture.detectChanges();

    const confirmSpy = spyOn(component.confirm, 'emit');
    const visibleSpy = spyOn(component.visibleChange, 'emit');

    const btn = fixture.debugElement.query(By.css('[data-testid="confirm-confirm"]'));
    btn.triggerEventHandler('click');

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(visibleSpy).toHaveBeenCalledWith(false);
    expect(component.visible).toBe(false);
  });

  it('emits cancel + visibleChange(false) when cancel button clicked', () => {
    component.visible = true;
    fixture.detectChanges();

    const cancelSpy = spyOn(component.cancel, 'emit');
    const visibleSpy = spyOn(component.visibleChange, 'emit');

    const btn = fixture.debugElement.query(By.css('[data-testid="confirm-cancel"]'));
    btn.triggerEventHandler('click');

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(visibleSpy).toHaveBeenCalledWith(false);
  });

  it('emits cancel when close (X) button clicked — routes through onCancel', () => {
    component.visible = true;
    fixture.detectChanges();

    const cancelSpy = spyOn(component.cancel, 'emit');
    const confirmSpy = spyOn(component.confirm, 'emit');

    const btn = fixture.debugElement.query(By.css('[data-testid="confirm-close"]'));
    btn.triggerEventHandler('click');

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
