import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { AuditLogsPageComponent } from './Pages/audit-logs/audit-logs-page.component';
import { AuthPageComponent } from './Pages/auth/auth-page.component';
import { ContactPageComponent } from './Pages/contact/contact-page.component';
import { DashboardPageComponent } from './Pages/dashboard/dashboard-page.component';
import { EmploymentPageComponent } from './Pages/employment/employment-page.component';
import { FuneralsPageComponent } from './Pages/funerals/funerals-page.component';
import { GalleryPageComponent } from './Pages/gallery/gallery-page.component';
import { HomePageComponent } from './Pages/home/home-page.component';
import { IdApplicationPageComponent } from './Pages/id-application/id-application-page.component';
import { InsurancePageComponent } from './Pages/insurance/insurance-page.component';
import { ManageEventsPageComponent } from './Pages/manage-events/manage-events-page.component';
import { ManageGalleryPageComponent } from './Pages/manage-gallery/manage-gallery-page.component';
import { ManageUsersPageComponent } from './Pages/manage-users/manage-users-page.component';
import { PensionsPageComponent } from './Pages/pensions/pensions-page.component';
import { PortalPageComponent } from './Pages/portal/portal-page.component';
import { ProfilePageComponent } from './Pages/profile/profile-page.component';
import { RecordsPageComponent } from './Pages/records/records-page.component';
import { RoadmapPageComponent } from './Pages/roadmap/roadmap-page.component';
import { ServicesPageComponent } from './Pages/services/services-page.component';
import { WelfarePageComponent } from './Pages/welfare/welfare-page.component';

const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'contact', component: ContactPageComponent },
  { path: 'gallery', component: GalleryPageComponent },
  { path: 'roadmap', component: RoadmapPageComponent },
  { path: 'services', component: ServicesPageComponent },
  { path: 'records', component: RecordsPageComponent },
  { path: 'pensions', component: PensionsPageComponent },
  { path: 'benefits', component: PensionsPageComponent },
  { path: 'insurance', component: InsurancePageComponent },
  { path: 'funerals', component: FuneralsPageComponent },
  { path: 'employment', component: EmploymentPageComponent },
  { path: 'welfare', component: WelfarePageComponent },
  { path: 'id', component: IdApplicationPageComponent },
  { path: 'id-guidance', component: PortalPageComponent, data: { pageKey: 'id-guidance' } },
  { path: 'id-application', component: IdApplicationPageComponent },
  { path: 'signin', component: AuthPageComponent },
  { path: 'auth', component: AuthPageComponent },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfilePageComponent, canActivate: [AuthGuard] },
  {
    path: 'audit-logs',
    component: AuditLogsPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['QM', 'DIRECTOR', 'MAIN_ADMIN'] }
  },
  {
    path: 'manage-events',
    component: ManageEventsPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['QM', 'DIRECTOR', 'MAIN_ADMIN'] }
  },
  {
    path: 'manage-gallery',
    component: ManageGalleryPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['STAFF', 'RECEPTION', 'QM', 'DIRECTOR', 'MAIN_ADMIN'] }
  },
  {
    path: 'manage-users',
    component: ManageUsersPageComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['DIRECTOR', 'MAIN_ADMIN'] }
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'disabled', anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
