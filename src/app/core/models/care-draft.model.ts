import { CarePlan, CarePlanRequest, CareScheduleRule } from './care.model';
import { EventType } from './event.model';

export type CareDraftStatus = 'PROCESSING' | 'NEEDS_INPUT' | 'READY' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
export type CareDraftProvenance = 'EXPLICIT' | 'NORMALIZED' | 'SYSTEM_DEFAULT' | 'NEEDS_REVIEW' | 'MISSING';
export type CareDraftField =
  'PET' | 'TYPE' | 'TITLE' | 'INSTRUCTIONS' | 'START_AT' | 'TIMEZONE' | 'SCHEDULE' |
  'REMINDER' | 'RESPONSIBLE' | 'CRITICAL' | 'ESCALATION' | 'ESTIMATED_COST';

export interface CareDraftWarning { code: string; message: string; blocking: boolean }

export interface CareDraftFields {
  petId: number | null;
  type: EventType | null;
  title: string | null;
  instructions: string | null;
  startAt: string | null;
  startAtLocal: string | null;
  timezone: string | null;
  scheduleRule: CareScheduleRule | null;
  reminderMinutesBefore: number;
  responsibleTutorId: number | null;
  critical: boolean;
  escalationDelayMinutes: number | null;
  escalationTutorId: number | null;
  estimatedCostAmount: number | null;
  estimatedCostCurrency: string | null;
}

export interface CareDraft {
  id: string;
  version: number;
  channel: 'WEB' | 'WHATSAPP';
  inputType: 'TEXT' | 'AUDIO' | 'IMAGE' | 'PDF';
  status: CareDraftStatus;
  fields: CareDraftFields;
  evidence: Partial<Record<CareDraftField, string>>;
  missingFields: CareDraftField[];
  warnings: CareDraftWarning[];
  provenance: Partial<Record<CareDraftField, CareDraftProvenance>>;
  provider?: string;
  model?: string;
  promptVersion: string;
  planId?: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  confirmedAt?: string;
}

export interface CareDraftPage { items: CareDraft[]; total: number; page: number; size: number }
export interface CareDraftConfirmation { draft: CareDraft; plan: CarePlan }

export interface CareDraftCorrectionRequest {
  requestId: string;
  expectedVersion: number;
  fields: CarePlanRequest;
}
