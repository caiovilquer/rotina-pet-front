import { EventType } from './event.model';

export type CareOccurrenceStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type ScheduleKind = 'ONE_TIME' | 'CALENDAR_INTERVAL' | 'FIXED_INTERVAL' | 'DAILY_TIMES';
export type CalendarIntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface CareScheduleRule {
  kind: ScheduleKind;
  calendarUnit?: CalendarIntervalUnit | null;
  intervalCount?: number | null;
  fixedIntervalMinutes?: number | null;
  dailyTimes: string[];
  repetitions?: number | null;
  endAt?: string | null;
}

export interface CarePlan {
  id: string;
  version?: number;
  petId: number;
  responsibleTutorId: number;
  type: EventType;
  title: string;
  instructions?: string;
  startAt: string;
  startAtLocal: string;
  scheduleRule: CareScheduleRule;
  reminderMinutesBefore: number;
  critical: boolean;
  escalationDelayMinutes?: number;
  escalationTutorId?: number;
  estimatedCostAmount?: number | null;
  estimatedCostCurrency?: string | null;
  active: boolean;
  timezone?: string;
}

export interface CarePlanRequest {
  petId: number;
  type: EventType;
  title: string;
  instructions: string | null;
  startAt: string;
  zoneId: string;
  scheduleRule: CareScheduleRule;
  reminderMinutesBefore: number;
  responsibleTutorId: number | null;
  critical: boolean;
  escalationDelayMinutes: number | null;
  escalationTutorId: number | null;
  estimatedCostAmount: number | null;
  estimatedCostCurrency: string | null;
}

export interface CareOccurrence {
  id: string;
  version?: number;
  planId: string;
  petId: number;
  responsibleTutorId: number;
  type: EventType;
  title: string;
  instructions?: string;
  dueAt: string;
  dueAtLocal: string;
  status: CareOccurrenceStatus;
  completedAt?: string;
  completedByTutorId?: number;
  completionNote?: string;
  critical: boolean;
  escalationDelayMinutes?: number;
  escalationTutorId?: number;
  estimatedCostAmount?: number | null;
  estimatedCostCurrency?: string | null;
  canUndoUntil?: string;
  timezone?: string;
}

export interface CareOccurrencesPage {
  items: CareOccurrence[];
  total: number;
  page: number;
  size: number;
}

export interface CarePlansPage {
  items: CarePlan[];
  total: number;
  page: number;
  size: number;
}

export interface TodayCare {
  date: string;
  overdue: CareOccurrence[];
  today: CareOccurrence[];
  completedToday: CareOccurrence[];
  upcomingSevenDays: number;
  timezone?: string;
}

export interface CareSearch {
  from: string;
  to: string;
  petId?: number | null;
  type?: EventType | null;
  status?: CareOccurrenceStatus | null;
  page: number;
  size: number;
}
