import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CareDraft } from '../../core/models/care-draft.model';
import { HouseholdOverview, HouseholdSummary } from '../../core/models/household.model';
import { AssistantService } from '../../core/services/assistant.service';
import { ApiErrorService } from '../../core/services/api-error.service';
import { CareDraftService } from '../../core/services/care-draft.service';
import { DateTimeService } from '../../core/services/datetime.service';
import { EventStateService } from '../../core/services/event-state.service';
import { HouseholdService } from '../../core/services/household.service';
import { PetService } from '../../core/services/pet.service';
import { ToastService } from '../../core/services/toast.service';
import { AssistantPageComponent } from './assistant-page.component';

describe('AssistantPageComponent', () => {
  let fixture: ComponentFixture<AssistantPageComponent>;
  let component: AssistantPageComponent;
  let drafts: jasmine.SpyObj<CareDraftService>;
  let assistant: jasmine.SpyObj<AssistantService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const household: HouseholdSummary = {
    id: 'household-1', name: 'Casa da Luna', role: 'OWNER', isDefault: true, memberCount: 1,
    timezone: 'America/Sao_Paulo'
  };
  const overview: HouseholdOverview = {
    household,
    members: [{
      id: 'member-1', tutorId: 10, firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com',
      role: 'OWNER', joinedAt: '2026-07-01T12:00:00Z'
    }],
    pendingInvitations: [], recentActivity: [], recentHandoffs: []
  };
  const readyDraft: CareDraft = {
    id: 'draft-1', version: 1, channel: 'WEB', inputType: 'TEXT', status: 'READY',
    fields: {
      petId: 1, type: 'MEDICINE', title: 'Medicamento', instructions: null,
      startAt: '2026-08-15T11:00:00Z', startAtLocal: '2026-08-15T08:00:00', timezone: 'America/Sao_Paulo',
      scheduleRule: { kind: 'ONE_TIME', dailyTimes: [] }, reminderMinutesBefore: 0,
      responsibleTutorId: 10, critical: false, escalationDelayMinutes: null, escalationTutorId: null,
      estimatedCostAmount: null, estimatedCostCurrency: null
    },
    evidence: {}, missingFields: [], warnings: [], provenance: { TITLE: 'EXPLICIT' }, promptVersion: 'care-draft-v2-openai',
    createdAt: '2026-07-31T12:00:00Z', updatedAt: '2026-07-31T12:00:01Z', expiresAt: '2026-08-01T12:00:00Z'
  };

  beforeEach(async () => {
    drafts = jasmine.createSpyObj<CareDraftService>('CareDraftService', ['generate', 'list', 'get', 'correct', 'confirm', 'cancel', 'feedback']);
    drafts.list.and.returnValue(of({ items: [], total: 0, page: 0, size: 6 }));
    drafts.correct.and.returnValue(of({ ...readyDraft, version: 2 }));
    drafts.confirm.and.returnValue(of({
      draft: { ...readyDraft, version: 3, status: 'CONFIRMED', planId: 'plan-1', confirmedAt: '2026-07-31T12:10:00Z' },
      plan: { id: 'plan-1' } as never
    }));
    assistant = jasmine.createSpyObj<AssistantService>('AssistantService', ['ask', 'feedback', 'attachmentUrl']);
    assistant.feedback.and.returnValue(of(void 0));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);
    const households = jasmine.createSpyObj<HouseholdService>('HouseholdService', ['overview'], { current$: of(household) });
    households.overview.and.returnValue(of(overview));
    const pets = jasmine.createSpyObj<PetService>('PetService', ['getAllCached']);
    pets.getAllCached.and.returnValue(of({ items: [{ id: 1, name: 'Luna', species: 'cat' }], total: 1, page: 0, size: 100 }));
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    const events = jasmine.createSpyObj<EventStateService>('EventStateService', ['notifyEventUpdated']);
    const route = {
      snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({ petId: '1' }) },
      paramMap: of(convertToParamMap({}))
    };

    await TestBed.configureTestingModule({
      imports: [AssistantPageComponent],
      providers: [
        provideRouter([]), provideNoopAnimations(), DateTimeService, ApiErrorService,
        { provide: ActivatedRoute, useValue: route },
        { provide: CareDraftService, useValue: drafts },
        { provide: AssistantService, useValue: assistant },
        { provide: HouseholdService, useValue: households },
        { provide: PetService, useValue: pets },
        { provide: ToastService, useValue: toast },
        { provide: EventStateService, useValue: events },
        { provide: MatDialog, useValue: dialog },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssistantPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('preserves the instruction and offers the manual form when the provider is unavailable', () => {
    drafts.generate.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 502, error: { error: 'AI_PROVIDER_UNAVAILABLE', message: 'internal text must not be required' }
    })));
    component.composer.controls.instruction.setValue('Dar remédio para Luna amanhã às 08:00');

    component.generate();
    fixture.detectChanges();

    expect(component.composer.controls.instruction.value).toContain('Dar remédio');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Seu texto foi preservado');
    expect(fixture.nativeElement.textContent).toContain('assistente está indisponível');
    expect(fixture.nativeElement.textContent).toContain('Preencher manualmente');
  });

  it('requires saving a review before confirmation and then confirms explicitly', () => {
    component['setDraft'](readyDraft);
    component.review.controls.title.setValue('Medicamento revisado');
    component.review.controls.title.markAsDirty();
    expect(component.canConfirm).toBeFalse();

    component.saveReview();
    expect(drafts.correct).toHaveBeenCalled();
    expect(component.review.pristine).toBeTrue();

    component.confirm();
    expect(drafts.confirm).toHaveBeenCalledWith('draft-1', 2);
    expect(component.draft?.status).toBe('CONFIRMED');
  });

  it('renders an insufficient answer without inventing sources', () => {
    assistant.ask.and.returnValue(of({
      answerId: 'answer-1', kind: 'RAG',
      answer: 'Não encontrei informação suficiente nas fontes disponíveis.', citations: [],
      insufficientEvidence: true, suggestedFollowUps: ['Confira se o documento já foi indexado.'],
      generatedAt: '2026-07-31T12:00:00Z'
    }));
    component.question.setValue({ petId: 1, text: 'O que consta no exame?' });

    component.askQuestion();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informação insuficiente');
    expect(fixture.nativeElement.textContent).toContain('Não encontrei informação suficiente');
    expect(fixture.nativeElement.querySelector('.sources')).toBeNull();
  });

  it('opens only safe citation URLs with opener isolation', () => {
    const citation = {
      sourceType: 'HEALTH_ATTACHMENT' as const, sourceId: 'source-1', resourceId: 'media-1',
      title: 'Exame.pdf', page: 1, excerpt: 'Trecho autorizado', contentUrl: null
    };
    assistant.attachmentUrl.and.returnValue(of({ url: 'https://signed.example/exam.pdf' }));
    const anchor = document.createElement('a');
    spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.returnValue(anchor);

    component.openCitation(citation);

    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toContain('noopener');
    expect(anchor.rel).toContain('noreferrer');
    expect(anchor.click).toHaveBeenCalled();
  });
});
