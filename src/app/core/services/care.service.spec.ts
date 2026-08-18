import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CareOccurrence } from '../models/care.model';
import { CareService } from './care.service';

describe('CareService', () => {
  let service: CareService;
  let http: HttpTestingController;
  const occurrence: CareOccurrence = {
    id: 'occ-1', planId: 'plan-1', petId: 1, responsibleTutorId: 1, type: 'MEDICINE', title: 'Dose',
    dueAt: '2026-07-12T13:00:00Z', dueAtLocal: '2026-07-12T10:00:00', status: 'COMPLETED', critical: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CareService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends all agenda filters to the server', async () => {
    const result = firstValueFrom(service.search({
      from: '2026-07-01T00:00:00', to: '2026-08-01T00:00:00', petId: 1,
      type: 'MEDICINE', status: 'SCHEDULED', page: 2, size: 20
    }));
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/care-occurrences`);
    expect(request.request.params.get('petId')).toBe('1');
    expect(request.request.params.get('type')).toBe('MEDICINE');
    expect(request.request.params.get('status')).toBe('SCHEDULED');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ items: [], total: 0, page: 2, size: 20 });
    expect((await result).items).toEqual([]);
  });

  it('reuses the same completion idempotency key after an uncertain network failure', async () => {
    const first = firstValueFrom(service.complete(occurrence.id));
    const firstRequest = http.expectOne(`${environment.apiUrl}/care-occurrences/occ-1/complete`);
    const firstKey = firstRequest.request.body.requestId;
    firstRequest.error(new ProgressEvent('network'));
    await expectAsync(first).toBeRejected();

    const retry = firstValueFrom(service.complete(occurrence.id));
    const retryRequest = http.expectOne(`${environment.apiUrl}/care-occurrences/occ-1/complete`);
    expect(retryRequest.request.body.requestId).toBe(firstKey);
    retryRequest.flush(occurrence);
    expect((await retry).status).toBe('COMPLETED');
  });
});
