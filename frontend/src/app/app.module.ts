import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
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
import { SiteFooterComponent } from './shared/components/footer/site-footer.component';
import { SiteHeaderComponent } from './shared/components/header/site-header.component';
import { ImageLightboxComponent } from './shared/components/image-lightbox/image-lightbox.component';
import { NotificationDrawerComponent } from './shared/components/notification-drawer/notification-drawer.component';
import { ProfileAvatarComponent } from './shared/components/profile-avatar/profile-avatar.component';
import { RequestFormComponent } from './shared/components/request-form/request-form.component';
import { RevealOnScrollDirective } from './shared/directives/reveal-on-scroll.directive';

@NgModule({
  declarations: [
    AppComponent,
    SiteHeaderComponent,
    SiteFooterComponent,
    ImageLightboxComponent,
    NotificationDrawerComponent,
    ProfileAvatarComponent,
    AuditLogsPageComponent,
    ContactPageComponent,
    HomePageComponent,
    EmploymentPageComponent,
    FuneralsPageComponent,
    GalleryPageComponent,
    InsurancePageComponent,
    PensionsPageComponent,
    RecordsPageComponent,
    RoadmapPageComponent,
    ServicesPageComponent,
    WelfarePageComponent,
    PortalPageComponent,
    IdApplicationPageComponent,
    ManageEventsPageComponent,
    ManageGalleryPageComponent,
    AuthPageComponent,
    DashboardPageComponent,
    ManageUsersPageComponent,
    ProfilePageComponent,
    RequestFormComponent,
    RevealOnScrollDirective
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
