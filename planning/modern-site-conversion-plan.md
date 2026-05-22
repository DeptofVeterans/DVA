# Modern Site Conversion Plan

## Goal
Convert the current Angular portal in `frontend/` so it visually follows the reference design in `Modern Website Design/` while preserving the confirmed JDF Veterans Affairs features, secure workflows, request forms, dashboards, and role restrictions already built into this project.

## Current Status
### Completed in the current conversion pass
- Global shell tokens were shifted to a lighter, cleaner visual system in `frontend/src/styles.css`.
- Header navigation, sticky shell styling, mobile menu styling, and footer structure were rebuilt toward the modern reference direction.
- `home`, `auth`, `roadmap`, `contact`, `gallery`, and `dashboard` all received redesign groundwork or updated styling.
- Route aliases and public navigation were aligned for:
  - `/pensions`
  - `/id`
  - `/signin`
- Public gallery presentation was improved to use a more image-led featured layout with more consistent image sizing.
- Shared portal section-heading styling was toned down so service pages feel less like repeated dark card bands.
- Service pages now have a clearer shared orientation structure with pathway links and lane-coverage strips.
- Authenticated workspace pages were rebuilt toward a proper management-tool layout:
  - `profile`
  - `manage-users`
  - `manage-events`
  - `manage-gallery`
  - `audit-logs`
- Public/auth redirect language is now aligned around `/signin` instead of mixing `/auth` and `/signin` in user-facing flows.
- Phase 6 page-specific art direction has now been applied to the service pages:
  - records now reads more like an intake and archive lane
  - pensions/benefits now reads more like a retirement pathway
  - insurance now uses a more dashboard/reference style
  - funerals keeps a memorial-service tone with stronger coordination cues
  - employment now feels more like a transition and opportunities workspace
  - welfare now emphasizes family/caregiver support and routing
  - ID guidance now reads more like a formal policy and application-prep sheet
- The old lane-coverage cards were reduced into a lighter ribbon treatment and each service page now has its own focus-stage section with route-specific content and process steps.
- Phase 7 final content alignment has now been applied:
  - records, pensions, insurance, and welfare pages now use approved project imagery instead of generic service visual placeholders
  - the portal media treatment now reads correctly per page instead of using funeral-specific copy across other service routes
  - the Veteran ID page now uses branded front/back preview panels instead of temporary placeholder blocks
  - a small safe cleanup was completed in shared portal CSS where older unused layout classes were still present

### Remaining redesign-heavy work
- Run a full device/browser visual QA pass after final content and imagery are approved.
- Resolve the local Angular production-build environment issue (`spawn EPERM`) so final build verification can complete on this machine.
- Decide whether any additional approved photography should replace the current static image set on the public pages.

## Next Phase
### Phase 8: Final Visual Approval and Deployment Prep
- Approve or replace the current static imagery set page by page.
- Run browser/device QA once the build environment issue is cleared.
- Complete final production-build verification and deployment prep.

## What The New Design Provides
- A cleaner public-facing shell with a lighter, more product-like layout.
- Stronger page separation by route instead of one shared portal layout repeated across many pages.
- Page-specific hero sections, clearer spacing, simpler navigation, and more modern auth/public page composition.
- A route structure that already matches most of the current site:
  - `home`
  - `roadmap`
  - `records`
  - `pensions`
  - `insurance`
  - `funerals`
  - `id`
  - `employment`
  - `welfare`
  - `gallery`
  - `contact`
  - `alerts`
  - `signin`

## Important Conversion Decision
This should not be copied over as a direct code transplant.

Reasons:
- The reference is a React/Vite/Tailwind/shadcn code bundle.
- The live project is Angular 14 with its own routing, services, request flows, guards, and dashboard logic.
- The reference content is generic `GovPortal` placeholder content and must be rebranded to JDF Veterans Affairs Jamaica.

So the correct path is:
1. Extract the visual system and layout patterns from `Modern Website Design/`.
2. Rebuild those patterns inside Angular.
3. Reconnect them to the current backend-connected features.

## Design Translation Rules
- Keep the JDF Veterans Affairs identity, not the generic GovPortal branding.
- Keep the black, green, and gold brand direction, but apply it in the cleaner visual language of the new design.
- Reduce the current repeated "box/card portal" feel.
- Separate the public information site from the authenticated service portal/dashboard visually.
- Give each major page a purpose-built layout instead of relying on one shared `portal-page` structure for most public routes.

## Feature Preservation Rules
The redesign must retain these working features:
- Veteran and staff authentication flows.
- Auto-redirect into forms after sign-in if a user tried to open a form while logged out.
- Confirmed request forms and popup request flows.
- Role-based dashboards and department-restricted queues.
- Identity verification uploads and review.
- Pickup alerts and status history.
- Contact submissions.
- Gallery upload management plus fixed public gallery images.
- Events management and public alert/banner output.
- Audit logs, manage users, manage gallery, and manage events pages.
- Veterans ID PDF generation and printable guidance flow.

## Page Mapping
### Public pages to redesign first
- `frontend/src/app/Pages/home`
- `frontend/src/app/Pages/roadmap`
- `frontend/src/app/Pages/contact`
- `frontend/src/app/Pages/gallery`
- `frontend/src/app/Pages/auth`

### Public service pages to break away from one shared look
- `frontend/src/app/Pages/portal`
  - records
  - benefits/pensions
  - insurance
  - funerals
  - employment
  - welfare
  - id-guidance

### Authenticated product pages to redesign after the public site
- `frontend/src/app/Pages/dashboard`
- `frontend/src/app/Pages/profile`
- `frontend/src/app/Pages/manage-users`
- `frontend/src/app/Pages/manage-events`
- `frontend/src/app/Pages/manage-gallery`
- `frontend/src/app/Pages/audit-logs`

## Recommended Phases
### Phase 1: Extract the design system
- Create Angular-friendly global design tokens from the reference bundle:
  - spacing
  - radius
  - shadows
  - typography scale
  - color roles
  - section container widths
- Refactor current global styles so page-level CSS owns more of the visual work.
- Keep shared primitives limited to:
  - app shell
  - buttons
  - chips/tags
  - form controls
  - section wrappers
  - modal shell

### Phase 2: Rebuild the app shell
- Redesign header, footer, nav, mobile menu, alerts access, and signed-in actions.
- Use the new design's cleaner shell as the base.
- Rebrand all generic patterns to Veterans Affairs Jamaica.

### Phase 3: Rebuild public-facing pages
- Home: hero-led, less card-heavy, clearer pathways into services and applications.
- Roadmap: full visual pathway page with stronger image-led presentation.
- Contact: cleaner split between contact options and forms.
- Gallery: media-first layout with consistent image ratios and lightbox/open behavior.
- Auth: modern two-panel sign-in/sign-up experience based on the reference sign-in page.

### Phase 4: Rebuild each public service page individually
- Replace the current shared portal-page feel with page-specific structures.
- Keep shared logic where it helps, but allow each page to own its own composition.
- Priority order:
  1. Records
  2. Pensions/Benefits
  3. Insurance
  4. Funerals
  5. Employment
  6. Welfare
  7. ID guidance

### Phase 5: Rebuild the authenticated experience
- Dashboard should feel like a product workspace, not a content page.
- Separate veteran, staff, and admin sections visually.
- Use clearer rows, panels, filters, and action zones.
- Open request details in deliberate modal/panel experiences.

### Phase 6: Polish and consistency pass
- Normalize image ratios and media containers.
- Improve animation and route transitions.
- Audit responsive behavior page by page.
- Remove old layout remnants and dead CSS.

## Suggested Technical Approach
- Keep Angular and existing services.
- Do not migrate the React codebase itself.
- Use the reference folder mainly for:
  - layout ideas
  - visual rhythm
  - spacing
  - page hierarchy
  - component styling direction
- Split more of the current shared styling into page-owned component styles.
- Consider eventually splitting `portal-page` into multiple page components if the redesign starts fighting the shared template too much.

## Immediate Next Build Step
Start with a shell + auth + home redesign pass first.

Reason:
- Those three areas set the tone for the entire site.
- Once they are right, the remaining pages can follow the same visual language.
- It avoids redesigning all service pages against a shell that may still change.

## Success Criteria
- The site feels visually closer to the `Modern Website Design` reference.
- The public pages no longer feel like repeated portal cards.
- JDF branding remains intact.
- Existing secure workflows still function.
- New design language works across desktop and mobile.
