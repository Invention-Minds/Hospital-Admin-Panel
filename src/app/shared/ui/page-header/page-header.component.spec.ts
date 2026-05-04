import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;
  let component: PageHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [PageHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
  });

  it('renders the title', () => {
    component.title = 'Pharmacy Review';
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="page-header-title"]')?.textContent).toContain(
      'Pharmacy Review'
    );
  });

  it('renders full patient context when name, PRN, and admission id are all provided', () => {
    component.title = 'Pharmacy Review';
    component.subtitle = 'MOM.1 — active + carryover';
    component.patientName = 'Ravi Kumar';
    component.patientPrn = 9900001;
    component.admissionId = 'adm-abc';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const subtitle = host.querySelector('[data-testid="page-header-subtitle"]');
    expect(subtitle).not.toBeNull();

    expect(
      host.querySelector('[data-testid="page-header-patient-name"]')?.textContent
    ).toContain('Ravi Kumar');
    expect(
      host.querySelector('[data-testid="page-header-patient-prn"]')?.textContent
    ).toContain('PRN 9900001');
    expect(
      host.querySelector('[data-testid="page-header-admission-id"]')?.textContent
    ).toContain('adm-abc');
  });

  it('omits patient-context spans when only an admission id is supplied', () => {
    component.title = 'Discharge Summary';
    component.admissionId = 'adm-xyz';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="page-header-patient-name"]')).toBeNull();
    expect(host.querySelector('[data-testid="page-header-patient-prn"]')).toBeNull();
    expect(
      host.querySelector('[data-testid="page-header-admission-id"]')?.textContent
    ).toContain('adm-xyz');
  });
});
