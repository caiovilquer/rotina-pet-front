import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  let service: AssistantService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssistantService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks an independent pet-scoped question', () => {
    service.ask(42, '  Quando foi a última vacina?  ').subscribe();
    const request = http.expectOne(`${environment.apiUrl}/assistant/questions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ petId: 42, question: 'Quando foi a última vacina?' });
    request.flush({ answerId: 'answer-1', kind: 'STRUCTURED', answer: 'Ontem', citations: [], insufficientEvidence: false, suggestedFollowUps: [], generatedAt: new Date().toISOString() });
  });

  it('opens only the authenticated attachment endpoint from a citation', () => {
    service.attachmentUrl({
      sourceType: 'HEALTH_ATTACHMENT', sourceId: 'source-1', resourceId: 'media-1', title: 'Exame.pdf',
      page: 2, excerpt: 'Trecho', contentUrl: '/untrusted/path'
    }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/health-attachments/media-1/download-url`);
    expect(request.request.method).toBe('GET');
    request.flush({ url: 'https://signed.example/file' });
  });
});
