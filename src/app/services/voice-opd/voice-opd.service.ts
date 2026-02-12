import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface VoiceAssessmentResponse {
  transcript: string;
  history: string;
  examination: string;
  investigation: string;
  treatmentPlan: string;
}


@Injectable({
  providedIn: 'root'
})
export class VoiceOpdService {

    // private apiUrl = 'http://localhost:3000/api/voice-opd';
    private apiUrl = `${environment.apiUrl}/voice-opd`

  constructor(private http: HttpClient) { }

    uploadVoice(audioFile: File): Observable<VoiceAssessmentResponse> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    return this.http.post<VoiceAssessmentResponse>(
      `${this.apiUrl}/voice-assessment`,
      formData
    );
  }
}
