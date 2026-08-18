import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { CalendarIntervalUnit, CarePlanRequest, ScheduleKind } from '../../core/models/care.model';
import { EventType } from '../../core/models/event.model';
import { PetSummary } from '../../core/models/pet.model';
import { ApiErrorService } from '../../core/services/api-error.service';
import { CareService } from '../../core/services/care.service';
import { DateTimeService } from '../../core/services/datetime.service';
import { EventStateService } from '../../core/services/event-state.service';
import { PetService } from '../../core/services/pet.service';
import { ToastService } from '../../core/services/toast.service';
import { HouseholdService } from '../../core/services/household.service';
import { DEFAULT_HOUSEHOLD_TIMEZONE, HouseholdMember } from '../../core/models/household.model';
import { CURRENCY_OPTIONS, currencySymbol, isListedCurrency, normalizeCurrency } from '../../core/models/currency.model';
import { buildScheduleRule, parseDailyTimes } from '../../shared/components/care-plan-fields';

export interface CarePlanFormData { planId?: string; petId?: number }

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSelectModule, MatDatepickerModule, MatIconModule, MatProgressSpinnerModule, MatCheckboxModule
  ],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly isEdit: boolean;
  isLoading = false;
  isLoadingPlan = false;
  pets: PetSummary[] = [];
  members: HouseholdMember[] = [];
  householdTimezone = DEFAULT_HOUSEHOLD_TIMEZONE;

  readonly scheduleKinds: Array<{ value: ScheduleKind; label: string }> = [
    { value: 'ONE_TIME', label: 'Uma vez' },
    { value: 'CALENDAR_INTERVAL', label: 'Intervalo de calendário' },
    { value: 'FIXED_INTERVAL', label: 'A cada tantas horas' },
    { value: 'DAILY_TIMES', label: 'Horários todos os dias' }
  ];
  readonly calendarUnits: Array<{ value: CalendarIntervalUnit; label: string }> = [
    { value: 'DAY', label: 'dia(s)' }, { value: 'WEEK', label: 'semana(s)' },
    { value: 'MONTH', label: 'mês(es)' }, { value: 'YEAR', label: 'ano(s)' }
  ];
  readonly reminders = [
    { value: 0, label: 'No horário' }, { value: 15, label: '15 minutos antes' },
    { value: 30, label: '30 minutos antes' }, { value: 60, label: '1 hora antes' },
    { value: 1440, label: '1 dia antes' }, { value: 10080, label: '1 semana antes' }
  ];
  readonly currencies = CURRENCY_OPTIONS;
  readonly eventTypes: Array<{ value: EventType; label: string; icon: string }> = [
    { value: 'VACCINE', label: 'Vacina', icon: 'vaccines' },
    { value: 'MEDICINE', label: 'Remédio', icon: 'medication' },
    { value: 'DIARY', label: 'Rotina', icon: 'task_alt' },
    { value: 'BREED', label: 'Reprodução', icon: 'favorite' },
    { value: 'SERVICE', label: 'Serviço', icon: 'content_cut' }
  ];

  readonly eventForm = this.fb.group({
    petId: this.fb.control<number | null>(null, Validators.required),
    type: this.fb.control<EventType | null>(null, Validators.required),
    title: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
    instructions: this.fb.control('', Validators.maxLength(2000)),
    dateStart: this.fb.control<Date | null>(null, Validators.required),
    timeStart: this.fb.control('', Validators.required),
    scheduleKind: this.fb.nonNullable.control<ScheduleKind>('ONE_TIME'),
    calendarUnit: this.fb.nonNullable.control<CalendarIntervalUnit>('DAY'),
    intervalCount: this.fb.control(1, [Validators.required, Validators.min(1), Validators.max(365)]),
    fixedIntervalHours: this.fb.control(12, [Validators.required, Validators.min(1), Validators.max(8760)]),
    dailyTimes: this.fb.nonNullable.control('08:00, 20:00'),
    repetitions: this.fb.control<number | null>(null, [Validators.min(1)]),
    endDate: this.fb.control<Date | null>(null),
    reminderMinutesBefore: this.fb.control(30, [Validators.required, Validators.min(0), Validators.max(10080)]),
    responsibleTutorId: this.fb.control<number | null>(null, Validators.required),
    critical: this.fb.nonNullable.control(false),
    escalationDelayMinutes: this.fb.control<number | null>(60),
    escalationTutorId: this.fb.control<number | null>(null),
    estimatedCostAmount: this.fb.control<number | null>(null, [Validators.min(0.01), Validators.max(9999999999.99)]),
    estimatedCostCurrency: this.fb.nonNullable.control('BRL')
  }, { validators: [this.endDateValidator, this.startDateValidator, this.scheduleValidator, this.escalationValidator] });

  constructor(
    private readonly care: CareService,
    private readonly petsService: PetService,
    private readonly dateTime: DateTimeService,
    private readonly eventsState: EventStateService,
    private readonly toast: ToastService,
    private readonly households: HouseholdService,
    private readonly apiError: ApiErrorService,
    public readonly dialogRef: MatDialogRef<EventFormComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CarePlanFormData | null
  ) {
    this.isEdit = !!data?.planId;
  }

  ngOnInit(): void {
    this.loadPets();
    this.households.overview().subscribe({ next: value => {
      this.members = value.members;
      this.householdTimezone = value.household.timezone || DEFAULT_HOUSEHOLD_TIMEZONE;
      const caregiver = value.members.find(member => member.role !== 'VIEWER');
      const owner = value.members.find(member => member.role === 'OWNER');
      if (!this.isEdit && caregiver) this.eventForm.patchValue({ responsibleTutorId: caregiver.tutorId, escalationTutorId: owner?.tutorId || null });
    }});
    if (this.data?.petId) this.eventForm.patchValue({ petId: this.data.petId });
    if (this.isEdit) this.loadPlan();
  }

  selectType(type: EventType): void { this.eventForm.patchValue({ type }); }
  get costCurrencySymbol(): string { return currencySymbol(this.eventForm.controls.estimatedCostCurrency.value); }
  get hasUnlistedCurrency(): boolean { return !isListedCurrency(this.eventForm.controls.estimatedCostCurrency.value); }
  get calendarUnitLabel(): string {
    return this.calendarUnits.find(item => item.value === this.eventForm.controls.calendarUnit.value)?.label || '';
  }
  get isRecurring(): boolean { return this.eventForm.controls.scheduleKind.value !== 'ONE_TIME'; }
  clearRecurrence(): void {
    this.eventForm.patchValue({ scheduleKind: 'ONE_TIME', repetitions: null, endDate: null });
  }

  onSubmit(): void {
    this.eventForm.updateValueAndValidity();
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      this.toast.warning('Revise os campos destacados antes de salvar.');
      return;
    }
    const value = this.eventForm.getRawValue();
    const dailyTimes = parseDailyTimes(value.dailyTimes);
    const firstTime = value.scheduleKind === 'DAILY_TIMES' ? dailyTimes[0] : value.timeStart!;
    const starts = this.dateTime.combineDateAndTime(value.dateStart!, firstTime);
    const endTime = value.scheduleKind === 'DAILY_TIMES' ? dailyTimes.at(-1)! : value.timeStart!;
    const endAt = value.endDate
      ? this.dateTime.combineDateAndTime(value.endDate, endTime)
      : null;
    const request: CarePlanRequest = {
      petId: value.petId!, type: value.type!, title: value.title!.trim(),
      instructions: value.instructions?.trim() || null,
      startAt: this.dateTime.formatDateTimeForAPIWithoutTimezone(starts),
      zoneId: this.householdTimezone,
      scheduleRule: buildScheduleRule(
        value.scheduleKind, value.calendarUnit, Number(value.intervalCount), Number(value.fixedIntervalHours), value.dailyTimes,
        value.repetitions ? Number(value.repetitions) : null,
        endAt ? this.dateTime.formatDateTimeForAPIWithoutTimezone(endAt) : null
      ),
      reminderMinutesBefore: Number(value.reminderMinutesBefore),
      responsibleTutorId: value.responsibleTutorId,
      critical: value.critical,
      escalationDelayMinutes: value.critical ? Number(value.escalationDelayMinutes) : null,
      escalationTutorId: value.critical ? value.escalationTutorId : null,
      estimatedCostAmount: value.estimatedCostAmount ? Number(value.estimatedCostAmount) : null,
      estimatedCostCurrency: value.estimatedCostAmount ? normalizeCurrency(value.estimatedCostCurrency) : null
    };

    this.isLoading = true;
    const operation = this.isEdit
      ? this.care.updatePlan(this.data!.planId!, request)
      : this.care.createPlan(request);
    operation.subscribe({
      next: () => {
        this.eventsState.notifyEventUpdated();
        this.toast.success(this.isEdit ? 'Plano atualizado com segurança.' : 'Cuidado adicionado à rotina.');
        this.dialogRef.close(true);
      },
      error: error => {
        this.isLoading = false;
        this.toast.error(this.apiError.message(error, 'Não foi possível salvar o plano de cuidado.'));
      }
    });
  }

  onCancel(): void { this.dialogRef.close(false); }

  private loadPets(): void {
    this.petsService.getAllCached(0, 100).subscribe({
      next: page => this.pets = page.items,
      error: error => this.toast.error(this.apiError.message(error, 'Não foi possível carregar seus pets.'))
    });
  }

  private loadPlan(): void {
    this.isLoadingPlan = true;
    this.care.getPlan(this.data!.planId!).subscribe({
      next: plan => {
        this.householdTimezone = plan.timezone || this.householdTimezone;
        const start = this.dateTime.parseAPIDate(plan.startAtLocal);
        this.eventForm.patchValue({
          petId: plan.petId, type: plan.type, title: plan.title, instructions: plan.instructions || '',
          dateStart: start, timeStart: this.dateTime.extractTime(plan.startAtLocal),
          scheduleKind: plan.scheduleRule.kind,
          calendarUnit: plan.scheduleRule.calendarUnit || 'DAY',
          intervalCount: plan.scheduleRule.intervalCount || 1,
          fixedIntervalHours: (plan.scheduleRule.fixedIntervalMinutes || 720) / 60,
          dailyTimes: plan.scheduleRule.dailyTimes.join(', '),
          repetitions: plan.scheduleRule.repetitions || null,
          endDate: plan.scheduleRule.endAt ? this.dateTime.parseAPIDate(plan.scheduleRule.endAt, this.householdTimezone) : null,
          reminderMinutesBefore: plan.reminderMinutesBefore,
          responsibleTutorId: plan.responsibleTutorId,
          critical: plan.critical,
          escalationDelayMinutes: plan.escalationDelayMinutes || 60,
          escalationTutorId: plan.escalationTutorId || null,
          estimatedCostAmount: plan.estimatedCostAmount || null,
          estimatedCostCurrency: normalizeCurrency(plan.estimatedCostCurrency)
        });
        this.eventForm.controls.petId.disable();
        this.isLoadingPlan = false;
      },
      error: error => {
        this.toast.error(this.apiError.message(error, 'Não foi possível carregar este plano.'));
        this.dialogRef.close(false);
      }
    });
  }

  private endDateValidator(control: AbstractControl): ValidationErrors | null {
    const start = control.get('dateStart')?.value as Date | null;
    const end = control.get('endDate')?.value as Date | null;
    return start && end && end.getTime() < start.getTime() ? { finalDateBeforeStart: true } : null;
  }

  private scheduleValidator(control: AbstractControl): ValidationErrors | null {
    const kind = control.get('scheduleKind')?.value as ScheduleKind;
    if (kind === 'CALENDAR_INTERVAL') {
      const interval = Number(control.get('intervalCount')?.value);
      return !control.get('calendarUnit')?.value || interval < 1 || interval > 365 ? { scheduleInvalid: true } : null;
    }
    if (kind === 'FIXED_INTERVAL') {
      const hours = Number(control.get('fixedIntervalHours')?.value);
      return hours < 1 || hours > 8760 ? { scheduleInvalid: true } : null;
    }
    if (kind === 'DAILY_TIMES') {
      const raw = String(control.get('dailyTimes')?.value || '');
      const parsed = parseDailyTimes(raw);
      const tokens = raw.split(',').map(item => item.trim()).filter(Boolean);
      return !parsed.length || parsed.length !== tokens.length ? { scheduleInvalid: true } : null;
    }
    return null;
  }

  private startDateValidator(control: AbstractControl): ValidationErrors | null {
    const date = control.get('dateStart')?.value as Date | null;
    const time = control.get('timeStart')?.value as string | null;
    if (!date || !time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(date); start.setHours(hours, minutes, 0, 0);
    return !control.get('petId')?.disabled && start.getTime() < Date.now() - 5 * 60_000
      ? { startInPast: true }
      : null;
  }

  private escalationValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.get('critical')?.value) return null;
    const delay = Number(control.get('escalationDelayMinutes')?.value);
    return !control.get('escalationTutorId')?.value || delay < 15 || delay > 10080 ? { escalationInvalid: true } : null;
  }
}
