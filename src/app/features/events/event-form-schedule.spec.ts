import { buildScheduleRule, parseDailyTimes } from '../../shared/components/care-plan-fields';

describe('care schedule form mapping', () => {
  it('maps a twelve hour fixed interval to canonical minutes', () => {
    expect(buildScheduleRule('FIXED_INTERVAL', 'DAY', 1, 12, '', 14, null)).toEqual({
      kind: 'FIXED_INTERVAL',
      calendarUnit: null,
      intervalCount: null,
      fixedIntervalMinutes: 720,
      dailyTimes: [],
      repetitions: 14,
      endAt: null
    });
  });

  it('normalizes daily times and keeps them unique and ordered', () => {
    expect(parseDailyTimes('20:00, 08:00, 20:00')).toEqual(['08:00', '20:00']);
    expect(buildScheduleRule('DAILY_TIMES', 'DAY', 1, 12, '20:00, 08:00', null, '2026-07-20T20:00:00')).toEqual({
      kind: 'DAILY_TIMES',
      calendarUnit: null,
      intervalCount: null,
      fixedIntervalMinutes: null,
      dailyTimes: ['08:00', '20:00'],
      repetitions: null,
      endAt: '2026-07-20T20:00:00'
    });
  });

  it('removes recurrence-only fields for a one-time care', () => {
    expect(buildScheduleRule('ONE_TIME', 'MONTH', 2, 12, '08:00', 5, '2026-08-01T10:00:00')).toEqual({
      kind: 'ONE_TIME',
      calendarUnit: null,
      intervalCount: null,
      fixedIntervalMinutes: null,
      dailyTimes: [],
      repetitions: null,
      endAt: null
    });
  });
});
