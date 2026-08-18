import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { WhatsAppIntegrationService } from './whatsapp-integration.service';

describe('WhatsAppIntegrationService', () => {
  let service: WhatsAppIntegrationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WhatsAppIntegrationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a one-time link token', () => {
    service.createLinkToken().subscribe(value => expect(value.code).toBe('rp_test'));
    const request = http.expectOne(`${environment.apiUrl}/integrations/whatsapp/link-tokens`);
    expect(request.request.method).toBe('POST');
    request.flush({ code: 'rp_test', deepLink: 'https://wa.me/1', expiresAt: '2026-07-14T12:00:00Z' });
  });

  it('revokes the current connection', () => {
    service.revoke().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/integrations/whatsapp`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
