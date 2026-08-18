import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { Petshop, Veterinary, Location } from '../../core/models/location.model';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-location-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule
  ],
  template: `
    <mat-card class="location-card" [class.open]="isOpen" [class.closed]="!isOpen">
      <div class="card-header">
        <div class="location-image">
          <div class="image-container">
            @if (location.photos && location.photos.length > 0) {
              <img 
                [src]="location.photos[0]" 
                [alt]="location.name"
                class="location-photo"
                (error)="onImageError($event)">
            } @else {
              <div class="placeholder-image">
                <mat-icon>{{ getTypeIcon() }}</mat-icon>
                <span class="placeholder-text">{{ getTypeLabel() }}</span>
              </div>
            }
          </div>
          <div class="status-badge" [class.open]="isOpen" [class.closed]="!isOpen">
            <mat-icon>{{ isOpen ? 'schedule' : 'schedule_off' }}</mat-icon>
            {{ isOpen ? 'Aberto' : 'Fechado' }}
          </div>
        </div>
        
        <div class="location-info">
          <h3 class="location-name" [title]="location.name">{{ location.name }}</h3>
          <div class="location-type">
            <mat-icon>{{ getTypeIcon() }}</mat-icon>
            {{ getTypeLabel() }}
          </div>
          
          <div class="location-meta">
            <div class="meta-item rating">
              <mat-icon class="star">star</mat-icon>
              <span class="rating-value">{{ location.rating.toFixed(1) }}</span>
              <span class="review-count">{{ location.reviewCount }} avaliações</span>
            </div>
            <div class="meta-row">
              <div class="meta-item distance">
                <mat-icon>near_me</mat-icon>
                <span>{{ location.distanceText || (location.distance.toFixed(1) + ' km') }}</span>
              </div>
              <div class="meta-item duration" *ngIf="location.durationText">
                <mat-icon>schedule</mat-icon>
                <span>{{ location.durationText }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <mat-card-content>
        <div class="address">
          <mat-icon>location_on</mat-icon>
          <span>{{ location.address }}</span>
        </div>

        <div class="contact-info" *ngIf="location.phone">
          <div class="phone" *ngIf="location.phone">
            <mat-icon>phone</mat-icon>
            <a [href]="'tel:' + location.phone">{{ location.phone }}</a>
          </div>
        </div>

        <div class="services" *ngIf="getDisplayServices().length > 0">
          <h4>Serviços:</h4>
          <mat-chip-set>
            <mat-chip *ngFor="let service of getDisplayServices().slice(0, 3)">
              {{ getServiceLabel(service) }}
            </mat-chip>
            <mat-chip *ngIf="getDisplayServices().length > 3" class="more-services">
              +{{ getDisplayServices().length - 3 }} mais
            </mat-chip>
          </mat-chip-set>
        </div>

        <!-- Serviços específicos para Petshop -->
        <div class="features" *ngIf="isPetshop(location) && hasPetshopFeatures(location)">
          <h4>Recursos:</h4>
          <div class="feature-list">
            <span class="feature" *ngIf="location.hasGrooming">
              <mat-icon>spa</mat-icon> Banho e tosa
            </span>
            <span class="feature" *ngIf="location.hasDaycare">
              <mat-icon>pets</mat-icon> Creche
            </span>
            <span class="feature" *ngIf="location.hasHotel">
              <mat-icon>hotel</mat-icon> Hotel
            </span>
            <span class="feature" *ngIf="location.hasVaccination">
              <mat-icon>medical_services</mat-icon> Vacinação
            </span>
          </div>
        </div>

        <!-- Serviços específicos para Veterinário -->
        <div class="features" *ngIf="isVeterinary(location) && hasVeterinaryFeatures(location)">
          <h4>Recursos:</h4>
          <div class="feature-list">
            <span class="feature" *ngIf="location.hasEmergency">
              <mat-icon>emergency</mat-icon> Emergência 24h
            </span>
            <span class="feature" *ngIf="location.hasLaboratory">
              <mat-icon>science</mat-icon> Laboratório
            </span>
            <span class="feature" *ngIf="location.hasSurgery">
              <mat-icon>local_hospital</mat-icon> Cirurgia
            </span>
            <span class="feature" *ngIf="location.hasRadiology">
              <mat-icon>healing</mat-icon> Radiologia
            </span>
          </div>
        </div>

        <div class="opening-hours">
          <h4>Horário de funcionamento:</h4>
          <div class="today-hours" [class.open]="isOpen" [class.closed]="!isOpen">
            <mat-icon>access_time</mat-icon>
            <div class="hours-info">
              <span class="status">{{ getStatusText() }}</span>
              <span class="hours">{{ getTodayHours() }}</span>
              <span *ngIf="!isOpen && getNextOpenTime()" class="next-open">{{ getNextOpenTime() }}</span>
            </div>
          </div>
        </div>
      </mat-card-content>

      <mat-card-actions class="card-actions">
        <button mat-button class="call-button" (click)="onCall()" *ngIf="location.phone">
          <mat-icon>phone</mat-icon>
          Ligar
        </button>
        
        <button mat-button class="directions-button" (click)="onDirections()">
          <mat-icon>directions</mat-icon>
          Como chegar
        </button>
        
        <button mat-raised-button color="primary" class="details-button" (click)="onViewDetails()">
          <mat-icon>info</mat-icon>
          Detalhes
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .location-card {
      height: 100%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.15s ease;
      border-radius: var(--q-radius-md);
      overflow: hidden;
    }

    .location-card mat-card-content {
      flex: 1;
      padding: 0 1rem 1rem;
    }

    .location-card:hover {
      box-shadow: var(--q-shadow-md);
    }



    .card-header {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--q-surface-2);
    }

    .location-image {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: var(--q-radius-sm);
      overflow: hidden;
      flex-shrink: 0;
    }

    .image-container {
      width: 100%;
      height: 100%;
    }

    .location-img,
    .location-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .placeholder-image {
      width: 100%;
      height: 100%;
      background: var(--q-surface-3);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--q-text-2);
    }

    .placeholder-image mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      opacity: 0.7;
    }

    .placeholder-text {
      font-size: 0.75rem;
      font-weight: 500;
      text-align: center;
      opacity: 0.8;
    }

    .status-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: var(--q-radius-md);
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-badge.open {
      background: rgba(46, 125, 82, 0.92);
    }

    .status-badge.closed {
      background: rgba(179, 64, 47, 0.92);
    }

    .status-badge mat-icon {
      font-size: 14px;
      height: 14px;
      width: 14px;
    }

    .location-info {
      flex: 1;
    }

    .location-name {
      margin: 0 0 0.5rem 0;
      color: var(--q-ink);
      font-size: 1.15rem;
      font-weight: 600;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .location-type {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--q-text-2);
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .location-type mat-icon {
      font-size: 18px;
      height: 18px;
      width: 18px;
    }

    .location-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.875rem;
      color: var(--q-text-2);
    }

    .meta-item mat-icon {
      flex-shrink: 0;
      font-size: 18px;
      height: 18px;
      width: 18px;
    }

    .meta-item.rating {
      color: #DFA32E;
    }

    .meta-item.rating .star {
      color: #DFA32E;
    }

    .rating-value {
      font-weight: 600;
    }

    .review-count {
      color: var(--q-text-2);
      font-size: 0.8125rem;
    }

    .address {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 1rem;
      color: var(--q-text-2);
      min-width: 0;
    }

    .address mat-icon {
      flex-shrink: 0;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 1px;
      color: var(--q-green-600);
      overflow: visible;
    }

    .address span {
      flex: 1;
      min-width: 0;
      line-height: 1.45;
    }

    .contact-info {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .phone, .email {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .phone a, .email a {
      color: var(--q-green-600);
      text-decoration: none;
    }

    .phone a:hover, .email a:hover {
      text-decoration: underline;
    }

    .services, .features, .opening-hours {
      margin-bottom: 1rem;
    }

    .services h4, .features h4, .opening-hours h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--q-ink);
    }

    .feature-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: var(--q-green-50);
      color: var(--q-green-600);
      padding: 0.25rem 0.5rem;
      border-radius: var(--q-radius-xs);
      font-size: 0.8rem;
    }

    .feature mat-icon {
      font-size: 16px;
      height: 16px;
      width: 16px;
    }

    .today-hours {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      color: var(--q-text-2);
      padding: 0.75rem;
      background: var(--q-surface-2);
      border: 1px solid var(--q-border);
      border-radius: var(--q-radius-sm);
    }

    .today-hours.open {
      background: var(--q-success-bg);
      border-color: color-mix(in srgb, var(--q-success) 28%, var(--q-border));
      color: var(--q-success);
    }

    .today-hours.closed {
      background: var(--q-error-bg);
      border-color: color-mix(in srgb, var(--q-error) 28%, var(--q-border));
      color: var(--q-error);
    }

    .hours-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .status {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .hours {
      font-size: 0.85rem;
      opacity: 0.8;
    }

    .next-open {
      font-size: 0.8rem;
      opacity: 0.7;
      font-style: italic;
    }

    .opening-hours h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
      color: var(--q-text-2);
    }

    .more-services {
      background-color: var(--q-surface-2) !important;
      color: var(--q-text-2) !important;
    }

    .card-actions {
      margin-top: auto;
      padding: 1rem;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .card-actions button {
      min-width: 0;
      min-height: 44px;
      padding: 0 0.5rem;
      font-size: 0.8125rem;
    }

    @media (max-width: 768px) {
      .card-header {
        display: grid;
        grid-template-columns: 104px minmax(0, 1fr);
        gap: 0.875rem;
        text-align: left;
        padding: 0.875rem;
      }

      .location-image {
        width: 104px;
        height: 104px;
        align-self: start;
      }

      .location-meta {
        align-items: flex-start;
      }

      .meta-row {
        justify-content: flex-start;
      }

      .contact-info {
        justify-content: flex-start;
      }

      .location-card mat-card-content {
        padding: 0 0.875rem 0.875rem;
      }

      .card-actions {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        padding: 0.875rem;
      }

      .card-actions button {
        width: 100%;
      }

      .details-button { grid-column: 1 / -1; }
    }

    @media (max-width: 390px) {
      .card-header { grid-template-columns: 84px minmax(0, 1fr); gap: 0.75rem; }
      .location-image { width: 84px; height: 84px; }
      .location-name { font-size: 1rem; }
      .review-count { display: none; }
      .meta-row { gap: 0.45rem; }
      .meta-item { font-size: 0.8125rem; }
    }
  `]
})
export class LocationCardComponent {
  @Input() location!: Petshop | Veterinary;
  @Output() callLocation = new EventEmitter<Location>();
  @Output() getDirections = new EventEmitter<Location>();
  @Output() viewDetails = new EventEmitter<Location>();

  constructor(private locationService: LocationService) {}

  get isOpen(): boolean {
    return this.locationService.isOpenNow(this.location);
  }

  isPetshop(location: Location): location is Petshop {
    return location.type === 'petshop';
  }

  hasPetshopFeatures(location: Petshop): boolean {
    return !!(location.hasGrooming || location.hasDaycare
      || location.hasHotel || location.hasVaccination);
  }

  hasVeterinaryFeatures(location: Veterinary): boolean {
    return !!(location.hasEmergency || location.hasLaboratory
      || location.hasSurgery || location.hasRadiology);
  }

  isVeterinary(location: Location): location is Veterinary {
    return location.type === 'veterinary';
  }

  getTypeIcon(): string {
    return this.location.type === 'petshop' ? 'store' : 'local_hospital';
  }

  getTypeLabel(): string {
    return this.location.type === 'petshop' ? 'Petshop' : 'Veterinário';
  }

  getServiceLabel(service: string): string {
    const serviceLabels: { [key: string]: string } = {
      petshop: 'Petshop',
      veterinary: 'Clínica Veterinária',
      grooming: 'Banho e tosa',
      daycare: 'Creche',
      hotel: 'Hotel',
      vaccination: 'Vacinação',
      food: 'Ração',
      toys: 'Brinquedos',
      general: 'Clínica geral',
      emergency: 'Emergência',
      surgery: 'Cirurgia',
      laboratory: 'Laboratório',
      radiology: 'Radiologia',
      cardiology: 'Cardiologia',
      dermatology: 'Dermatologia',
      orthopedics: 'Ortopedia'
    };
    return serviceLabels[service] || service;
  }

  getDisplayServices(): string[] {
    return this.location.services.filter(service => service !== 'petshop' && service !== 'veterinary');
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.style.display = 'none';
  }

  getTodayHours(): string {
    // A listagem só tem o status em tempo real (isOpen); a grade semanal
    // completa só existe depois que a tela de detalhe a busca sob demanda.
    // Sem ela, cair no texto por dia mostraria "Fechado hoje" mesmo quando
    // isOpen é true — usar o status real em vez de inventar um horário.
    if (!this.locationService.hasKnownOpeningHours(this.location)) {
      return this.isOpen ? 'Aberto agora' : 'Fechado no momento';
    }

    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()] as keyof typeof this.location.openingHours;
    const todaySchedule = this.location.openingHours[dayOfWeek];

    if (!todaySchedule?.isOpen) {
      return 'Fechado hoje';
    }

    if (todaySchedule.openTime && todaySchedule.closeTime) {
      // Verificar se é 24h
      if (todaySchedule.openTime === '00:00' && todaySchedule.closeTime === '23:59') {
        return '24 horas';
      }
      return `${todaySchedule.openTime} às ${todaySchedule.closeTime}`;
    }

    return 'Horário não informado';
  }

  getStatusText(): string {
    return this.isOpen ? 'Aberto agora' : 'Fechado';
  }

  getNextOpenTime(): string | null {
    if (this.isOpen || !this.locationService.hasKnownOpeningHours(this.location)) return null;

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + i);
      const dayOfWeek = days[checkDate.getDay()] as keyof typeof this.location.openingHours;
      const schedule = this.location.openingHours[dayOfWeek];
      
      if (schedule?.isOpen && schedule.openTime) {
        if (i === 0) {
          // Hoje - verificar se ainda não passou do horário
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const [openHour, openMin] = schedule.openTime.split(':').map(Number);
          const openTime = openHour * 60 + openMin;
          
          if (currentTime < openTime) {
            return `Abre hoje às ${schedule.openTime}`;
          }
        } else {
          const dayName = i === 1 ? 'amanhã' : 
                        ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][checkDate.getDay()];
          return `Abre ${dayName} às ${schedule.openTime}`;
        }
      }
    }
    
    return null;
  }

  onCall() {
    if (this.location.phone) {
      this.callLocation.emit(this.location);
    }
  }

  onDirections() {
    this.getDirections.emit(this.location);
  }

  onViewDetails() {
    this.viewDetails.emit(this.location);
  }
}
