import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapyChannelComponent } from './therapy-channel.component';

describe('TherapyChannelComponent', () => {
  let component: TherapyChannelComponent;
  let fixture: ComponentFixture<TherapyChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapyChannelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapyChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
