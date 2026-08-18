import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { EventStateService } from '../../core/services/event-state.service';
import { DateTimeService } from '../../core/services/datetime.service';
import { UserStateService } from '../../core/services/user-state.service';
import { DashboardOverview } from '../../core/models/dashboard.model';
import { CareOccurrence } from '../../core/models/care.model';
import { HouseholdService } from '../../core/services/household.service';
import { HouseholdSummary } from '../../core/models/household.model';
import { EventFormComponent } from '../../features/events/event-form.component';
import { PetFormComponent } from '../../features/pets/pet-form.component';
import { FooterComponent } from './ui/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    FooterComponent
  ],
  template: `
    <a class="skip-link" href="#main-content">Pular para o conteúdo</a>
    <div class="shell">
      <header class="rp-header">
        <a routerLink="/today" class="wordmark" aria-label="RotinaPet — abrir o dia de hoje">
          rotina<b>pet</b><span class="dot" aria-hidden="true"></span>
        </a>

        <nav class="desktop-nav" aria-label="Navegação principal">
          <a routerLink="/today" routerLinkActive="on"><mat-icon>wb_sunny</mat-icon>Hoje</a>
          <a routerLink="/pets" routerLinkActive="on"><mat-icon>pets</mat-icon>Pets</a>
          <a routerLink="/events" routerLinkActive="on"><mat-icon>calendar_month</mat-icon>Agenda</a>
          <a routerLink="/assistant" routerLinkActive="on"><mat-icon>auto_awesome</mat-icon>Assistente</a>
          <button mat-button [matMenuTriggerFor]="exploreMenu" [class.on]="isMoreActive">
            <span>Mais</span><mat-icon>expand_more</mat-icon>
          </button>
        </nav>

        <span class="spacer"></span>

        <div class="header-actions">
          @if (canAddContent) {
            @if (hasPets) {
              <button mat-flat-button class="primary-action" [matMenuTriggerFor]="createMenu">
                <mat-icon>add</mat-icon><span>Planejar cuidado</span>
              </button>
            } @else {
              <button mat-flat-button class="primary-action" (click)="startPrimaryAction()">
                <mat-icon>add</mat-icon><span>Cadastrar pet</span>
              </button>
            }
          }
          @if (currentHousehold) {
            <button mat-icon-button [matMenuTriggerFor]="householdMenu" class="household-switch"
                    matTooltip="Trocar família" [attr.aria-label]="'Trocar família: ' + currentHousehold.name">
              <mat-icon>home</mat-icon>
            </button>
          }
          <button mat-icon-button [matMenuTriggerFor]="notificationMenu"
                  class="bell" matTooltip="Cuidados próximos"
                  [attr.aria-label]="'Notificações: ' + upcomingEventsCount + ' cuidados próximos'">
            <mat-icon>notifications_none</mat-icon>
            @if (upcomingEventsCount > 0) {
              <span class="badge" aria-hidden="true">{{ upcomingEventsCount > 9 ? '9+' : upcomingEventsCount }}</span>
            }
          </button>
          <button mat-icon-button [matMenuTriggerFor]="userMenu" class="avatar-btn" aria-label="Abrir menu da conta">
            @if (currentUser?.avatar && !avatarFailed) {
              <img [src]="currentUser!.avatar" alt="" class="avatar-img" (error)="avatarFailed = true">
            } @else {
              <span class="avatar-fallback">{{ userInitial }}</span>
            }
          </button>
        </div>
      </header>

      <main class="rp-main" id="main-content" tabindex="-1">
        <router-outlet></router-outlet>
        <rp-footer [isDark]="isDark" (themeToggle)="toggleTheme()" />
      </main>

      <nav class="rp-bottom-nav" aria-label="Navegação principal">
        <a routerLink="/today" routerLinkActive="on"><mat-icon>wb_sunny</mat-icon><span>Hoje</span></a>
        <a routerLink="/pets" routerLinkActive="on"><mat-icon>pets</mat-icon><span>Pets</span></a>
        @if (canAddContent) {
          @if (hasPets) {
            <button type="button" class="bottom-create" [matMenuTriggerFor]="createMenu" aria-label="Adicionar cuidado">
              <mat-icon>add</mat-icon><span>Adicionar</span>
            </button>
          } @else {
            <button type="button" class="bottom-create" (click)="startPrimaryAction()" aria-label="Cadastrar pet">
              <mat-icon>add</mat-icon><span>Adicionar</span>
            </button>
          }
        }
        <a routerLink="/events" routerLinkActive="on"><mat-icon>calendar_month</mat-icon><span>Agenda</span></a>
        <button type="button" [matMenuTriggerFor]="exploreMenu" [class.on]="isMoreActive" aria-label="Abrir mais opções">
          <mat-icon>more_horiz</mat-icon><span>Mais</span>
        </button>
      </nav>
    </div>

    <mat-menu #exploreMenu="matMenu" xPosition="before">
      <div class="menu-section-title" (click)="$event.stopPropagation()">Outros espaços</div>
      <button mat-menu-item routerLink="/assistant"><mat-icon>auto_awesome</mat-icon><span>Assistente</span></button>
      <button mat-menu-item routerLink="/care-center"><mat-icon>assignment</mat-icon><span>Saúde e finanças</span></button>
      <button mat-menu-item routerLink="/family"><mat-icon>group</mat-icon><span>Quem cuida</span></button>
      <button mat-menu-item routerLink="/petshops"><mat-icon>near_me</mat-icon><span>Por perto</span></button>
    </mat-menu>

    <mat-menu #createMenu="matMenu" xPosition="before">
      <div class="menu-section-title" (click)="$event.stopPropagation()">Adicionar cuidado</div>
      <button mat-menu-item (click)="openAssistant()"><mat-icon>auto_awesome</mat-icon><span>Descrever com o assistente</span></button>
      <button mat-menu-item (click)="openPlan()"><mat-icon>edit_note</mat-icon><span>Preencher manualmente</span></button>
    </mat-menu>

    <mat-menu #householdMenu="matMenu" xPosition="before">
      <div class="family-menu-title" (click)="$event.stopPropagation()"><span>Rotina compartilhada</span><small>Selecione onde você está cuidando</small></div>
      <mat-divider></mat-divider>
      @for (item of householdList; track item.id) {
        <button mat-menu-item (click)="selectHousehold(item)">
          <mat-icon>{{ currentHousehold?.id === item.id ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
          <span>{{ item.name }}</span>
        </button>
      }
      <mat-divider></mat-divider>
      <button mat-menu-item routerLink="/family"><mat-icon>manage_accounts</mat-icon><span>Gerenciar família</span></button>
    </mat-menu>

    <mat-menu #userMenu="matMenu" xPosition="before">
      @if (currentUser) {
        <div class="menu-user-info" (click)="$event.stopPropagation()">
          <p class="menu-user-name">{{ currentUser.firstName }} {{ currentUser.lastName }}</p>
          <p class="menu-user-email">{{ currentUser.email }}</p>
        </div>
        <mat-divider></mat-divider>
      }
      <button mat-menu-item routerLink="/profile"><mat-icon>person_outline</mat-icon><span>Meu perfil</span></button>
      <button mat-menu-item routerLink="/integrations/whatsapp"><mat-icon>chat</mat-icon><span>WhatsApp</span></button>
      <button mat-menu-item (click)="toggleTheme()"><mat-icon>{{ isDark ? 'light_mode' : 'dark_mode' }}</mat-icon><span>{{ isDark ? 'Usar tema claro' : 'Usar tema escuro' }}</span></button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon><span>Sair</span></button>
    </mat-menu>

    <mat-menu #notificationMenu="matMenu" xPosition="before" class="rp-notif-menu">
      <div class="notif-head" (click)="$event.stopPropagation()">
        <span class="q-overline">Próximos 7 dias</span><h4>Cuidados próximos</h4>
      </div>
      <mat-divider></mat-divider>
      @if (upcomingEventsCount > 0) {
        @for (event of upcomingEventsList; track event.id) {
          <div class="notif-item" (click)="$event.stopPropagation()">
            <div class="q-ev-icon q-ev-{{ event.type.toLowerCase() }}"><mat-icon>{{ getEventIcon(event.type) }}</mat-icon></div>
            <div class="notif-tx">
              <span class="notif-desc">{{ event.title }}</span>
              <span class="notif-when">{{ formatEventDate(event.dueAt, event.timezone) }} @if (event.petName) { · {{ event.petName }} }</span>
            </div>
          </div>
        }
        <mat-divider></mat-divider>
        <button mat-menu-item routerLink="/events" class="notif-all"><span>Ver agenda completa</span></button>
      } @else {
        <div class="notif-empty" (click)="$event.stopPropagation()"><p>Por aqui está tranquilo — nenhum cuidado nos próximos dias.</p></div>
        <button mat-menu-item routerLink="/events" class="notif-all"><span>Abrir agenda</span></button>
      }
    </mat-menu>
  `,
  styles: [`
    .shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--q-bg); }
    .skip-link { position: fixed; top: 8px; left: 8px; z-index: 1000; transform: translateY(-160%); padding: 10px 14px; border-radius: var(--q-radius-md); background: var(--q-ink); color: var(--q-bg); font-weight: 700; }
    .skip-link:focus { transform: translateY(0); }

    .rp-header { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: var(--q-space-5); height: 68px; padding: 0 max(var(--q-space-5), calc((100vw - 1240px) / 2)); background: color-mix(in srgb, var(--q-bg) 90%, transparent); backdrop-filter: blur(16px); border-bottom: 1px solid color-mix(in srgb, var(--q-border) 76%, transparent); }
    .wordmark { display: inline-flex; align-items: baseline; flex: none; color: var(--q-ink); font: 700 1.35rem var(--q-font-display); letter-spacing: -.02em; text-decoration: none; }
    .wordmark b { color: var(--q-green-600); }
    .wordmark .dot { width: 7px; height: 7px; margin: 7px 0 0 3px; align-self: flex-start; border-radius: 50%; background: var(--q-ipe-500); }

    .desktop-nav { display: flex; align-items: center; gap: 2px; }
    .desktop-nav a, .desktop-nav button { min-height: 40px; display: inline-flex; align-items: center; gap: 7px; padding-inline: 13px; border-radius: var(--q-radius-pill); color: var(--q-text-2); font-size: .875rem; font-weight: 650; text-decoration: none; transition: color .15s ease, background .15s ease; }
    .desktop-nav a mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .desktop-nav a:hover, .desktop-nav button:hover { color: var(--q-ink); background: var(--q-surface-2); }
    .desktop-nav .on { color: var(--q-green-700); background: var(--q-green-50); }
    .desktop-nav button mat-icon { margin: 0; }
    .spacer { flex: 1; }

    .header-actions { display: flex; align-items: center; gap: 3px; }
    .header-actions .mat-mdc-icon-button { color: var(--q-text-2); }
    .primary-action { margin-right: var(--q-space-2); white-space: nowrap; }
    .household-switch { margin-right: 2px; color: var(--q-text-2); }
    .family-menu-title { display: grid; padding: 13px 16px; }
    .family-menu-title span { font-weight: 700; }
    .family-menu-title small { color: var(--q-text-2); }
    .menu-section-title { padding: 12px 16px 6px; color: var(--q-text-3); font-size: .7rem; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }

    .bell { position: relative; isolation: isolate; overflow: visible; }
    .bell .mat-icon { position: relative; z-index: 0; }
    .badge {
      position: absolute; top: 2px; right: 0; z-index: 1;
      min-width: 18px; height: 18px; padding: 0 5px;
      display: grid; place-items: center; box-sizing: border-box;
      line-height: 1; white-space: nowrap;
      border-radius: 9px; background: var(--q-ipe-500); color: #3A2D00;
      font-size: .6563rem; font-weight: 800; pointer-events: none;
      box-shadow: 0 0 0 2px var(--q-bg);
    }
    .avatar-btn { width: 40px; height: 40px; padding: 0; flex: none; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; }
    .avatar-img, .avatar-fallback { width: 32px; height: 32px; aspect-ratio: 1; border-radius: var(--q-organic-1); flex: none; }
    .avatar-img { display: block; object-fit: cover; }
    .avatar-fallback { display: grid; place-items: center; background: var(--q-green-600); color: var(--q-surface); font: 700 .9rem var(--q-font-display); }

    .rp-main { flex: 1; width: 100%; max-width: 1240px; margin: 0 auto; padding: var(--q-space-6) var(--q-space-5) var(--q-space-7); }

    .rp-bottom-nav { display: none; position: fixed; inset: auto 0 0; z-index: 100; justify-content: space-around; padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--q-surface) 94%, transparent); backdrop-filter: blur(16px); border-top: 1px solid var(--q-border); }
    .rp-bottom-nav a, .rp-bottom-nav button { min-width: 0; max-width: 84px; min-height: 52px; display: grid; flex: 1; justify-items: center; align-content: center; gap: 2px; padding: 4px 8px; border: 0; border-radius: var(--q-radius-md); background: transparent; color: var(--q-text-3); font: 650 .65rem var(--q-font-body); text-decoration: none; }
    .rp-bottom-nav mat-icon { width: 22px; height: 22px; font-size: 22px; }
    .rp-bottom-nav .on { color: var(--q-green-700); background: var(--q-green-50); }
    .rp-bottom-nav .bottom-create { position: relative; color: var(--q-green-700); font-weight: 750; }
    .rp-bottom-nav .bottom-create mat-icon { width: 34px; height: 34px; display: grid; place-items: center; margin-top: -14px; border: 4px solid var(--q-surface); border-radius: 50%; background: var(--q-green-600); color: var(--q-surface); font-size: 22px; line-height: 26px; box-sizing: content-box; }

    .menu-user-info { min-width: 220px; padding: 12px 16px 10px; }
    .menu-user-name { margin: 0; color: var(--q-ink); font-size: .9375rem; font-weight: 650; }
    .menu-user-email { margin: 2px 0 0; overflow: hidden; text-overflow: ellipsis; color: var(--q-text-3); font-size: .7813rem; }
    .notif-head { padding: 14px 16px 10px; }
    .notif-head h4 { margin: 4px 0 0; font-size: 1rem; }
    .notif-item { max-width: 340px; display: flex; align-items: center; gap: 12px; padding: 10px 16px; }
    .notif-tx { min-width: 0; display: grid; }
    .notif-desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--q-ink); font-size: .8438rem; font-weight: 650; }
    .notif-when { color: var(--q-text-2); font-size: .75rem; }
    .notif-all span { color: var(--q-green-600); font-weight: 650; }
    .notif-empty { max-width: 300px; padding: 18px 16px; }
    .notif-empty p { margin: 0; color: var(--q-text-2); font-size: .8438rem; }

    @media (max-width: 1080px) {
      .desktop-nav a mat-icon { display: none; }
      .household-switch { display: none; }
    }
    @media (max-width: 820px) {
      .desktop-nav { display: none; }
      .rp-bottom-nav { display: flex; }
      .rp-header { height: 60px; padding: 0 var(--q-space-3) 0 var(--q-space-4); gap: var(--q-space-2); }
      .rp-main { padding: var(--q-space-4) var(--q-space-4) calc(84px + env(safe-area-inset-bottom)); }
      .primary-action { display: none; }
      .household-switch { display: inline-flex; }
      .header-actions { gap: 4px; }
      .header-actions .mat-mdc-icon-button { width: 44px; height: 44px; }
    }
    @media (max-width: 430px) {
      .rp-header { padding-left: var(--q-space-3); }
      .wordmark { font-size: 1.18rem; }
      .header-actions { gap: 2px; }
      .header-actions .mat-mdc-icon-button { width: 44px; height: 44px; }
    }

    @media print {
      .rp-header, .rp-bottom-nav, .skip-link, rp-footer { display: none !important; }
      .shell { background: #fff; min-height: 0; }
      .rp-main { max-width: none; margin: 0; padding: 0; }
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: DashboardOverview | null = null;
  upcomingEventsCount = 0;
  upcomingEventsList: Array<CareOccurrence & { petName?: string }> = [];
  avatarFailed = false;
  isDark = false;
  private eventUpdateSubscription?: Subscription;
  private userUpdateSubscription?: Subscription;
  private householdSubscription?: Subscription;
  private householdListSubscription?: Subscription;
  private routerSubscription?: Subscription;
  currentHousehold: HouseholdSummary | null = null;
  householdList: HouseholdSummary[] = [];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private eventStateService: EventStateService,
    private dateTimeService: DateTimeService,
    private userStateService: UserStateService,
    private householdService: HouseholdService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.isDark = this.resolveIsDark();
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.householdSubscription = this.householdService.current$.subscribe(item => this.currentHousehold = item);
    this.householdListSubscription = this.householdService.households$.subscribe(items => this.householdList = items);
    this.householdService.load().subscribe({ error: () => { this.householdList = []; } });

    this.eventUpdateSubscription = this.eventStateService.eventUpdated$.subscribe(() => {
      this.loadOverview(true);
    });

    this.userUpdateSubscription = this.userStateService.userUpdated$.subscribe(() => {
      this.loadOverview(true);
    });

    this.routerSubscription = this.router.events.subscribe(event => {
      if (!(event instanceof NavigationEnd)) return;
      document.title = `${this.pageTitle(event.urlAfterRedirects)} · RotinaPet`;
      window.setTimeout(() => document.getElementById('main-content')?.focus({ preventScroll: true }), 0);
    });
  }

  ngOnDestroy(): void {
    this.eventUpdateSubscription?.unsubscribe();
    this.userUpdateSubscription?.unsubscribe();
    this.householdSubscription?.unsubscribe();
    this.householdListSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  get isMoreActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/care-center') || url.startsWith('/family') ||
      url.startsWith('/petshops') || url.startsWith('/veterinaries');
  }

  get canAddContent(): boolean { return this.currentHousehold?.role === 'OWNER'; }
  get hasPets(): boolean { return (this.currentUser?.totalPets || 0) > 0; }

  get userInitial(): string {
    return (this.currentUser?.firstName || '?').charAt(0).toUpperCase();
  }

  toggleTheme(): void {
    const next = this.isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('rp-theme', next);
    } catch { /* localStorage indisponível */ }
    this.isDark = next === 'dark';
  }

  private resolveIsDark(): boolean {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    return false;
  }

  loadUserProfile(): void {
    this.loadOverview();
  }

  private loadOverview(forceRefresh = false): void {
    this.dashboardService.getOverview(forceRefresh).subscribe({
      next: (overview) => {
        this.currentUser = overview;
        this.avatarFailed = false;
        const petNames = new Map(overview.pets.map(pet => [pet.id, pet.name]));
        this.upcomingEventsCount = overview.upcomingEvents.length;
        this.upcomingEventsList = overview.upcomingEvents.slice(0, 5).map(event => ({
          ...event,
          petName: petNames.get(event.petId)
        }));
      },
      error: () => {
        this.upcomingEventsCount = 0;
        this.upcomingEventsList = [];
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }

  openPlan(): void {
    const ref = this.dialog.open(EventFormComponent, {
      width: '680px',
      maxWidth: 'calc(100vw - 24px)'
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.eventStateService.notifyEventUpdated();
    });
  }

  startPrimaryAction(): void {
    if (this.hasPets) {
      this.openPlan();
      return;
    }
    const ref = this.dialog.open(PetFormComponent, {
      width: '520px',
      maxWidth: 'calc(100vw - 24px)'
    });
    ref.afterClosed().subscribe(saved => {
      if (!saved) return;
      this.userStateService.notifyUserUpdated();
      this.loadOverview(true);
    });
  }

  openAssistant(): void { void this.router.navigate(['/assistant']); }

  selectHousehold(item: HouseholdSummary): void {
    if (item.id === this.currentHousehold?.id) return;
    this.householdService.select(item).subscribe({ next: () => { this.eventStateService.notifyEventUpdated(); void this.router.navigate(['/today']); } });
  }

  getEventIcon(type: string): string {
    const icons: { [key: string]: string } = {
      VACCINE: 'vaccines',
      MEDICINE: 'medication',
      DIARY: 'book',
      BREED: 'favorite',
      SERVICE: 'content_cut'
    };
    return icons[type] || 'event';
  }

  formatEventDate(dateString: string, timezone?: string): string {
    if (!dateString) return 'Data inválida';

    const eventDate = this.dateTimeService.parseAPIDate(dateString, timezone || this.currentHousehold?.timezone);
    if (!eventDate) return 'Data inválida';

    const now = new Date();
    const time = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dayDiff = this.daysBetween(now, eventDate);

    if (dayDiff === 0) return `Hoje às ${time}`;
    if (dayDiff === 1) return `Amanhã às ${time}`;
    return eventDate.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  private daysBetween(from: Date, to: Date): number {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  private pageTitle(url: string): string {
    if (url.startsWith('/pets/')) return 'Perfil do pet';
    if (url.startsWith('/pets')) return 'Pets';
    if (url.startsWith('/events')) return 'Agenda';
    if (url.startsWith('/assistant')) return 'Assistente';
    if (url.startsWith('/care-center')) return 'Saúde e finanças';
    if (url.startsWith('/family')) return 'Quem cuida';
    if (url.startsWith('/petshops') || url.startsWith('/veterinaries')) return 'Por perto';
    if (url.startsWith('/profile')) return 'Meu perfil';
    if (url.startsWith('/integrations/whatsapp')) return 'WhatsApp';
    return 'Hoje';
  }

}
