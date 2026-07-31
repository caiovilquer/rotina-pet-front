import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CareDraft, CareDraftField, CareDraftProvenance } from '../../core/models/care-draft.model';
import { AssistantCitation, PetHistoryAnswer } from '../../core/models/assistant.model';
import { CalendarIntervalUnit, CarePlanRequest, ScheduleKind } from '../../core/models/care.model';
import { CURRENCY_OPTIONS, normalizeCurrency } from '../../core/models/currency.model';
import { EventType } from '../../core/models/event.model';
import { DEFAULT_HOUSEHOLD_TIMEZONE, HouseholdMember, HouseholdSummary } from '../../core/models/household.model';
import { PetSummary } from '../../core/models/pet.model';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AssistantService } from '../../core/services/assistant.service';
import { CareDraftService } from '../../core/services/care-draft.service';
import { DateTimeService } from '../../core/services/datetime.service';
import { EventStateService } from '../../core/services/event-state.service';
import { HouseholdService } from '../../core/services/household.service';
import { PetService } from '../../core/services/pet.service';
import { ToastService } from '../../core/services/toast.service';
import { EventFormComponent } from '../events/event-form.component';
import { buildScheduleRule, parseDailyTimes } from '../../shared/components/care-plan-fields';

@Component({
  selector: 'app-assistant-page',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatDialogModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule
  ],
  templateUrl: './assistant-page.component.html',
  styleUrls: ['./assistant-page.component.css']
})
export class AssistantPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly subscriptions = new Subscription();
  currentHousehold: HouseholdSummary | null = null;
  pets: PetSummary[] = [];
  members: HouseholdMember[] = [];
  recentDrafts: CareDraft[] = [];
  draft: CareDraft | null = null;
  isLoading = false;
  isSaving = false;
  isConfirming = false;
  isAsking = false;
  answer: PetHistoryAnswer | null = null;
  answerFeedbackSent = false;
  questionError: string | null = null;
  draftError: string | null = null;

  readonly questionSuggestions = [
    'Quando foi a última vacina?',
    'Quais cuidados estão atrasados?',
    'Como evoluiu o peso nos últimos meses?',
    'O que consta nas notas e documentos?',
  ];

  readonly question = this.fb.group({
    petId: this.fb.control<number | null>(null, Validators.required),
    text: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(1000)])
  });

  readonly composer = this.fb.group({
    instruction: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(4000)])
  });

  readonly review = this.fb.group({
    petId: this.fb.control<number | null>(null, Validators.required),
    type: this.fb.control<EventType | null>(null, Validators.required),
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    instructions: this.fb.nonNullable.control('', Validators.maxLength(2000)),
    dateStart: this.fb.nonNullable.control('', Validators.required),
    timeStart: this.fb.nonNullable.control('', Validators.required),
    scheduleKind: this.fb.nonNullable.control<ScheduleKind>('ONE_TIME'),
    calendarUnit: this.fb.nonNullable.control<CalendarIntervalUnit>('DAY'),
    intervalCount: this.fb.nonNullable.control(1, [Validators.min(1), Validators.max(365)]),
    fixedIntervalHours: this.fb.nonNullable.control(12, [Validators.min(1), Validators.max(8760)]),
    dailyTimes: this.fb.nonNullable.control('08:00, 20:00'),
    repetitions: this.fb.control<number | null>(null, Validators.min(1)),
    endDate: this.fb.nonNullable.control(''),
    reminderMinutesBefore: this.fb.nonNullable.control(0, [Validators.min(0), Validators.max(10080)]),
    responsibleTutorId: this.fb.control<number | null>(null, Validators.required),
    critical: this.fb.nonNullable.control(false),
    escalationDelayMinutes: this.fb.control<number | null>(60),
    escalationTutorId: this.fb.control<number | null>(null),
    estimatedCostAmount: this.fb.control<number | null>(null, [Validators.min(0.01), Validators.max(9999999999.99)]),
    estimatedCostCurrency: this.fb.nonNullable.control('BRL')
  });

  readonly eventTypes: Array<{ value: EventType; label: string }> = [
    { value: 'VACCINE', label: 'Vacina' }, { value: 'MEDICINE', label: 'Remédio' },
    { value: 'DIARY', label: 'Rotina' }, { value: 'BREED', label: 'Reprodução' },
    { value: 'SERVICE', label: 'Serviço' }
  ];
  readonly scheduleKinds: Array<{ value: ScheduleKind; label: string }> = [
    { value: 'ONE_TIME', label: 'Uma vez' },
    { value: 'CALENDAR_INTERVAL', label: 'Intervalo de calendário' },
    { value: 'FIXED_INTERVAL', label: 'A cada tantas horas' },
    { value: 'DAILY_TIMES', label: 'Horários todos os dias' }
  ];
  readonly calendarUnits: Array<{ value: CalendarIntervalUnit; label: string }> = [
    { value: 'DAY', label: 'Dia(s)' }, { value: 'WEEK', label: 'Semana(s)' },
    { value: 'MONTH', label: 'Mês(es)' }, { value: 'YEAR', label: 'Ano(s)' }
  ];
  readonly reminders = [
    { value: 0, label: 'No horário' }, { value: 15, label: '15 minutos antes' },
    { value: 30, label: '30 minutos antes' }, { value: 60, label: '1 hora antes' },
    { value: 1440, label: '1 dia antes' }
  ];
  readonly currencies = CURRENCY_OPTIONS;

  constructor(
    private readonly drafts: CareDraftService,
    private readonly assistant: AssistantService,
    private readonly petsService: PetService,
    private readonly households: HouseholdService,
    private readonly dateTime: DateTimeService,
    private readonly toast: ToastService,
    private readonly apiError: ApiErrorService,
    private readonly events: EventStateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.households.current$.subscribe(value => {
      this.currentHousehold = value;
      if (value?.role === 'OWNER' && !this.draft && !this.route.snapshot.paramMap.get('draftId')) this.loadRecent();
    }));
    this.households.overview().subscribe({
      next: overview => {
        this.currentHousehold = overview.household;
        this.members = overview.members;
        if (overview.household.role === 'OWNER' && !this.draft && !this.route.snapshot.paramMap.get('draftId')) this.loadRecent();
      },
      error: () => { this.members = []; }
    });
    this.petsService.getAllCached(0, 100).subscribe({
      next: page => {
        this.pets = page.items;
        const requestedPetId = Number(this.route.snapshot.queryParamMap.get('petId'));
        const selected = page.items.find(item => item.id === requestedPetId) || page.items[0];
        if (selected) this.question.controls.petId.setValue(selected.id);
      },
      error: error => this.toast.error(this.apiError.message(error, 'Não foi possível carregar seus pets.'))
    });
    this.subscriptions.add(this.route.paramMap.subscribe(params => {
      const id = params.get('draftId');
      if (id) this.loadDraft(id);
      else { this.draft = null; this.loadRecent(); }
    }));
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }

  get canCreate(): boolean { return this.currentHousehold?.role === 'OWNER'; }
  get isRecurring(): boolean { return this.review.controls.scheduleKind.value !== 'ONE_TIME'; }
  get canEdit(): boolean { return !!this.draft && ['READY', 'NEEDS_INPUT'].includes(this.draft.status); }
  get canConfirm(): boolean { return this.draft?.status === 'READY' && !this.review.dirty; }

  askQuestion(): void {
    if (this.question.invalid) {
      this.question.markAllAsTouched();
      return;
    }
    const value = this.question.getRawValue();
    this.isAsking = true;
    this.answer = null;
    this.questionError = null;
    this.answerFeedbackSent = false;
    this.assistant.ask(value.petId!, value.text).subscribe({
      next: answer => { this.answer = answer; this.isAsking = false; },
      error: error => {
        this.isAsking = false;
        this.questionError = this.apiError.message(error, 'Não foi possível consultar o histórico agora. Tente novamente.');
      }
    });
  }

  useQuestionSuggestion(value: string): void {
    this.question.controls.text.setValue(value);
    this.askQuestion();
  }

  sendAnswerFeedback(positive: boolean): void {
    if (!this.answer || this.answerFeedbackSent) return;
    this.assistant.feedback(this.answer.answerId, positive).subscribe({
      next: () => { this.answerFeedbackSent = true; this.toast.success('Obrigado pelo feedback.'); },
      error: () => this.toast.error('Não foi possível registrar o feedback.')
    });
  }

  openCitation(citation: AssistantCitation): void {
    if (citation.sourceType !== 'HEALTH_ATTACHMENT') return;
    this.assistant.attachmentUrl(citation).subscribe({
      next: result => {
        let url: URL;
        try {
          url = new URL(result.url, window.location.origin);
          if (!['https:', 'http:'].includes(url.protocol)) throw new Error('unsafe_protocol');
        } catch {
          this.toast.error('A fonte retornou um endereço inválido e não foi aberta.');
          return;
        }
        const anchor = document.createElement('a');
        anchor.href = url.href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
      },
      error: error => this.toast.error(this.apiError.message(error, 'Não foi possível abrir esta fonte.'))
    });
  }

  citationType(citation: AssistantCitation): string {
    return ({
      HEALTH_RECORD: 'Registro de saúde', HEALTH_MEASUREMENT: 'Medição de saúde', HEALTH_ATTACHMENT: 'Documento', CARE_PLAN: 'Agenda',
      VETERINARY_SUMMARY_NOTE: 'Nota do resumo'
    } as Record<AssistantCitation['sourceType'], string>)[citation.sourceType];
  }

  answerTitle(answer: PetHistoryAnswer): string {
    if (answer.kind === 'REFUSAL') return 'Limite de segurança';
    return answer.insufficientEvidence ? 'Informação insuficiente' : 'Encontrei estas informações';
  }

  answerIcon(answer: PetHistoryAnswer): string {
    if (answer.kind === 'REFUSAL') return 'health_and_safety';
    return answer.insufficientEvidence ? 'manage_search' : 'verified';
  }

  generate(): void {
    if (this.composer.invalid || !this.canCreate) {
      this.composer.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.draftError = null;
    this.drafts.generate(this.composer.controls.instruction.value).subscribe({
      next: draft => {
        this.isLoading = false;
        void this.router.navigate(['/assistant/drafts', draft.id]);
      },
      error: error => {
        this.isLoading = false;
        this.draftError = this.apiError.message(
          error,
          'O assistente não está disponível agora. O formulário manual continua funcionando.'
        );
      }
    });
  }

  saveReview(): void {
    if (!this.draft || !this.canEdit) return;
    if (this.review.invalid || !this.scheduleIsValid()) {
      this.review.markAllAsTouched();
      this.toast.warning('Revise os campos destacados antes de continuar.');
      return;
    }
    this.isSaving = true;
    this.drafts.correct(this.draft.id, this.draft.version, this.toCarePlanRequest()).subscribe({
      next: draft => {
        this.isSaving = false;
        this.setDraft(draft);
        this.toast.success(draft.status === 'READY' ? 'Rascunho pronto para confirmação.' : 'Revisão salva.');
      },
      error: error => {
        this.isSaving = false;
        this.toast.error(this.apiError.message(error, 'Não foi possível salvar a revisão.'));
      }
    });
  }

  confirm(): void {
    if (!this.draft || !this.canConfirm) return;
    this.isConfirming = true;
    this.drafts.confirm(this.draft.id, this.draft.version).subscribe({
      next: result => {
        this.isConfirming = false;
        this.setDraft(result.draft);
        this.events.notifyEventUpdated();
        this.toast.success('Plano criado após sua confirmação.');
      },
      error: error => {
        this.isConfirming = false;
        this.toast.error(this.apiError.message(error, 'Não foi possível confirmar o plano.'));
      }
    });
  }

  cancel(): void {
    if (!this.draft || !this.canEdit) return;
    this.drafts.cancel(this.draft.id, this.draft.version).subscribe({
      next: draft => { this.setDraft(draft); this.toast.success('Rascunho cancelado.'); },
      error: error => this.toast.error(this.apiError.message(error, 'Não foi possível cancelar o rascunho.'))
    });
  }

  openManual(): void {
    if (!this.canCreate) return;
    const ref = this.dialog.open(EventFormComponent, { width: '680px', maxWidth: 'calc(100vw - 24px)' });
    ref.afterClosed().subscribe(saved => { if (saved) this.events.notifyEventUpdated(); });
  }

  sendFeedback(positive: boolean): void {
    if (!this.draft) return;
    this.drafts.feedback(this.draft.id, positive).subscribe({
      next: () => this.toast.success('Obrigado pelo feedback.'),
      error: () => this.toast.error('Não foi possível registrar o feedback.')
    });
  }

  provenance(field: CareDraftField): CareDraftProvenance | null {
    return this.draft?.provenance[field] || null;
  }

  provenanceLabel(field: CareDraftField): string {
    const labels: Record<CareDraftProvenance, string> = {
      EXPLICIT: 'Informado por você', NORMALIZED: 'Normalizado', SYSTEM_DEFAULT: 'Padrão visível',
      NEEDS_REVIEW: 'Precisa de revisão', MISSING: 'Campo ausente'
    };
    const value = this.provenance(field);
    return value ? labels[value] : '';
  }

  statusLabel(status: CareDraft['status']): string {
    return ({
      PROCESSING: 'Processando', NEEDS_INPUT: 'Precisa de informações', READY: 'Pronto para confirmar',
      CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', EXPIRED: 'Expirado', FAILED: 'Falhou'
    } as Record<CareDraft['status'], string>)[status];
  }

  private loadDraft(id: string): void {
    this.isLoading = true;
    this.drafts.get(id).subscribe({
      next: draft => { this.isLoading = false; this.setDraft(draft); },
      error: error => { this.isLoading = false; this.toast.error(this.apiError.message(error, 'Rascunho não encontrado.')); }
    });
  }

  private loadRecent(): void {
    if (!this.canCreate) return;
    this.drafts.list(0, 6).subscribe({ next: page => this.recentDrafts = page.items, error: () => this.recentDrafts = [] });
  }

  private setDraft(draft: CareDraft): void {
    this.draft = draft;
    const fields = draft.fields;
    const local = fields.startAtLocal || '';
    const [dateStart = '', rawTime = ''] = local.split('T');
    const schedule = fields.scheduleRule;
    this.review.patchValue({
      petId: fields.petId,
      type: fields.type,
      title: fields.title || '',
      instructions: fields.instructions || '',
      dateStart,
      timeStart: rawTime.slice(0, 5),
      scheduleKind: schedule?.kind || 'ONE_TIME',
      calendarUnit: schedule?.calendarUnit || 'DAY',
      intervalCount: schedule?.intervalCount || 1,
      fixedIntervalHours: (schedule?.fixedIntervalMinutes || 720) / 60,
      dailyTimes: schedule?.dailyTimes?.join(', ') || '08:00, 20:00',
      repetitions: schedule?.repetitions || null,
      endDate: this.localDate(schedule?.endAt, fields.timezone),
      reminderMinutesBefore: fields.reminderMinutesBefore,
      responsibleTutorId: fields.responsibleTutorId,
      critical: fields.critical,
      escalationDelayMinutes: fields.escalationDelayMinutes || 60,
      escalationTutorId: fields.escalationTutorId,
      estimatedCostAmount: fields.estimatedCostAmount,
      estimatedCostCurrency: normalizeCurrency(fields.estimatedCostCurrency)
    });
    this.review.markAsPristine();
  }

  private toCarePlanRequest(): CarePlanRequest {
    const value = this.review.getRawValue();
    const dailyTimes = parseDailyTimes(value.dailyTimes);
    const firstTime = value.scheduleKind === 'DAILY_TIMES' ? dailyTimes[0] : value.timeStart;
    const start = this.localDateTime(value.dateStart, firstTime);
    const lastTime = value.scheduleKind === 'DAILY_TIMES' ? dailyTimes.at(-1)! : value.timeStart;
    const endAt = value.endDate ? this.localDateTime(value.endDate, lastTime) : null;
    return {
      petId: value.petId!, type: value.type!, title: value.title.trim(), instructions: value.instructions.trim() || null,
      startAt: this.dateTime.formatDateTimeForAPIWithoutTimezone(start),
      zoneId: this.draft?.fields.timezone || this.currentHousehold?.timezone || DEFAULT_HOUSEHOLD_TIMEZONE,
      scheduleRule: buildScheduleRule(
        value.scheduleKind, value.calendarUnit, Number(value.intervalCount), Number(value.fixedIntervalHours),
        value.dailyTimes, value.repetitions ? Number(value.repetitions) : null,
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
  }

  private scheduleIsValid(): boolean {
    const value = this.review.getRawValue();
    if (value.scheduleKind === 'DAILY_TIMES') return parseDailyTimes(value.dailyTimes).length > 0;
    if (value.scheduleKind === 'FIXED_INTERVAL') return value.fixedIntervalHours >= 1;
    if (value.scheduleKind === 'CALENDAR_INTERVAL') return value.intervalCount >= 1;
    return true;
  }

  private localDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00`);
  }

  private localDate(value?: string | null, timezone?: string | null): string {
    if (!value) return '';
    const parsed = this.dateTime.parseAPIDate(value, timezone || undefined);
    if (!parsed) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
