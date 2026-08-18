import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WhatsAppConnection, WhatsAppLinkToken } from '../models/whatsapp.model';

@Injectable({ providedIn: 'root' })
export class WhatsAppIntegrationService {
  private readonly url = `${environment.apiUrl}/integrations/whatsapp`;

  constructor(private readonly http: HttpClient) {}

  status(): Observable<WhatsAppConnection> {
    return this.http.get<WhatsAppConnection>(this.url);
  }

  createLinkToken(): Observable<WhatsAppLinkToken> {
    return this.http.post<WhatsAppLinkToken>(`${this.url}/link-tokens`, {});
  }

  revoke(): Observable<void> {
    return this.http.delete<void>(this.url);
  }
}
