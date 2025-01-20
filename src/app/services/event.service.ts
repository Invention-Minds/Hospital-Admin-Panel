import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private consultationEvent = new Subject<{ doctorId: number; appointmentId: number }>();

  consultationEvent$ = this.consultationEvent.asObservable();

  emitConsultationStarted(data: { doctorId: number; appointmentId: number }): void {
    this.consultationEvent.next(data);
    console.log("emitted")
  }

}
