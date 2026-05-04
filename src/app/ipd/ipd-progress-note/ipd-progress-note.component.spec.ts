/**
 * Sprint 3a-2 — IpdProgressNoteComponent tests.
 *
 * Covers the Component-layer requirements from the brief:
 *   1. Initial render: form + empty-state shown
 *   2. Form validation: invalid => save disabled; valid => enabled
 *   3. Valid submit triggers service with correct payload + admissionId,
 *      resets form, reloads list
 *   4. Loading state displayed while list loads
 *   5. Unsaved-changes canDeactivate() path: form dirty => observable;
 *      confirm => true, cancel => false
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { IpdProgressNoteComponent } from './ipd-progress-note.component';
import { IpdProgressNote, IpdService } from '../../services/ipd.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

class IpdServiceStub {
  getProgressNotesSpy = jasmine.createSpy('getProgressNotes');
  addProgressNoteSpy = jasmine.createSpy('addProgressNote');

  getProgressNotes(admissionId: string): Observable<IpdProgressNote[]> {
    return this.getProgressNotesSpy(admissionId);
  }
  addProgressNote(admissionId: string, note: IpdProgressNote): Observable<unknown> {
    return this.addProgressNoteSpy(admissionId, note);
  }
}

describe('IpdProgressNoteComponent', () => {
  let fixture: ComponentFixture<IpdProgressNoteComponent>;
  let component: IpdProgressNoteComponent;
  let ipdService: IpdServiceStub;
  let messageServiceAdd: jasmine.Spy;

  const fillValidForm = () => {
    component.form.patchValue({
      doctorName: 'Dr. Jacob Ryan',
      subjective: 'Pain improving.',
      objective: 'BP 120/80, HR 72.',
      assessment: 'Post-op day 2, stable.',
      plan: 'Continue antibiotics, ambulate.',
    });
    component.form.markAsDirty();
  };

  beforeEach(async () => {
    ipdService = new IpdServiceStub();
    // Default: empty list response
    ipdService.getProgressNotesSpy.and.returnValue(of({ data: [] }));

    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, RouterTestingModule],
      declarations: [IpdProgressNoteComponent, ConfirmDialogComponent, EmptyStateComponent, PageHeaderComponent],
      providers: [
        { provide: IpdService, useValue: ipdService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'admissionId' ? 'adm-001' : null) } } },
        },
        MessageService,
      ],
      schemas: [],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');

    fixture = TestBed.createComponent(IpdProgressNoteComponent);
    component = fixture.componentInstance;
  });

  it('renders the form and shows the empty state when no prior notes exist', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="progress-note-form"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="notes-empty"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="note-item"]')).toBeNull();
    expect(ipdService.getProgressNotesSpy).toHaveBeenCalledWith('adm-001');
  });

  it('disables the save button until all five SOAP fields are provided', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-save"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    fillValidForm();
    fixture.detectChanges();

    expect(btn.disabled).toBe(false);
  });

  it('submits the form payload to IpdService.addProgressNote with the route admissionId and reloads the list', () => {
    ipdService.addProgressNoteSpy.and.returnValue(of({ data: { id: 'pn-1' } }));
    // After successful save the component calls loadNotes() again; return one row this time.
    const savedRow = {
      id: 'pn-1',
      admissionId: 'adm-001',
      doctorName: 'Dr. Jacob Ryan',
      subjective: 'Pain improving.',
      objective: 'BP 120/80, HR 72.',
      assessment: 'Post-op day 2, stable.',
      plan: 'Continue antibiotics, ambulate.',
    };
    ipdService.getProgressNotesSpy.and.returnValues(
      of({ data: [] }),
      of({ data: [savedRow] })
    );

    fixture.detectChanges();
    fillValidForm();
    fixture.detectChanges();

    component.submit();

    expect(ipdService.addProgressNoteSpy).toHaveBeenCalledTimes(1);
    const [admissionId, payload] = ipdService.addProgressNoteSpy.calls.mostRecent().args;
    expect(admissionId).toBe('adm-001');
    expect(payload).toEqual(jasmine.objectContaining({
      admissionId: 'adm-001',
      doctorName: 'Dr. Jacob Ryan',
      subjective: 'Pain improving.',
      objective: 'BP 120/80, HR 72.',
      assessment: 'Post-op day 2, stable.',
      plan: 'Continue antibiotics, ambulate.',
    }));

    // Success toast
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    // List reloaded
    expect(ipdService.getProgressNotesSpy).toHaveBeenCalledTimes(2);
    // Form reset
    expect(component.form.value.doctorName).toBeNull();
  });

  it('shows the error toast when addProgressNote fails', () => {
    ipdService.addProgressNoteSpy.and.returnValue(
      throwError(() => ({ status: 500, error: { message: 'boom' } }))
    );
    fixture.detectChanges();
    fillValidForm();
    fixture.detectChanges();

    component.submit();

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not save progress note',
    }));
  });

  it('canDeactivate: pristine → true; dirty + confirm → true; dirty + cancel → false', fakeAsync(() => {
    fixture.detectChanges();

    // Pristine form — no dialog, immediate true.
    expect(component.canDeactivate()).toBe(true);
    expect(component.confirmDiscardVisible).toBe(false);

    // Make dirty and try again — opens dialog + returns observable.
    fillValidForm();
    const result = component.canDeactivate();
    expect(component.confirmDiscardVisible).toBe(true);
    expect(typeof result).toBe('object');
    expect((result as Observable<boolean>).subscribe).toBeDefined();

    let confirmDecision: boolean | undefined;
    (result as Observable<boolean>).subscribe((v) => (confirmDecision = v));

    component.onDiscardConfirm();
    tick();
    expect(confirmDecision).toBe(true);
    expect(component.confirmDiscardVisible).toBe(false);

    // Second attempt: user cancels. Need a fresh subject subscription.
    fillValidForm();
    const result2 = component.canDeactivate();
    let cancelDecision: boolean | undefined;
    (result2 as Observable<boolean>).subscribe((v) => (cancelDecision = v));

    component.onDiscardCancel();
    tick();
    expect(cancelDecision).toBe(false);
    expect(component.confirmDiscardVisible).toBe(false);
  }));

  it('shows a loading indicator while the list request is in flight', () => {
    // Subject (not BehaviorSubject) so subscribing doesn't emit immediately
    // — that keeps loadingList=true until we explicitly .next() the response.
    const subject = new Subject<unknown>();
    ipdService.getProgressNotesSpy.and.returnValue(subject.asObservable());

    fixture.detectChanges();
    expect(component.loadingList).toBe(true);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="list-loading"]')).not.toBeNull();

    subject.next({ data: [] });
    subject.complete();
    fixture.detectChanges();
    expect(component.loadingList).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-loading"]')).toBeNull();
  });
});
