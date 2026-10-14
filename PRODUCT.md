# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **External Recruitment Partners & Talent Hunters**: Need a fast, frictionless workspace to discover and evaluate pre-vetted IT candidates, link them to active job openings, verify duplicate status before submission, enrich verified contact details, and review concise AI talent summaries.
- **Internal Talent Admins**: Need operational governance across candidate pipelines, audit trails of partner actions via activity logs, daily recruitment metrics, and partner performance insights to ensure ATS data integrity and sourcing velocity.

## Product Purpose

WorkoastPartner is a specialized talent discovery and recruitment operations platform that bridges external staffing partners and internal talent teams. It eliminates manual friction in candidate submission and evaluation by providing an intelligent, real-time collaboration layer over Manatal ATS, preventing duplicate submissions, streamlining candidate enrichment, and accelerating hiring decisions.

## Positioning

Unlike disconnected candidate spreadsheets or complex, slow ATS backends, WorkoastPartner delivers a focused, high-velocity talent workbench: live Manatal ATS sync, automated duplicate detection across email/phone/LinkedIn, on-demand RocketReach contact enrichment, and instant Gemini AI candidate highlights within a clean, brand-tailored interface.

## Operating Context

- Used primarily on desktop and laptop displays during active recruiting sessions, talent sourcing batches, and client candidate reviews.
- Connects directly with external services: Supabase for authentication and audit logs, Manatal v3 REST API for jobs and candidate pipelines, RocketReach for verified contact discovery, and Google Gemini Flash for profile summaries.

## Capabilities and Constraints

- **Candidate Discovery & Management**: Role/skill search, stage filtering (Available, Interviewing, Offer, Hired), candidate pinning, interest tracking, and creation/editing workflows.
- **ATS Synchronization**: Direct integration with Manatal ATS (job URL/ID lookup, stage mapping, and batch candidate ingestion).
- **Duplicate Prevention**: Automated duplicate detection matching by email, phone, LinkedIn URL, or name before submission or import.
- **Profile Enrichment**: Integrated RocketReach API for verified email and phone number lookup.
- **AI Talent Summaries**: Gemini-powered 2–3 sentence executive highlights highlighting fit and qualifications for prospective employers.
- **Audit & Analytics**: Real-time activity logging paired with admin dashboard analytics (candidate counts, stage distribution, active partner volume, Recharts visualizations).
- **Technical Constraints**: SPA built with React 18, Vite, and Tailwind CSS / CSS design tokens; client-side API integrations requiring valid keys; dual Supabase / mock authentication support.

## Brand Commitments

- **Name**: WorkoastPartner (Workoast)
- **Palette**: Workoast Brand Green (`#75FA00`), neutral darks and lights (`#0E0E0D` to `#FAFAF9`), status accents for candidate stages.
- **Typography**: Geist (body/UI sans), Geist Mono (data/code), Lexend (display/headings).
- **Voice**: Crisp, professional, confident, and direct.

## Evidence on Hand

- Core views implemented: `views/PartnerPortal.tsx`, `views/AdminDashboard.tsx`, `views/AuthScreen.tsx`.
- Service integrations: `services/manatalService.ts`, `services/rocketReachService.ts`, `services/geminiService.ts`, `services/candidateService.ts`, `services/activityLogService.ts`.
- Comprehensive design tokens and specifications documented in `design_system.html` and `index.css`.

## Product Principles

- **Zero Sourcing Collisions**: Proactively detect duplicates to prevent partner conflicts and maintain clean ATS pipelines.
- **Speed Over Overhead**: Minimize clicks and waiting for high-volume recruiters with batch actions and rapid filtering.
- **Enriched Decision Making**: Complement raw resumes with verified contact data and instant AI qualification digests.
- **Operational Transparency**: Ensure every status update, profile view, and import is auditable across partner and admin boundaries.
