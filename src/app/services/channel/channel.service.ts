import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  private baseUrl = 'https://backend-812956739285.us-east4.run.app/api/channel'; // Update with your backend URL

  constructor(private http: HttpClient) {}

  /**
   * Get all channels with doctors
   */
  getChannels(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  /**
   * Create a new channel
   */
  createChannel(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  /**
   * Assign a doctor to a channel
   */
  assignDoctorToChannel(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/assign`, data);
  }

  /**
   * Remove a doctor from a channel using assignmentId
   */
  removeDoctorFromChannel(data: { channelId: number; doctorId: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/remove`, data);
  }
  getDoctorsByChannel(channelId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${channelId}/doctors`);
  }
  getChannelsByDoctor(doctorId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${doctorId}/channels`);
  }
}
