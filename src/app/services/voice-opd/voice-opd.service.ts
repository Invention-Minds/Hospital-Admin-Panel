import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface VoiceAssessmentResponse {
  transcript: string;
  // Legacy (no template) — fixed sections:
  history?: string;
  examination?: string;
  investigation?: string;
  treatmentPlan?: string;
  // Phase 9.21 — when a template is passed, the transcript is structured into
  // that template's dynamic field keys instead of the fixed sections above.
  templatedValueMap?: Record<string, unknown>;
}


@Injectable({
  providedIn: 'root'
})
export class VoiceOpdService {

    // private apiUrl = 'http://localhost:3000/api/voice-opd';
    private apiUrl = `${environment.apiUrl}/voice-opd`

  constructor(private http: HttpClient) { }

    uploadVoice(audioFile: File, noteTemplateId?: string): Observable<VoiceAssessmentResponse> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    // Phase 9.21 — when set, the backend structures the transcript into this
    // template's dynamic fields instead of the fixed sections.
    if (noteTemplateId) formData.append('noteTemplateId', noteTemplateId);

    return this.http.post<VoiceAssessmentResponse>(
      `${this.apiUrl}/voice-assessment`,
      formData
    );
  }
}
