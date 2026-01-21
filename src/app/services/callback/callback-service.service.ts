import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment.prod';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CallbackServiceService {
 private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllCallbacks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/call-back`);
  }

  markHandled(id: number, handledBy: string) {
    return this.http.patch(`${this.apiUrl}/call-back/${id}/handle`, {
      handledBy
    });
  }

  addNote(id: number, note: string, addedBy: string) {
    return this.http.patch(`${this.apiUrl}/call-back/${id}/note`, {
      note,
      addedBy
    });
  }

  cancelCallback(id: number, cancelledBy: string, cancelReason: string) {
    return this.http.patch(`${this.apiUrl}/call-back/${id}/cancel`, {
      cancelledBy,
      cancelReason
    });
  }
}
