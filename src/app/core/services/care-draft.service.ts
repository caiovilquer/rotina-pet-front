import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CareDraft,
  CareDraftConfirmation,
  CareDraftCorrectionRequest,
  CareDraftField,
  CareDraftPage
} from '../models/care-draft.model';
import { CarePlanRequest } from '../models/care.model';

@Injectable({ providedIn: 'root' })
export class CareDraftService {
  private readonly url = `${environment.apiUrl}/assistant/care-drafts`;
  private readonly confirmationKeys = new Map<string, string>();
  private readonly cancellationKeys = new Map<string, string>();

  constructor(private readonly http: HttpClient) {}

  generate(instruction: string): Observable<CareDraft> {
    return this.http.post<CareDraft>(this.url, { requestId: crypto.randomUUID(), instruction });
  }

  list(page = 0, size = 20): Observable<CareDraftPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<CareDraftPage>(this.url, { params });
  }

  get(id: string): Observable<CareDraft> {
    return this.http.get<CareDraft>(`${this.url}/${encodeURIComponent(id)}`);
  }

  correct(id: string, expectedVersion: number, fields: CarePlanRequest): Observable<CareDraft> {
    const request: CareDraftCorrectionRequest = { requestId: crypto.randomUUID(), expectedVersion, fields };
    return this.http.put<CareDraft>(`${this.url}/${encodeURIComponent(id)}`, request);
  }

  confirm(id: string, expectedVersion: number): Observable<CareDraftConfirmation> {
    const requestId = this.confirmationKeys.get(id) || crypto.randomUUID();
    this.confirmationKeys.set(id, requestId);
    return this.http.post<CareDraftConfirmation>(`${this.url}/${encodeURIComponent(id)}/confirm`, {
      requestId,
      expectedVersion
    }).pipe(tap(() => this.confirmationKeys.delete(id)));
  }

  cancel(id: string, expectedVersion: number): Observable<CareDraft> {
    const requestId = this.cancellationKeys.get(id) || crypto.randomUUID();
    this.cancellationKeys.set(id, requestId);
    return this.http.post<CareDraft>(`${this.url}/${encodeURIComponent(id)}/cancel`, {
      requestId,
      expectedVersion
    }).pipe(tap(() => this.cancellationKeys.delete(id)));
  }

  feedback(
    id: string,
    positive: boolean,
    correctedFields: CareDraftField[] = [],
    reason?: string,
    comment?: string
  ): Observable<void> {
    return this.http.post<void>(`${this.url}/${encodeURIComponent(id)}/feedback`, {
      requestId: crypto.randomUUID(), positive, correctedFields, reason: reason || null, comment: comment || null
    });
  }
}
