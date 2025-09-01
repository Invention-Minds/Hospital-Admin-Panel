import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {

  private baseUrl = `${environment.apiUrl}/channel`; // Update with your backend URL
  private apiUrl = `${environment.apiUrl}/ads`;

  constructor(private http: HttpClient) {
    console.log(environment)
  }

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
  uploadTextAd(content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload-text`, { content});
  }

  // Upload Media Advertisement (Image/Video)
  // uploadMediaAd(type: string, files: File[],channelIds: number[]): Observable<any> {
  //   const formData = new FormData();
  //   formData.append('type', type);
  //   channelIds.forEach(id => formData.append('channelIds', id.toString()));
  //   for (const file of files) {
  //     formData.append('file', file); // Append multiple files with same key
  //   }


  //   return this.http.post(`${this.apiUrl}/upload-media`, formData);
  // }
  uploadMediaAd(type: string, file: File, channelIds: number[]): Observable<any> {
    const formData = new FormData();
    formData.append("type", type);
  
    channelIds.forEach((id) => formData.append("channelIds", id.toString()));
  
    // ✅ must append actual File/Blob, not plain object
    formData.append("file", file, file.name);
  
    return this.http.post(`${this.apiUrl}/upload-media`, formData);
  }
  

  deleteMedia(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/media/${id}`);
  }

  updateMediaStatus(mediaId: number, isActive: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/media/${mediaId}/status`, { isActive });
  }


  // Fetch Latest Text & Media Ads
  getLatestAds(): Observable<any> {
    return this.http.get(`${this.apiUrl}/latest-ads`);
  }
  getAllAds(): Observable<any> {
    return this.http.get(`${this.apiUrl}/all-ads`);
  }
  updateAdStatus(type: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/update-status`, { type, isActive });
  }
  getAllAdsForChannel(channelId?: string): Observable<any> {
    let url = `${this.apiUrl}/channel-ads`;
    if (channelId) {
      url += `?channelId=${channelId}`;
    }
    return this.http.get(url);
  }
  updateAdChannels(payload: any) {
    return this.http.post(`${this.apiUrl}/update-channels`, payload);
  }
  
  
}
