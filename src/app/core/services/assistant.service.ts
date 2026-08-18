import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AssistantCitation, KnowledgeSource, PetHistoryAnswer } from '../models/assistant.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly api = `${environment.apiUrl}/assistant`;

  constructor(private readonly http: HttpClient) {}

  ask(petId: number, question: string): Observable<PetHistoryAnswer> {
    return this.http.post<PetHistoryAnswer>(`${this.api}/questions`, { petId, question: question.trim() });
  }

  feedback(answerId: string, positive: boolean, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.api}/answers/${encodeURIComponent(answerId)}/feedback`, {
      positive,
      reason: reason || null
    });
  }

  knowledgeSources(petId: number): Observable<KnowledgeSource[]> {
    return this.http.get<KnowledgeSource[]>(`${this.api}/knowledge-sources`, { params: { petId } });
  }

  reindex(sourceId: string): Observable<KnowledgeSource> {
    return this.http.post<KnowledgeSource>(`${this.api}/knowledge-sources/${encodeURIComponent(sourceId)}/reindex`, {});
  }

  attachmentUrl(citation: AssistantCitation): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(
      `${environment.apiUrl}/health-attachments/${encodeURIComponent(citation.resourceId)}/download-url`
    );
  }
}
