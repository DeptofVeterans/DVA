# Figma vs Angular Page Audit

## Scope
This audit compares the current Angular implementation in `frontend/src/app/Pages` against the reference design files in `Modern Website Design/src/app/components`.

The goal is not to judge whether the Angular site is good or bad. The goal is to answer a narrower question:

`How closely does the current site match the structure and style of the Figma/reference design?`

This comparison focuses on the pages that have clear counterparts in the reference set. Authenticated utility pages such as dashboard, manage users, manage events, audit logs, manage gallery, and profile are not included as primary comparison targets because the reference folder does not provide one-to-one designs for them.

## Bottom Line
The current Angular site is **not a close port** of the reference design. It is a **branded reinterpretation** that kept some broad ideas, but changed page hierarchy, content density, page purpose, and visual rhythm in major ways.

## High-Level Summary

| Area | Match Level | Main Reason |
|---|---|---|
| Shared shell | Low | Reference uses a light SaaS shell; Angular uses a darker branded portal shell with stronger identity and more authenticated behavior. |
| Home | Low | Reference is simple and marketing-led; Angular is content-heavy and portal-led. |
| Roadmap | Very Low | These are conceptually different pages, not just visually different versions. |
| Sign In / Auth | Medium | Two-panel auth concept survived, but Angular became much denser and more operational. |
| Contact | Low | Reference is a simple contact page; Angular is a multi-lane contact center workflow. |
| Gallery | Medium-Low | Same rough purpose, but Angular is more archival/editorial while reference is more media-product style. |
| Records | Very Low | Reference is a personal records dashboard; Angular is a service-guidance/request page. |
| Pensions | Very Low | Reference is a personal retirement dashboard; Angular is a benefits process page. |
| Insurance | Low | Reference is personal coverage management; Angular is reference guidance and support routing. |
| Funerals | Low | Reference is generic public funeral services; Angular is real department burial/tombing guidance. |
| Employment | Medium-Low | Intent overlaps, but the structure is still substantially different. |
| Welfare | Very Low | Reference is benefits-account style; Angular is assistance routing and support-lane guidance. |
| ID | Very Low | Reference is a digital ID services page; Angular split this into guidance + formal application workflow. |

## Shared Shell Comparison

### Reference shell
- Light header on white background.
- Simple horizontal nav with small active states.
- Minimal footer with four columns.
- Clean SaaS/product rhythm with lots of white space.
- Pages feel like separate product views inside one light design system.

### Current Angular shell
- Strong dark-green branded header with Jamaica portal identity.
- More custom mobile nav behavior and more authenticated controls in the header.
- Heavier branded footer with more portal-specific copy.
- Background treatment, richer hero treatments, and stronger portal feel.
- Page transitions lean more editorial/brand portal than clean app shell.

### Main drift
- The reference shell is neutral, product-like, and visually quiet.
- The Angular shell is branded, atmospheric, and much more identity-driven.

### If we want to match the reference more closely
- Lighten the shell globally.
- Reduce header visual weight.
- Simplify footer structure.
- Use cleaner spacing and less decorative brand framing around every page.

## Page-by-Page Audit

## Home

### Reference structure
- One large gradient hero.
- Two hero CTA buttons.
- One six-card services grid.
- One three-column trust/features section.
- One centered closing CTA band.

### Current Angular structure
- Photo-led dark hero with overlay.
- Hero copy on left and an application launcher panel on the right.
- Separate service-lane section.
- Separate upcoming-events split section.
- Separate portal-standards section.
- Closing CTA band.

### Main drift
- The reference home is simple, light, and marketing-first.
- The Angular home is denser, more portal-oriented, and more operational.
- The right-side application panel is a major structural change.
- The extra sections make the page feel more like a service hub than a landing page.

### Style drift
- Reference uses bright blue/purple product gradients and card rhythm.
- Angular uses a darker, image-led green/gold editorial style.

### Match level
- Low

### If we want to match the reference more closely
- Remove or relocate the extra informational sections.
- Return to a simpler hero + services + trust + CTA structure.
- Reduce the "portal operations" feel on the public home page.

## Roadmap

### Reference structure
- Centered product-roadmap hero.
- Vertical timeline layout by quarter.
- Roadmap items shown as future-release milestones.
- Feedback CTA at the bottom.

### Current Angular structure
- Retirement roadmap hero with service CTAs.
- Large roadmap board image.
- Retirement stages grid.
- "Did You Know?" note cards.
- Service CTA band.

### Main drift
- These pages are not serving the same purpose.
- The reference is a product roadmap.
- The Angular page is a veteran retirement journey guide.

### Style drift
- Reference is clean, vertical, light, and centered.
- Angular is image-led and service-guidance driven.

### Match level
- Very Low

### If we want to match the reference more closely
- Decide first whether the reference concept is actually correct for this page.
- If the current retirement-roadmap purpose is correct, this page should probably **not** match the reference closely.

## Sign In / Auth

### Reference structure
- Two-column layout on desktop.
- Left branding/info panel.
- Right sign-in card.
- Single sign-in form.
- Light divider for alternative sign-in methods.
- Small account creation prompt.

### Current Angular structure
- Two-column layout on desktop.
- Left branded access panel.
- Right auth card.
- Toggle between sign in and sign up.
- Secondary toggle for veteran vs staff sign-up.
- Bootstrap admin panel when enabled.

### Main drift
- The core two-panel auth idea survived.
- The Angular page became a multi-purpose onboarding/auth workspace instead of a clean sign-in page.

### Style drift
- Reference is cleaner and more restrained.
- Angular is darker, more brand-specific, and more operational.

### Match level
- Medium

### If we want to match the reference more closely
- Split login and sign-up into more separate states or pages.
- Reduce the amount of logic visible at once.
- Hide setup/bootstrap controls from the main visual flow more aggressively.

## Contact

### Reference structure
- Gradient contact hero.
- Three contact method cards.
- Two-column lower section with message form and office-hours/support panel.
- Office locations section.

### Current Angular structure
- Contact-center hero with explanation.
- Lane selector cards.
- Three different form modes: general, callback, partner.
- Sticky guidance panel explaining the active lane.

### Main drift
- The reference is a normal contact page.
- The Angular version is a workflow router for different contact types.

### Style drift
- Reference feels like polished public support marketing.
- Angular feels like a service intake center.

### Match level
- Low

### If we want to match the reference more closely
- Simplify the public contact page visually.
- Move lane selection into tabs inside a cleaner message area.
- Add more visible office/contact-information content and reduce workflow framing.

## Gallery

### Reference structure
- Media-gallery hero.
- Category filter bar.
- Three-column media card grid.
- "Load more" action.
- Two promo cards at the bottom for videos and photos.

### Current Angular structure
- Gallery hero.
- Featured image section.
- Public image grid.
- Open-image links on every card.

### Main drift
- Both pages are gallery-like, but the structure is different.
- The reference behaves more like a media platform.
- The Angular version behaves more like a public image archive.

### Style drift
- Reference uses stronger category/product UI.
- Angular uses editorial image presentation and featured-photo framing.

### Match level
- Medium-Low

### If we want to match the reference more closely
- Add category filtering as a visible primary control.
- Reduce the emphasis on a single featured image.
- Restore more of the media-platform browsing rhythm.

## Records

### Reference structure
- Utility header.
- Search input.
- Record type tiles with counts.
- Recent documents list.
- Request-document CTA panel.

### Current Angular structure
- Shared portal hero.
- Service pathway summary.
- Focus cards and process steps.
- Service cards.
- Searchable guidance section.
- Request modal.
- Additional guidance sections below.

### Main drift
- The reference is a personal records dashboard.
- The Angular page is a service-guidance and request-construction page.

### Style drift
- Reference is dashboard-like and transactional.
- Angular is explanatory and route-oriented.

### Match level
- Very Low

### If we want to match the reference more closely
- Rebuild records as a personal document utility page.
- Move the long guidance content into secondary tabs, drawers, or a separate guidance area.
- Use list/table/dashboard patterns instead of the current service-page composition.

## Pensions

### Reference structure
- Personal pension hero.
- Current balance and projected pension cards.
- Contribution history panel.
- Portfolio allocation panel.
- Planning tools CTA area.

### Current Angular structure
- Shared portal service hero.
- Benefits process content tied to retirement path and request routing.
- Focus cards and process steps.
- Benefits service cards and supporting sections.

### Main drift
- The reference is a member financial dashboard.
- The Angular page is a benefits-guidance and application-routing page.

### Style drift
- Reference feels like a fintech dashboard.
- Angular feels like a public-service benefits guide.

### Match level
- Very Low

### If we want to match the reference more closely
- Decide whether pensions should be a personal account dashboard or a benefits-request page.
- Right now it is clearly the second one, so matching the reference would require a major conceptual shift.

## Insurance

### Reference structure
- Policy overview cards.
- Health benefits checklist.
- Premium summary card.
- Add-policy and file-claim action cards.

### Current Angular structure
- Shared portal hero.
- Plan guidance and support framing.
- Heavy use of published tables for real rates and limits.
- Support-request modal.
- Multiple guidance sections and supplemental plan tables.

### Main drift
- The reference is personal insurance management.
- The Angular page is a reference center plus support-request page.

### Style drift
- Reference is benefit-overview friendly and summary-driven.
- Angular is documentation-heavy and intentionally more formal.

### Match level
- Low

### If we want to match the reference more closely
- Turn key rates and coverage into visual summary cards first.
- Keep the detailed tables lower on the page or behind accordions.
- Make the top of the page feel more like "overview" and less like "published document."

## Funerals

### Reference structure
- Funeral-services hero.
- Emergency support banner.
- Four service cards.
- Process steps.
- Location/resource cards.
- FAQ block.

### Current Angular structure
- Shared portal hero with funeral service framing.
- Burial, payment, church, venue, tombing, and coordination sections.
- Real departmental process content based on supplied material.
- Formal support/request behavior.

### Main drift
- The reference is a generic funeral-services information page.
- The Angular version is much more specific and real to the department's funeral support process.

### Style drift
- Reference is public-service generalist.
- Angular is more memorial, formal, and departmental.

### Match level
- Low

### If we want to match the reference more closely
- Keep the current real content, but recompose it into a more guided top-down funeral-services layout:
- emergency support band
- service cards
- process strip
- FAQs
- then the deeper payment/tombing details

## Employment

### Reference structure
- Job search panel.
- Three resource cards.
- Featured openings list.
- Training and counseling panels.

### Current Angular structure
- Shared portal hero.
- Employment support and process framing.
- Live jobs panel in the hero-side area.
- Staff posting panel.
- Transition support sections and opportunity cards.

### Main drift
- The intent overlaps more here than on most other pages.
- Both versions are about career transition and opportunities.
- The Angular page still uses the shared service-page frame rather than the reference's dedicated employment layout.

### Style drift
- Reference feels more like a modern career center.
- Angular still feels like a portal service lane with jobs added inside it.

### Match level
- Medium-Low

### If we want to match the reference more closely
- Promote the job search/opportunities zone to the center of the page.
- Move support cards below it in a more dedicated employment-page layout.
- Separate veteran browsing from staff posting visually.

## Welfare

### Reference structure
- Active benefits overview.
- Monthly summary.
- Eligibility checker panel.
- Available programs grid.
- Help CTA band.

### Current Angular structure
- Shared portal hero.
- Support-network framing.
- Immediate-assistance routing.
- Welfare/outreach lanes.
- Request-driven support logic rather than benefits-account logic.

### Main drift
- The reference is a welfare-benefits account page.
- The Angular page is an intake-and-routing page for welfare support, outreach, transport, mental health, and related assistance.

### Style drift
- Reference is softer and benefits-summary driven.
- Angular is service-lane and support-flow driven.

### Match level
- Very Low

### If we want to match the reference more closely
- Rework the top of the page into clearer support buckets with summary cards.
- Treat routing as a secondary layer rather than the primary visual structure.

## ID

### Reference structure
- ID service hero.
- ID type cards.
- Application status cards.
- Digital ID promo panel.
- Requirements section.

### Current Angular structure
- Split across two pages:
- `ID Guidance` page inside the shared portal system.
- `Veteran ID Application` page with popup application workflow and legal-size PDF generation.
- Current ID application page also includes preview/display panels for front/back card visuals.

### Main drift
- The reference is a generic ID services overview page.
- The Angular implementation is a formal veteran-ID workflow with printable output and guidance separation.

### Style drift
- Reference is product-like and consumer-facing.
- Angular is procedural and department-form oriented.

### Match level
- Very Low

### If we want to match the reference more closely
- Add a cleaner overview layer before the form and guidance.
- Present status, requirements, and application entry in one overview page.
- Keep the existing formal application modal and PDF workflow, but place it behind a more reference-like top-level structure.

## Why the Drift Happened
- The reference folder is more like a design system demo with clean page archetypes.
- The Angular build had to absorb real portal requirements: security, role routing, confirmed forms, real department content, and operational workflows.
- To move quickly, many service pages were built on one shared `portal-page` structure instead of being ported as unique page layouts.
- That made the app more functional faster, but also pushed it away from the reference composition.

## What Is Closest to the Reference Right Now
- Auth page
- Gallery page
- Employment page

These still drift, but they preserve more of the reference page intent than the other pages.

## What Drifted the Most
- Roadmap
- Records
- Pensions
- Welfare
- ID

These changed not just visually, but conceptually.

## Recommended Next Move
If the goal is true alignment with the reference design, the next redesign pass should **not** be "small CSS tweaks." It should be a page-by-page structural rebuild in this order:

1. Home
2. Contact
3. Gallery
4. Employment
5. Records
6. Pensions
7. Insurance
8. Welfare
9. Funerals
10. ID

## Best Working Rule Going Forward
For each page, decide which of these is the priority:

- `Reference-first`: match the Figma/reference page structure closely.
- `Portal-first`: keep the current workflow-heavy structure and just improve the visuals.
- `Hybrid`: keep the real workflow, but wrap it in a layout much closer to the reference.

Right now the Angular app is mostly `Portal-first`, while the reference is mostly `Reference-first`.
