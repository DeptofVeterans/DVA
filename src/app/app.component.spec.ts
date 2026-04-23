import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { SiteFooterComponent } from './shared/components/footer/site-footer.component';
import { SiteHeaderComponent } from './shared/components/header/site-header.component';
import { NotificationDrawerComponent } from './shared/components/notification-drawer/notification-drawer.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [AppComponent, SiteHeaderComponent, SiteFooterComponent, NotificationDrawerComponent],
    }).compileComponents();
  });

  it('should create the app shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
