import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, switchMap, take, timer } from 'rxjs';
import { WhatsAppConnection, WhatsAppLinkToken } from '../../core/models/whatsapp.model';
import { HouseholdSummary } from '../../core/models/household.model';
import { ApiErrorService } from '../../core/services/api-error.service';
import { HouseholdService } from '../../core/services/household.service';
import { ToastService } from '../../core/services/toast.service';
import { WhatsAppIntegrationService } from '../../core/services/whatsapp-integration.service';
import { ConfirmDialogComponent } from '../../shared/components/ui/confirm-dialog.component';

@Component({
  selector: 'app-whatsapp-integration',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './whatsapp-integration.component.html',
  styleUrls: ['./whatsapp-integration.component.css']
})
export class WhatsAppIntegrationComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  private polling?: Subscription;
  currentHousehold: HouseholdSummary | null = null;
  connection: WhatsAppConnection | null = null;
  linkToken: WhatsAppLinkToken | null = null;
  loading = true;
  saving = false;

  constructor(
    private readonly whatsapp: WhatsAppIntegrationService,
    private readonly households: HouseholdService,
    private readonly toast: ToastService,
    private readonly apiError: ApiErrorService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.households.current$.subscribe(household => {
      const changed = household?.id !== this.currentHousehold?.id;
      this.currentHousehold = household;
      if (household && changed) {
        this.linkToken = null;
        this.polling?.unsubscribe();
        this.load();
      }
    }));
    if (!this.currentHousehold) {
      this.subscriptions.add(this.households.load().subscribe({ error: error => this.fail(error) }));
    }
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  get canManage(): boolean { return this.currentHousehold?.role === 'OWNER'; }
  get isConnected(): boolean { return this.connection?.status === 'CONNECTED'; }
  get isUnavailable(): boolean { return this.connection?.status === 'UNAVAILABLE'; }
  get isConnecting(): boolean { return !!this.linkToken && !this.isConnected; }

  load(showSpinner = true): void {
    if (showSpinner) this.loading = true;
    this.whatsapp.status().subscribe({
      next: value => {
        this.connection = value;
        this.loading = false;
        if (value.status === 'CONNECTED') {
          this.linkToken = null;
          this.polling?.unsubscribe();
        }
      },
      error: error => this.fail(error)
    });
  }

  connect(): void {
    if (!this.canManage || this.saving) return;
    this.saving = true;
    this.whatsapp.createLinkToken().subscribe({
      next: token => {
        this.linkToken = token;
        this.saving = false;
        this.startPolling();
      },
      error: error => this.fail(error)
    });
  }

  openWhatsApp(): void {
    if (!this.linkToken) return;
    window.open(this.linkToken.deepLink, '_blank', 'noopener,noreferrer');
  }

  async copyCode(): Promise<void> {
    if (!this.linkToken) return;
    try {
      await navigator.clipboard.writeText(`VINCULAR ${this.linkToken.code}`);
      this.toast.success('Código copiado. Envie-o para o número do RotinaPet.');
    } catch {
      this.toast.warning('Não foi possível copiar automaticamente. Selecione o código exibido.');
    }
  }

  revoke(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Desconectar o WhatsApp?',
        message: 'Novas mensagens deixarão de acessar esta família. Você poderá conectar novamente depois.',
        confirmLabel: 'Desconectar',
        danger: true
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.saving = true;
      this.whatsapp.revoke().subscribe({
        next: () => {
          this.saving = false;
          this.linkToken = null;
          this.connection = { status: 'DISCONNECTED', householdId: this.currentHousehold?.id || '' };
          this.toast.success('WhatsApp desconectado.');
        },
        error: error => this.fail(error)
      });
    });
  }

  private startPolling(): void {
    this.polling?.unsubscribe();
    this.polling = timer(3000, 3000).pipe(
      take(40),
      switchMap(() => this.whatsapp.status())
    ).subscribe({
      next: value => {
        this.connection = value;
        if (value.status === 'CONNECTED') {
          this.linkToken = null;
          this.polling?.unsubscribe();
          this.toast.success('WhatsApp conectado com segurança.');
        }
      }
    });
  }

  private fail(error: unknown): void {
    this.loading = false;
    this.saving = false;
    this.toast.error(this.apiError.message(error, 'Não foi possível atualizar a integração com WhatsApp.'));
  }
}
