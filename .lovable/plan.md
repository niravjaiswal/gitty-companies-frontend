

# TechAssess — A Liquid-Glass Hiring Platform

## Design System
- **Dark base** (`#08080A`) with glass panels using `backdrop-filter: blur(24px)` and semi-transparent borders
- **Syne Mono** for headlines/UI labels, **Inter** for body text
- **Orange accent** (`#FF4A00`) for primary CTAs and active states
- Off-white text (`#E0E0E0`), no drop shadows, no solid dividers
- Custom cubic-bezier transitions (`0.6, 0, 0.2, 1`) for organic motion

## Pages & Features

### 1. Landing Page
- Full-dark hero with floating glass cards showcasing the platform
- Dual CTA: "I'm an Applicant" / "I'm Hiring" — routes to respective flows
- Subtle animated gradient background with slow-moving liquid blobs

### 2. Applicant Flow

**Identity Verification Screen**
- Black screen with centered Syne Mono text: "VERIFYING IDENTITY"
- Pulsing orange circle with a refractive lens effect following the cursor
- After 3 seconds, liquid ripple transition into the assessment view

**Assessment Interface**
- 40/60 split-screen layout (question left, placeholder right)
- Draggable 4px "gel" divider with animated gradient on hover
- Left pane: question/task display with markdown rendering
- Right pane: empty placeholder with subtle "Coming Soon" glass label
- Top bar with timer, progress indicator, and assessment title
- Internal scrolling only — no page scroll

### 3. Company Flow

**Dashboard**
- Masonry-style grid of glass cards showing assessments (title, status, candidate count)
- Stats bar: active assessments, pending reviews, total candidates
- Filter/search with glass-styled inputs

**Create Assessment Flow (multi-step modal)**
- Step 1: Choose source — Import GitHub Repo, Import PRD, or Generate New
  - GitHub: paste repo URL with animated validation
  - PRD: paste/upload PRD content
  - Generate: AI-assisted generation placeholder
- Step 2: Configure assessment — title, time limit, difficulty
- Step 3: Review & publish

**Send to Applicants**
- Glass panel with email input, bulk invite option
- Shareable assessment link with copy button
- Sent invitations list with status indicators

### 4. Shared Components
- Glass card component with blur, transparency, and border glow
- Animated orange button with liquid hover effect
- Navigation bar with glass styling and route-aware highlights
- Toast notifications as floating glass lozenges

### 5. Routing
- `/` — Landing page
- `/verify` — Identity verification
- `/assessment` — Split-screen assessment view
- `/dashboard` — Company dashboard
- `/dashboard/create` — Create assessment flow
- `/dashboard/send/:id` — Send assessment to applicants

All data is mock/hardcoded (no backend). Font loading via Google Fonts (Syne, Inter).

