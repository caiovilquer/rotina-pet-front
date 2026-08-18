import { CalendarIntervalUnit, CareScheduleRule, ScheduleKind } from '../../core/models/care.model';

export function parseDailyTimes(value: string): string[] {
  const times = value.split(',').map(item => item.trim()).filter(item => /^([01]\d|2[0-3]):[0-5]\d$/.test(item));
  return [...new Set(times)].sort();
}

export function buildScheduleRule(
  kind: ScheduleKind,
  calendarUnit: CalendarIntervalUnit,
  intervalCount: number,
  fixedIntervalHours: number,
  dailyTimesInput: string,
  repetitions: number | null,
  endAt: string | null
): CareScheduleRule {
  return {
    kind,
    calendarUnit: kind === 'CALENDAR_INTERVAL' ? calendarUnit : null,
    intervalCount: kind === 'CALENDAR_INTERVAL' ? intervalCount : null,
    fixedIntervalMinutes: kind === 'FIXED_INTERVAL' ? Math.round(fixedIntervalHours * 60) : null,
    dailyTimes: kind === 'DAILY_TIMES' ? parseDailyTimes(dailyTimesInput) : [],
    repetitions: kind === 'ONE_TIME' ? null : repetitions,
    endAt: kind === 'ONE_TIME' ? null : endAt
  };
}
