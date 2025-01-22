import { Injectable } from '@angular/core';
import { Subject, ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private consultationStarted = new ReplaySubject<{
    doctorId: number;
    appointmentId: number;
    channelId: number;
  }>(1); 
  consultationEvent$ = this.consultationStarted.asObservable();

  emitConsultationStarted(event: { doctorId: number; appointmentId: number; channelId: number}) {
    this.consultationStarted.next(event);
    console.log('emitted', event)
  }

}
