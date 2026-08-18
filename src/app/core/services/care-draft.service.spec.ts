import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CareDraft } from '../models/care-draft.model';
import { CarePlanRequest } from '../models/care.model';
import { CareDraftService } from './care-draft.service';

describe('CareDraftService', () => {
  let service: CareDraftService;
  let http: HttpTestingController;
  const draft: CareDraft = {
    id: 'draft-1', version: 1, channel: 'WEB', inputType: 'TEXT', status: 'READY',
    fields: {
      petId: 1, type: 'MEDICINE', title: 'Medicamento', instructions: null,
      startAt: '2026-07-15T11:00:00Z', startAtLocal: '2026-07-15T08:00:00', timezone: 'America/Sao_Paulo',
      scheduleRule: { kind: 'ONE_TIME', dailyTimes: [] }, reminderMinutesBefore: 0,
      responsibleTutorId: 1, critical: false, escalationDelayMinutes: null, escalationTutorId: null,
      estimatedCostAmount: null, estimatedCostCurrency: null
    },
    evidence: {}, missingFields: [], warnings: [], provenance: {}, promptVersion: 'care-draft-v1',
    createdAt: '2026-07-14T12:00:00Z', updatedAt: '2026-07-14T12:00:01Z', expiresAt: '2026-07-15T12:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CareDraftService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends reviewed domain fields to the draft endpoint rather than creating a plan directly', async () => {
    const fields: CarePlanRequest = {
      petId: 1, type: 'MEDICINE', title: 'Medicamento', instructions: null,
      startAt: '2026-07-15T08:00:00', zoneId: 'America/Sao_Paulo',
      scheduleRule: { kind: 'ONE_TIME', dailyTimes: [] }, reminderMinutesBefore: 0,
      responsibleTutorId: 1, critical: false, escalationDelayMinutes: null, escalationTutorId: null,
      estimatedCostAmount: null, estimatedCostCurrency: null
    };
    const pending = firstValueFrom(service.correct(draft.id, draft.version, fields));
    const request = http.expectOne(`${environment.apiUrl}/assistant/care-drafts/draft-1`);

    expect(request.request.method).toBe('PUT');
    expect(request.request.body.expectedVersion).toBe(1);
    expect(request.request.body.fields).toEqual(fields);
    expect(request.request.body.requestId).toBeTruthy();
    request.flush(draft);
    expect((await pending).status).toBe('READY');
  });

  it('reuses confirmation idempotency key after an uncertain network failure', async () => {
    const first = firstValueFrom(service.confirm(draft.id, draft.version));
    const firstRequest = http.expectOne(`${environment.apiUrl}/assistant/care-drafts/draft-1/confirm`);
    const firstKey = firstRequest.request.body.requestId;
    firstRequest.error(new ProgressEvent('network'));
    await expectAsync(first).toBeRejected();

    const retry = firstValueFrom(service.confirm(draft.id, draft.version));
    const retryRequest = http.expectOne(`${environment.apiUrl}/assistant/care-drafts/draft-1/confirm`);
    expect(retryRequest.request.body.requestId).toBe(firstKey);
    retryRequest.flush({ draft: { ...draft, status: 'CONFIRMED', planId: 'plan-1' }, plan: { id: 'plan-1' } });
    expect((await retry).draft.status).toBe('CONFIRMED');
  });
});
