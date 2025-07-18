import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IDexData,
  IGlobalSlaResponse,
  IRtoSummary,
  ISlaCategoryStatusData,
  ISlaStateData,
  ISlaStatusData,
} from '../models/sla.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@pos/shared/environments';

@Injectable({
  providedIn: 'root',
})
export class SlaService {
  constructor(private http: HttpClient) {}

  getStatusList(startDate: string, endDate: string): Observable<IGlobalSlaResponse<ISlaStatusData>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<IGlobalSlaResponse<ISlaStatusData>>(
      `${environment.sppUatUrl}dashboard/v1/sla/status`,
      { params }
    );
  }

  getCategoryStatusList(startDate: string, endDate: string): Observable<
    IGlobalSlaResponse<ISlaCategoryStatusData>
  > {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<IGlobalSlaResponse<ISlaCategoryStatusData>>(
      `${environment.sppUatUrl}dashboard/v1/sla/category`,
      { params }
    );
  }

  getStateList(startDate: string, endDate: string): Observable<IGlobalSlaResponse<ISlaStateData>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<IGlobalSlaResponse<ISlaStateData>>(
      `${environment.sppUatUrl}dashboard/v1/sla/state`,
      { params }
    );
  }

  getDexList(startDate: string, endDate: string): Observable<IGlobalSlaResponse<IDexData>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<IGlobalSlaResponse<IDexData>>(
      `${environment.sppUatUrl}dashboard/v1/dex`,
      { params }
    );
  }


  getRtoSummary(): Observable<IGlobalSlaResponse<IRtoSummary>> {
    return this.http.get<IGlobalSlaResponse<IRtoSummary>>(
      `${environment.sppUatUrl}dashboard/v1/rto`
    );
  }

  getDownloadFile(type: 'sla_status' | 'sla_category' | 'sla_state' | 'sla_dex' | 'sla_all', startDate: string, endDate: string): Observable<any> {
    const params = new HttpParams()
      .set('type', type)
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get(environment.sppUatUrl + `dashboard/v1/sla/file/download`, {
      params,
      responseType: 'blob'
    })
  }
}
