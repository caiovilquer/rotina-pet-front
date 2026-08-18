export type AssistantAnswerKind = 'STRUCTURED' | 'RAG' | 'REFUSAL';
export type KnowledgeSourceType = 'HEALTH_RECORD' | 'HEALTH_MEASUREMENT' | 'HEALTH_ATTACHMENT' | 'CARE_PLAN' | 'VETERINARY_SUMMARY_NOTE';
export type KnowledgeSourceStatus = 'PENDING' | 'INDEXING' | 'READY' | 'FAILED' | 'STALE' | 'DELETED';

export interface AssistantCitation {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  resourceId: string;
  title: string;
  page: number | null;
  excerpt: string;
  contentUrl: string | null;
}

export interface PetHistoryAnswer {
  answerId: string;
  kind: AssistantAnswerKind;
  answer: string;
  citations: AssistantCitation[];
  insufficientEvidence: boolean;
  suggestedFollowUps: string[];
  generatedAt: string;
}

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  resourceId: string;
  title: string;
  status: KnowledgeSourceStatus;
  errorCode: string | null;
  updatedAt: string;
}
