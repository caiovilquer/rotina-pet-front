import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { homeGuard } from './core/guards/home.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [homeGuard],
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup.component').then(m => m.SignupComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent)
      }
    ]
  },
  {
    path: 'shared/veterinary',
    loadComponent: () => import('./features/reports/public-veterinary-summary.component').then(m => m.PublicVeterinarySummaryComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'today',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      { path: 'dashboard', redirectTo: 'today', pathMatch: 'full' },
      {
        path: 'pets',
        loadComponent: () => import('./features/pets/pets.component').then(m => m.PetsComponent)
      },
      {
        path: 'pets/:id',
        loadComponent: () => import('./features/pets/pet-detail.component').then(m => m.PetDetailComponent)
      },
      {
        path: 'events/pet/:petId',
        loadComponent: () => import('./features/events/events.component').then(m => m.EventsComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./features/events/events.component').then(m => m.EventsComponent)
      },
      {
        path: 'assistant/drafts/:draftId',
        loadComponent: () => import('./features/assistant/assistant-page.component').then(m => m.AssistantPageComponent)
      },
      {
        path: 'assistant',
        loadComponent: () => import('./features/assistant/assistant-page.component').then(m => m.AssistantPageComponent)
      },
      {
        path: 'petshops',
        loadComponent: () => import('./features/locations/petshops.component').then(m => m.PetshopsComponent)
      },
      {
        path: 'veterinaries',
        loadComponent: () => import('./features/locations/veterinaries.component').then(m => m.VeterinariesComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'integrations/whatsapp',
        loadComponent: () => import('./features/integrations/whatsapp-integration.component').then(m => m.WhatsAppIntegrationComponent)
      },
      {
        path: 'care-center',
        loadComponent: () => import('./features/reports/care-center.component').then(m => m.CareCenterComponent)
      },
      {
        path: 'family',
        loadComponent: () => import('./features/household/household.component').then(m => m.HouseholdComponent)
      },
      {
        path: 'invite',
        loadComponent: () => import('./features/household/invitation-accept.component').then(m => m.InvitationAcceptComponent)
      }
    ]
  },
  { path: '**', redirectTo: '/today' }
];
