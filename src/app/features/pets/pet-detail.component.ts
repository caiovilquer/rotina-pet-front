import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CareOccurrence } from '../../core/models/care.model';
import {
  HEALTH_MEASUREMENT_META,
  HEALTH_RECORD_META,
  HealthAttachment,
  HealthMeasurement,
  HealthMeasurementType,
  HealthRecord,
  HealthRecordType
} from '../../core/models/health.model';
import { Pet } from '../../core/models/pet.model';
import { ApiErrorService } from '../../core/services/api-error.service';
import { CareService } from '../../core/services/care.service';
import { DateTimeService } from '../../core/services/datetime.service';
import { HealthService } from '../../core/services/health.service';
import { MediaService } from '../../core/services/media.service';
import { PetService } from '../../core/services/pet.service';
import { ToastService } from '../../core/services/toast.service';
import { UserStateService } from '../../core/services/user-state.service';
import { HealthMeasurementChartComponent } from '../health/health-measurement-chart.component';
import { HealthMeasurementFormComponent } from '../health/health-measurement-form.component';
import { HealthRecordFormComponent } from '../health/health-record-form.component';
import { ConfirmDialogComponent } from '../../shared/components/ui/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state.component';
import { HintComponent } from '../../shared/components/ui/hint.component';
import { PetAvatarComponent } from '../../shared/components/ui/pet-avatar.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton.component';
import { PetFormComponent } from './pet-form.component';
import { HouseholdService } from '../../core/services/household.service';
import { DEFAULT_HOUSEHOLD_TIMEZONE } from '../../core/models/household.model';
import { KnowledgeSource, KnowledgeSourceStatus } from '../../core/models/assistant.model';
import { AssistantService } from '../../core/services/assistant.service';

type QuickAction = { label: string; helper: string; icon: string; recordType?: HealthRecordType; measurementType?: HealthMeasurementType };

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatMenuModule,
    MatProgressSpinnerModule, MatTooltipModule, PetAvatarComponent, EmptyStateComponent,
    SkeletonComponent, HealthMeasurementChartComponent, HintComponent
  ],
  templateUrl: './pet-detail.component.html',
  styleUrls: ['./pet-detail.component.css']
})
export class PetDetailComponent implements OnInit {
  readonly recordMeta = HEALTH_RECORD_META;
  readonly measurementMeta = HEALTH_MEASUREMENT_META;
  readonly recordTypes = Object.keys(HEALTH_RECORD_META) as HealthRecordType[];
  readonly measurementTypes = Object.keys(HEALTH_MEASUREMENT_META) as HealthMeasurementType[];
  readonly quickActions: QuickAction[] = [
    { label: 'Vacina', helper: 'Produto e lote', icon: 'vaccines', recordType: 'VACCINE' },
    { label: 'Medicamento', helper: 'Dose administrada', icon: 'medication', recordType: 'MEDICATION' },
    { label: 'Consulta', helper: 'Atendimento e custo', icon: 'local_hospital', recordType: 'CONSULTATION' },
    { label: 'Exame', helper: 'Resultado e arquivo', icon: 'biotech', recordType: 'EXAM' },
    { label: 'Sintoma', helper: 'Sinal observado', icon: 'sick', recordType: 'SYMPTOM' },
    { label: 'Peso', helper: 'Acompanhar evolução', icon: 'monitor_weight', measurementType: 'WEIGHT' },
    { label: 'Cuidado diário', helper: 'Banho, alimentação…', icon: 'favorite', recordType: 'DAILY_CARE' }
  ];

  pet: Pet | null = null;
  recentEvents: CareOccurrence[] = [];
  records: HealthRecord[] = [];
  measurements: HealthMeasurement[] = [];
  petId = 0;
  isLoading = true;
  isLoadingRecords = true;
  isLoadingMeasurements = true;
  isLoadingMore = false;
  recordPage = 0;
  recordTotal = 0;
  recordFilter: HealthRecordType | null = null;
  selectedMeasurementType: HealthMeasurementType = 'WEIGHT';
  canManagePet = false;
  canRecordHealth = false;
  householdTimezone = DEFAULT_HOUSEHOLD_TIMEZONE;
  knowledgeSources = new Map<string, KnowledgeSource>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly petService: PetService,
    private readonly careService: CareService,
    private readonly health: HealthService,
    private readonly media: MediaService,
    private readonly dateTime: DateTimeService,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly apiError: ApiErrorService,
    private readonly userState: UserStateService,
    private readonly householdService: HouseholdService,
    private readonly assistant: AssistantService,
  ) {}

  ngOnInit(): void {
    this.householdService.current$.subscribe(item => {
      this.canManagePet = item?.role === 'OWNER';
      this.canRecordHealth = !!item && item.role !== 'VIEWER';
      this.householdTimezone = item?.timezone || DEFAULT_HOUSEHOLD_TIMEZONE;
      if (item && this.petId > 0) this.loadRecentEvents();
    });
    this.route.paramMap.subscribe(params => {
      const rawId = Number(params.get('id'));
      if (!Number.isSafeInteger(rawId) || rawId <= 0) { void this.router.navigate(['/pets']); return; }
      this.petId = rawId;
      this.loadPetDetails();
      this.loadRecentEvents();
      this.loadRecords(true);
      this.loadMeasurements();
      this.loadKnowledgeSources();
    });
  }

  goBack(): void { void this.router.navigate(['/pets']); }
  viewAllEvents(): void { void this.router.navigate(['/events/pet', this.petId]); }
  viewReport(): void { void this.router.navigate(['/care-center'], { queryParams: { petId: this.petId } }); }
  askAboutPet(): void { void this.router.navigate(['/assistant'], { queryParams: { petId: this.petId } }); }

  editPet(): void {
    if (!this.pet) return;
    this.dialog.open(PetFormComponent, {
      width: '420px',
      data: { id: this.pet.id, name: this.pet.name, species: this.pet.species, breed: this.pet.breed, birthdate: this.pet.birthdate }
    }).afterClosed().subscribe(result => {
      if (!result) return;
      this.loadPetDetails();
      this.toast.success('Pet atualizado com sucesso!');
      this.userState.notifyUserUpdated();
    });
  }

  runQuickAction(action: QuickAction): void {
    if (action.measurementType) this.openMeasurement(action.measurementType);
    else this.openRecord(action.recordType);
  }

  openRecord(type?: HealthRecordType, record?: HealthRecord): void {
    if (!this.pet) return;
    this.dialog.open(HealthRecordFormComponent, {
      width: '800px', maxWidth: '98vw', autoFocus: false, restoreFocus: true,
      data: { petId: this.petId, petName: this.pet.name, type, record }
    }).afterClosed().subscribe(saved => { if (saved) this.loadRecords(true); });
  }

  openMeasurement(type?: HealthMeasurementType, measurement?: HealthMeasurement): void {
    if (!this.pet) return;
    this.dialog.open(HealthMeasurementFormComponent, {
      width: '640px', maxWidth: '98vw', autoFocus: false, restoreFocus: true,
      data: { petId: this.petId, petName: this.pet.name, type, measurement }
    }).afterClosed().subscribe(saved => { if (saved) this.loadMeasurements(); });
  }

  filterRecords(type: HealthRecordType | null): void {
    if (this.recordFilter === type) return;
    this.recordFilter = type;
    this.loadRecords(true);
  }

  selectMeasurementType(type: HealthMeasurementType): void { this.selectedMeasurementType = type; }
  filteredMeasurements(): HealthMeasurement[] { return this.measurements.filter(item => item.type === this.selectedMeasurementType); }

  loadMoreRecords(): void { this.recordPage += 1; this.loadRecords(false); }

  confirmDeleteRecord(record: HealthRecord): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Excluir registro clínico?',
        message: `“${record.title}” e seus anexos serão removidos da linha do tempo. Esta ação não pode ser desfeita.`,
        confirmLabel: 'Excluir registro', danger: true
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.health.deleteRecord(record).subscribe({
        next: () => { this.toast.success('Registro excluído.'); this.loadRecords(true); },
        error: error => this.toast.error(this.apiError.message(error, 'Não foi possível excluir o registro.'))
      });
    });
  }

  confirmDeleteMeasurement(measurement: HealthMeasurement): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Excluir medição?', message: 'Este ponto será removido da evolução de saúde.', confirmLabel: 'Excluir medição', danger: true }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.health.deleteMeasurement(measurement).subscribe({
        next: () => { this.toast.success('Medição excluída.'); this.loadMeasurements(); },
        error: error => this.toast.error(this.apiError.message(error, 'Não foi possível excluir a medição.'))
      });
    });
  }

  downloadAttachment(attachment: HealthAttachment): void {
    this.health.attachmentDownloadUrl(attachment.contentUrl).subscribe({
      next: result => {
        const anchor = document.createElement('a');
        anchor.href = result.url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
      },
      error: error => this.toast.error(this.apiError.message(error, 'Não foi possível abrir este anexo.'))
    });
  }

  confirmDeleteAttachment(record: HealthRecord, attachment: HealthAttachment): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Remover anexo?', message: `O arquivo “${attachment.filename}” será removido com segurança.`, confirmLabel: 'Remover arquivo', danger: true }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.media.delete(attachment.mediaAssetId).subscribe({
        next: () => { this.toast.success('Anexo removido.'); this.loadRecords(true); },
        error: error => this.toast.error(this.apiError.message(error, 'Não foi possível remover o anexo.'))
      });
    });
  }

  formatDate(value: string): string { return this.dateTime.formatForDisplay(value); }
  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
  }
  formatCareDateTime(event: CareOccurrence): string {
    return (this.dateTime.parseAPIDate(event.dueAt, event.timezone || this.householdTimezone) || new Date(event.dueAt))
      .toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
  }
  formatMoney(record: HealthRecord): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: record.currency || 'BRL' }).format(record.costAmount || 0);
  }
  formatBytes(bytes: number): string { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`; }
  getAgeDisplay(birthDate: string): string {
    const birth = new Date(`${birthDate}T12:00:00`); const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months -= 1;
    return months >= 24 ? `${Math.floor(months / 12)} anos` : `${Math.max(0, months)} ${months === 1 ? 'mês' : 'meses'}`;
  }
  eventIcon(type: string): string {
    return ({ VACCINE: 'vaccines', MEDICINE: 'medication', DIARY: 'book', BREED: 'favorite', SERVICE: 'content_cut' } as Record<string, string>)[type] || 'event';
  }
  eventStatus(event: CareOccurrence): string {
    if (event.status === 'COMPLETED') return 'Concluído';
    return (this.dateTime.parseAPIDate(event.dueAt, event.timezone || this.householdTimezone)?.getTime() || 0) < Date.now() ? 'Atrasado' : 'Pendente';
  }

  knowledgeStatus(mediaAssetId: string): KnowledgeSourceStatus | null {
    return this.knowledgeSources.get(mediaAssetId)?.status || null;
  }

  knowledgeStatusLabel(mediaAssetId: string): string {
    const status = this.knowledgeStatus(mediaAssetId);
    if (status === 'READY') return 'Disponível no assistente';
    if (status === 'FAILED') return 'Não foi possível preparar';
    if (status === 'PENDING' || status === 'INDEXING') return 'Preparando para pesquisa';
    return 'Ainda não preparado para pesquisa';
  }

  retryKnowledge(mediaAssetId: string): void {
    const source = this.knowledgeSources.get(mediaAssetId);
    if (!source || source.status !== 'FAILED') return;
    this.assistant.reindex(source.id).subscribe({
      next: updated => { this.knowledgeSources.set(mediaAssetId, updated); this.toast.success('Vamos preparar o documento novamente.'); },
      error: error => this.toast.error(this.apiError.message(error, 'Não foi possível tentar novamente.'))
    });
  }

  private loadPetDetails(): void {
    this.isLoading = true;
    this.petService.getByIdCached(this.petId).subscribe({
      next: pet => { this.pet = pet; this.isLoading = false; },
      error: error => {
        this.isLoading = false;
        if (error.status === 404) void this.router.navigate(['/pets']);
        else this.toast.error(this.apiError.message(error, 'Não foi possível carregar este pet.'));
      }
    });
  }

  private loadRecentEvents(): void {
    const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - 30);
    const to = new Date(now); to.setDate(to.getDate() + 90);
    this.careService.search({
      from: this.dateTime.formatCareDateTimeForAPI(from, this.householdTimezone),
      to: this.dateTime.formatCareDateTimeForAPI(to, this.householdTimezone), petId: this.petId, page: 0, size: 20
    }).subscribe({
      next: page => this.recentEvents = page.items.sort((a, b) =>
        (this.dateTime.parseAPIDate(a.dueAt, a.timezone || this.householdTimezone)?.getTime() || 0) -
        (this.dateTime.parseAPIDate(b.dueAt, b.timezone || this.householdTimezone)?.getTime() || 0)
      ).slice(0, 4),
      error: () => this.recentEvents = []
    });
  }

  private loadRecords(reset: boolean): void {
    if (reset) { this.recordPage = 0; this.isLoadingRecords = true; } else this.isLoadingMore = true;
    this.health.listRecords(this.petId, this.recordPage, 12, this.recordFilter || undefined).subscribe({
      next: page => {
        this.records = reset ? page.items : [...this.records, ...page.items];
        this.recordTotal = page.total; this.isLoadingRecords = false; this.isLoadingMore = false;
        this.loadKnowledgeSources();
      },
      error: error => {
        this.isLoadingRecords = false; this.isLoadingMore = false;
        this.toast.error(this.apiError.message(error, 'Não foi possível carregar a linha do tempo de saúde.'));
      }
    });
  }

  private loadMeasurements(): void {
    this.isLoadingMeasurements = true;
    this.health.listMeasurements(this.petId).subscribe({
      next: items => { this.measurements = items; this.isLoadingMeasurements = false; },
      error: error => {
        this.isLoadingMeasurements = false;
        this.toast.error(this.apiError.message(error, 'Não foi possível carregar as medições.'));
      }
    });
  }

  private loadKnowledgeSources(): void {
    if (this.petId <= 0) return;
    this.assistant.knowledgeSources(this.petId).subscribe({
      next: sources => this.knowledgeSources = new Map(sources.map(source => [source.resourceId, source])),
      error: () => this.knowledgeSources = new Map()
    });
  }
}
