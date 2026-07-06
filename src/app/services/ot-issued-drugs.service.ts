import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.5d — View Issued Drugs service.

export interface IssuedDrugRow {
  id: number;
  itemName: string;
  quantity: number;
  uom: string | null;
  itemRemarks: string | null;
  pharmacyStore: string | null;
  prescribedBy: string | null;
  direction: 'issued' | 'returned';
  issuedAt: string;
  setId: number | null;
}

export interface IssuedDrugSummary {
  itemName: string;
  uom: string | null;
  issued: number;
  returned: number;
  net: number;
}

export interface IssuedDrugsResponse {
  data: { rows: IssuedDrugRow[]; summary: IssuedDrugSummary[] };
  meta: {
    totalLines: number;
    distinctItems: number;
    totalIssuedUnits: number;
    totalReturnedUnits: number;
  };
}

@Injectable({ providedIn: 'root' })
export class OtIssuedDrugsService {
  constructor(private http: HttpClient) {}

  forSchedule(scheduleId: string): Observable<IssuedDrugsResponse> {
    return this.http.get<IssuedDrugsResponse>(
      `${environment.apiUrl}/ot/schedules/${scheduleId}/issued-drugs`,
    );
  }
}
