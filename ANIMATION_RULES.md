# Beam Website Animation Rules

**Status:** Working agreement · Branch `feat/beam-animation-polish` · Implementation facts verified against `06880ba`

## Purpose of this document

The goal is **not** merely to polish the existing animation.

The approved visual design remains fixed. Animation behavior, however, may be **significantly changed, re-sequenced, rebuilt, or replaced from scratch** when the existing motion does not align with:

- Beam product meaning
- Steve's feedback
- Clerk's benchmark quality
- the agreed animation rules in this document

**Motion implementation is allowed to change substantially. Visual redesign is not.**

## What may change

While the approved visual design remains fixed, all of the following motion behavior may be changed or rebuilt:

- choreography
- sequencing
- triggers
- timing
- easing
- spring behavior
- interaction behavior
- hover behavior
- autoplay behavior
- loop / replay logic
- scroll behavior
- state transitions
- hierarchy / focus
- rest / result states

**The existing animation implementation is not sacred.** Motion code carries no special protection simply because it exists. If a choreography is wrong, rebuild it.

## What may not change

Layout, composition, typography, color, spacing, card and panel styling, iconography, section order, and the overall visual language of the approved Figma design.

## Authority model

Two separate authorities govern this work. Do not collapse them.

### Product / acceptance authority

1. **Steve's explicit feedback and direction**
2. **Beam product meaning** — what each section must communicate
3. **Approved Figma design and visual structure**

### Motion-reference authority

4. **Clerk — PRIMARY motion benchmark**
5. **Emil Kowalski / animations.dev — SUPPORTING craft guidance**

Clerk is the main external reference for animation quality, perceived speed, interaction behavior, key-visual choreography, scrolling transformations, state transitions, connector / travelling-state behavior, rest states, motion hierarchy, and overall polish.

Emil is **not** a competing benchmark. Emil is used to explain *why* a Clerk-like behavior works, supply craft terminology, and support implementation decisions on easing, springs, interruption, accessibility, and performance — and to catch craft mistakes.

**If Emil's generic guidance conflicts with Steve, Beam product meaning, approved Figma, or verified Clerk behavior, Emil does not win.**

---

# 1. Core Motion Philosophy

## The semantic rule

Before designing animation for any section, answer in order:

1. **"What is this section communicating about Beam?"**
2. **"What is this animation communicating?"**

Motion must reinforce one or more of:

- product behavior
- state change
- cause → effect
- input → process → result
- relationship between systems / objects
- progression
- hierarchy / focus
- contextual transition

If the only justification is *"it makes the page more dynamic,"* the motion concept should be reconsidered.

## The workflow

```
PRODUCT CONTEXT
→ USER TAKEAWAY
→ IMPORTANT STATES / CAUSALITY
→ MOTION REQUIREMENT
→ CLERK REFERENCE
→ MOTION DESIGN
→ IMPLEMENTATION
→ TUNING
```

**Never start from animation technique first.** Technique is chosen at the implementation step, after meaning, requirement, and reference are settled.

---

# 2. Beam Product Meaning

Derived from the section copy, the rendered visuals, and the component implementations. No product states are asserted here that Beam's own content does not support.

## Hero

### Product Context
Beam's core proposition: one workspace that exists identically across local machines, cloud environments, CI, and agent workflows, without rebuilding context.

### User Takeaway
"Beam gives me one workspace of real files that follows me everywhere, without setting it up again."

### Core State / Causality
The visual is a live product surface rather than a narrative sequence. The only causality the content supports is local interaction: `user action (upload / open / create folder) → workspace updates → file available`.

Note: the headline's differentiator — **"Everywhere"** — currently has no state sequence represented in the visual at all.

**Recorded current implementation fact (verified at `06880ba`).** The Hero now contains an `AgentPromptButton`: a copy-to-clipboard control carrying the Beam agent prompt, whose copied state resets after approximately 1,800ms, alongside Claude, Replit, and OpenAI agent icons.

This is recorded as a current implementation fact only. It may be relevant to the Clerk command-line hero benchmark (§4.0, §4.1), but **that observation is not yet a Hero motion requirement** — Steve has given no Hero feedback, and the Hero motion requirement below is unchanged.

### Motion Requirement
Motion must make it obvious that **the same workspace, with the same contents, is present in more than one environment** — not merely that Beam stores files. "One workspace" and "everywhere" must read as a single idea before the visitor scrolls.

---

## Problem / Solution

### Product Context
The setup-cost problem and Beam's answer. The problem names three concrete frictions — cloning a repository, committing unfinished work just to move it, and restoring secrets. The solution is `beam mount ~/project` producing a ready environment. This section carries Beam's central verb: **mount / attach**.

### User Takeaway
"Setting up a new environment normally takes three slow manual steps — Beam replaces all of them with one mount that arrives ready, secrets included."

### Core State / Causality
```
new environment needed
→ clone repo + commit unfinished work + restore secrets (each flagged; destination stalls on "Everything ready" with a spinner)
→ $ beam mount ~/project
→ workspace present on destination
→ "Everything ready" resolves to a check
```

### Motion Requirement
Motion must make it unmistakable that **three separate manual setup steps are replaced by one mount command, and that the destination reaches a genuinely ready state — including secrets — as a consequence of that command.** The causal link from command to ready-state must survive at any scroll speed.

---

## Sync — One directory, every machine

### Product Context
Continuous convergence between machines. Git is not a sync mechanism; moving unfinished work requires throwaway commits, and `.env` files don't travel. Beam keeps one directory live across machines without commits, pushes, or manual copies.

### User Takeaway
"I can stop working on one machine and continue on another within seconds, with no commit or copy step, and my secrets come along."

### Core State / Causality
```
edit on machine A
→ Beam converges automatically
→ same state available on machine B (secrets included)
```

### Motion Requirement
Motion must make it obvious that **a change made in one place arrives at the other places by itself, with no intermediate user action.** The arrival must be a distinct, readable event — not ambient activity — and it must be visible to a visitor who never hovers.

---

## On-Demand — The whole tree, a fraction of the disk

### Product Context
Virtualized file access. Beam keeps lightweight references to every file and downloads contents only when something actually reads them, so the whole tree stays browsable and searchable without consuming local disk.

### User Takeaway
"I get the entire file tree immediately and can browse or search all of it, but only the files I actually open consume disk."

### Core State / Causality
```
full tree listed instantly (references only — "12,480 files available")
→ user opens a file
→ Beam fetches that file's contents on demand
→ file available locally
```

and, for scale:

```
very large repo (1,250,000 files)
→ mounted
→ browsable without filling local disk
```

### Motion Requirement
Motion must make it obvious that **the full tree is present as lightweight references, and that opening a specific file is what causes its contents to arrive** — the fetch must be visibly triggered by the read, not ambient. Each step's demonstration must begin at its beginning when the visitor arrives at it.

---

## Agents — Built for agents, not just humans

### Product Context
Beam as infrastructure for agent workflows. Agents get the same view of the files the user has, through the CLI and an MCP server, authenticated with scoped, revocable tokens. Ephemeral agent sandboxes otherwise repeat environment setup for every run.

### User Takeaway
"Agents can read and write my real workspace through MCP with scoped permissions I control and can revoke, and a fresh agent sandbox already has my working tree."

### Core State / Causality
```
agent requests workspace access
→ scoped per-workspace token authorizes
→ agent reads / writes files via MCP (list, read, write, glob, grep)
→ every action lands in an audit trail
```

and separately:

```
fresh sandbox starts → working tree already present (no setup)
```

### Motion Requirement
Motion must make it obvious that **an agent is operating on the same real workspace the user has, that its access is bounded by a scope the user granted, and that what it did is recorded.** The permission boundary and the audit record must read as separate, legible consequences — not as one cluster of confirmations.

---

## Share & Host — From drop to deploy

### Product Context
The outbound edge: any file in Beam is one step from being on the internet — a share link for a person, or a full deploy on your own domain.

### User Takeaway
"Anything in my workspace can become a shareable link or a deployed site immediately, without a separate pipeline."

### Core State / Causality
Two parallel branches from a common origin:

```
file in workspace → share action → link created → recipient opens it (no account needed)
workspace → one-command deploy → live site on your domain
```

### Motion Requirement
Motion must make it obvious that **one file in the workspace can become either a link another person opens or a live deployed site, and that both happen in a single step.** The two outcomes must be separable — a visitor should grasp one without losing the other — and perceived duration must be consistent with "instantly" and "under 30 seconds."

---

## Secrets — Env vars that travel, without leaving a trace

### Product Context
Environment variables that travel with the workspace but are never committed or copied. Encrypted at rest with AES-256-GCM and never stored in snapshots, chunks, or logs; scoped to org, workspace, and profile (dev, staging, prod); every read audit-logged, and rotation reaching every live workspace in under 30 seconds.

### User Takeaway
"My `.env` values follow my workspace and are available exactly where I mount them, without ever committing them or copying them between machines."

### Core State / Causality
```
secret stored encrypted
→ workspace mounted with a profile scope
→ command run
→ env attaches
→ dependent services (database, Stripe) resolve
→ success
```

### Motion Requirement
Motion must make it obvious that **secrets arrive with the workspace and become available to the running application, while never existing in the repository, in snapshots, or in logs.** The "scoped to a profile" idea should read as a boundary limiting what a given mount can unlock.

---

## Pricing

### Product Context
Commercial framing — four tiers from Free to Enterprise, with end-to-end encryption and on-demand file access included in every plan. Not a product mechanism.

### User Takeaway
"I can start free, and the core capabilities I just read about are included at every tier."

### Core State / Causality
None. There is no product sequence here and none should be invented. The only meaningful state is navigational: `plan N in view → user advances → plan N+1 in view` on mobile.

### Motion Requirement
Motion must stay subordinate to comparison and scanning. Restraint is the correct answer; the current absence of narrative motion is appropriate.

---

## Footer — Your workspace. Ready anywhere.

### Product Context
The closing call to action, restating the core promise and giving the concrete first command: `$ beam mount ~/workspace`, with the confirmation "workspace attached."

### User Takeaway
"Getting started is one command, and it ends with my workspace attached."

### Core State / Causality
```
run beam mount ~/workspace
→ workspace attaches
→ confirmed ready
```

### Motion Requirement
Motion must make it obvious that **running one command results in an attached, ready workspace** — the confirmation must read as a consequence of the command, not as static decoration beneath it. Ambient motion must yield focus to the CTA.

---

# 3. Steve Direction — Authoritative Section Scope

This is the corrected, authoritative mapping. Feedback is scoped exactly as Steve gave it.

**Two rounds of feedback exist.** The original Slack thread, and the **huddle round of 2026-09-03**. Where they conflict, the huddle round wins and is marked `HUDDLE 2026-09-03 — AUTHORITATIVE` inline. Everything not contradicted by the huddle remains in force.

The huddle round is materially different in kind: the Slack thread was mostly *reactions* ("too slow", "weird and raw"), whereas the huddle gives **prescriptive, checkable behavior** for several sections. Treat huddle items as acceptance criteria, not as sentiment to interpret.

## Global

> "All the animations are not polished at all."

**Interpretation:** the entire site's motion needs a higher quality bar and more coherent animation behavior.

**Do not attach the beam/laser feedback globally.** It is scoped to Problem / Solution only.

---

## Section 2 — Problem / Solution

> "The beam lasers, need to make it like Clerk. Look at how the beam being animated in Clerk."

**This feedback applies ONLY to Problem / Solution.** Do not generalize it to Sync, Agents, Share & Host, or any other connector unless Steve provides separate feedback.

**Recorded current implementation issue.** The connector at `src/components/visuals/solution/SolutionVisual.module.css` (lines 422–447, 512) is a horizontal line with an `::after` overlay carrying a `repeating-linear-gradient`, animated by:

```css
animation: connectorFlow 2.2s linear infinite;
@keyframes connectorFlow { to { background-position: 11.45cqw 0; } }
```

Which means:

- multiple repeated moving segments — no single identifiable travelling object
- no single departure
- no single arrival
- no resolution state
- continuous motion independent of the section's causal sequence
- it is also the one element in this scene not participating in the scroll-driven causality the rest of the section expresses

This observation is useful context. **Do not prescribe the final implementation yet.**

**Recorded current breakpoint behavior (verified at `06880ba`).** The GSAP pinned Problem / Solution scene now runs **across all breakpoints**; the earlier desktop-only gate and its static mobile fallback have been removed. Under 1024px it still uses the shorter scroll range (`+=125%` vs `+=150%`). The problem features are now presented as a swipeable snap carousel on mobile.

This is a factual record only. It does not change the decision that Problem / Solution's scroll-driven storytelling remains allowed — see §6.

### HUDDLE 2026-09-03 — AUTHORITATIVE

Steve specified the behavior of **both** scroll states. This supersedes any earlier reading that both states should express a completed source → travel → arrival connection.

#### State 1 — "Your workflow breaks between environments"

This state represents a **FAILED process** and must not read as a successful one.

| # | Acceptance criterion |
|---|---|
| PS1 | Pills start in a **neutral / gray** state. No pill shows an active colour before it has been reached. |
| PS2 | The laser beam **must not complete the connection.** It travels approximately **halfway** and stops. |
| PS3 | Where the incomplete beam reaches / impacts the relevant pills, those pills change **gray → red**. |
| PS4 | The impact produces a **localized ripple / impact reaction** at the point of contact. Localized — not a full-scene event. |
| PS5 | After turning red, the pills **slide out** and are **replaced by the next pills**. |
| PS6 | The slide-replacement must read as **repeated workflow failure / friction**, not as successful progression to a next step. |

Required semantic reading:

```
attempted workflow
→ incomplete connection
→ failure / error state
→ repeated replacement / friction
```

**Must NOT happen:** the beam must never visually reach the destination in this state. Do not let the replacement cadence read as a successful pipeline advancing.

#### State 2 — "One workspace. Every environment"

| # | Acceptance criterion |
|---|---|
| PS7 | **Remove the black pills** currently used as helper elements to show line movement. |
| PS8 | The connector / beam animation itself carries the motion and the progression. |
| PS9 | Do not add helper objects when the main connector already explains the movement. |

Required semantic reading:

```
successful Beam state
→ clear direct connection
→ no redundant motion indicator
```

**Relationship to the earlier "beam lasers like Clerk" note:** that item (§8 #1) remains unresolved as to *which* Clerk animation Steve meant, but it is **no longer blocking**. The huddle specifies the required behavior directly, so implementation proceeds from PS1–PS9; Clerk stays a motion-quality reference only.

---

## Sync — One directory, every machine

> "I am not even sure what's been polished here. This looks really weird and raw, pak."

**Requirement:** both the resting state and the motion need to feel intentional and polished.

**Do not invent what Steve specifically disliked.** He gave no reason, no reference, and no direction. His screenshot shows a static frame. The reason remains **partially unresolved** — see §8.

### HUDDLE 2026-09-03 — AUTHORITATIVE

**The "weird and raw" complaint is now closed.** The rebuilt Sync motion is FOUNDER APPROVED and shipped to `main`. §8 #2 no longer blocks anything.

**Locked — do not revisit without new direction:** the semantic direction `MacBook Pro → Beam Workspace → Cloud VM` for **both** ADD and DELETE; the 1800ms real-clock transaction; the linear counter; hug-content panel geometry; the non-clickable interaction affordance.

**The remaining ask is the dotted trail only.** Refine its treatment toward Clerk's motion quality.

| # | Acceptance criterion |
|---|---|
| SY1 | Cleaner, more even **dot spacing**. |
| SY2 | Smoother **path-following** — no visible stepping along the geometry. |
| SY3 | Stronger **leading-edge clarity**; the head must read as the front of the propagation. |
| SY4 | More natural **fading tail**, resolving to zero rather than cutting off. |
| SY5 | Better **consistency through curves and bends** — spacing and opacity must not distort at corners. |
| SY6 | A more refined **futuristic / data-propagation** feel. |
| SY7 | **Restrained** glow / luminance. Subtle, localized. |

**Must NOT happen:** no solid pill, no continuous laser, no full-path marquee. The trail must remain **localized, directional, smooth, precise**, and must continue to communicate **state propagation / synchronization** — never *energy beam* or decorative movement.

**Clerk scope reminder:** Clerk is a **motion-quality** benchmark here. Do not import Clerk's colours, layout, visual design, or branding. See §4.0.

---

## On-Demand — The whole tree, a fraction of the disk

> "Can we make the transition here to be seamless like this section at Clerk, pak? With the help of AI, you definitely can figure it out."

His attached reference is Clerk's **"Pixel-perfect UIs, embedded in minutes"** component gallery.

**Requirement:** state progression must feel like one continuous surface rather than disconnected visual swaps.

### HUDDLE 2026-09-03 — AUTHORITATIVE

Steve resolved *how* the seamlessness should be achieved. This section is **ONE CONTINUOUS VISUAL STORY** told with **ONE PERSISTENT PANEL**.

```
ONE persistent panel
→ continuous transformation
→ three product points
```

not

```
three disconnected animations
```

**Object permanence is the governing principle here.** The three points are not separate scenes. Do not replace the panel with a different object when the same object can transform into the next state.

| # | Point | Acceptance criterion |
|---|---|---|
| OD1 | all three | The **same panel / object persists** across all three points. It transforms; it is not swapped out. |
| OD2 | *Everything appears instantly* | Repo and files must **not** all reveal at the same instant. They reveal **sequentially, in quick succession**. |
| OD3 | *Everything appears instantly* | The sequence must still feel **almost instant overall**. The stagger buys readability, not duration. |
| OD4 | *Contents load on demand* | The **same panel continues** from the previous state: it **moves upward**, **scales down**, and reveals / transitions into the "On your disk …" state or information. |
| OD5 | *Built for huge repos* | The **same panel** transitions / **zooms again** into the next visual state. |

Desired feel for OD2/OD3:

```
repo / file reveal
→ rapid sequential progression
→ full tree visible quickly
```

**Must NOT happen:** everything popping simultaneously; **or** a slow staggered reveal. Both fail this criterion — it is a narrow target between the two.

---

## On-Demand — Built for huge repos state

> "The animation speed is inconsistent here, the ready in 1.2s is too slow compared to the number animation above it."

Scoped to the third On-Demand visual (`OnDemandVisual3`).

**Recorded measured current issue:**

| Constant | Value |
|---|---|
| `COUNT_DELAY` | 520ms |
| `COUNT_DURATION` | 1,500ms |
| Count completes | ≈ 2,020ms |
| `OPENING_DURATION` (ready group enters) | 2,900ms |
| **Dead interval** | **≈ 880ms** |

**Requirement:** the number and the result state must belong to one coherent timing sequence with no unnecessary dead gap.

---

## Agents — Built for agents, not just humans

> "I am not sure what's going on here, the animation is very very slow."

**Two explicit requirements:**

1. **Comprehension must improve.** "I am not sure what's going on here" is a comprehension failure.
2. **Perceived speed must improve.**

**Do not reduce this feedback to duration alone.** Current loop: `HALF_CYCLE_DURATION_MS = 5200`, full loop 10,400ms.

### HUDDLE 2026-09-03 — AUTHORITATIVE — SUPERSEDES THE ABOVE

**This overrides the two-requirement reading.** In the huddle Steve stated the **current animation concept / choreography is already acceptable**. The comprehension objection is withdrawn.

**The primary change is SPEED.**

| # | Acceptance criterion |
|---|---|
| AG1 | Same story, same visual meaning. |
| AG2 | **Faster pacing** — speed up the overall animation. |
| AG3 | Less waiting; quicker time to a readable result. |
| AG4 | Use **Clerk's perceived speed** as the quality reference (§4.1 nominal ≠ perceived, §4.2). |

**Do NOT redesign the entire sequence** unless a technical issue requires it. The earlier guardrail *"do not treat this as a duration problem only"* and *"the three guarantees must become separately legible"* are **no longer requirements**; they may still be applied opportunistically where they cost nothing, but they must not justify a rebuild.

---

## Share & Host — From drop to deploy

> "The animation here is incredibly slow, so slow. Refer to how fast the animation is at Clerk website."

**Requirement:** use Clerk's perceived speed as the PRIMARY benchmark. The visitor should understand the meaningful action and result within normal section dwell time. Current cycle: 12,000ms.

### HUDDLE 2026-09-03 — AUTHORITATIVE

Speed is confirmed, and a **causal colour rule** is added.

| # | Acceptance criterion |
|---|---|
| SH1 | Speed up the overall animation. |
| SH2 | Pills begin **GRAY** while not yet connected. |
| SH3 | When the connection **reaches** a pill, that pill changes to its **active colour**. |
| SH4 | The colour change must be **causally triggered by the connection arriving** — not by an independent timer or a decorative cycle. |

State logic:

```
DISCONNECTED = gray
CONNECTED    = active colour
```

**Must NOT happen:** **do not show active colour before connection.** The section must communicate `connection progression → state activation`, never decorative colour cycling.

---

## Secrets — Env vars that travel, without leaving a trace

> "The animation here should not start by revealing the elements. The elements supposed to be visible all the time. The animation should be focusing more on the terminal typing as the intro animation."

This is explicit and prescriptive — the most prescriptive feedback in the thread.

**Requirement:**

```
COMPOSITION ALREADY VISIBLE
→ TERMINAL TYPING / COMMAND
→ CAUSED STATE CHANGE
→ RESULT
```

**Do not reintroduce a large UI reveal before the terminal action.**

### HUDDLE 2026-09-03 — AUTHORITATIVE

Reconfirmed and tightened. This **overrides any previous reveal-intro interpretation** anywhere in this document.

| # | Acceptance criterion |
|---|---|
| SE1 | At the beginning, supporting visual elements are **already visible**. |
| SE2 | Do **not** introduce the visual by progressively revealing all supporting elements. |
| SE3 | The main animation focus is **TERMINAL TYPING**. |
| SE4 | The animation **autoplays**. |
| SE5 | The animation **auto-loops**. |

Core motion structure:

```
stable composition
→ terminal typing
→ readable result
→ loop
```

**Must NOT happen:** any reveal choreography wrapped around the terminal. If an element does not need to appear, it is already there.

**Note on §6 Looping & Replay:** that rule prefers sequences that settle over sequences that loop. Steve has explicitly required auto-loop here, so **Secrets is an authorised exception**. The loop must still rest on a chosen hero frame, pause off-screen, and stay interruptible.

---

## Footer — Your workspace. Ready anywhere.

> "The animation at the footer looks promising. But the ripple blast feels weird. Need to be tweaked or removed altogether."

**Requirement:** preserve the promising overall direction. The ripple may be substantially reduced, reworked, or removed entirely — removal is explicitly pre-authorised. It must not compete with the CTA.

**Recorded current implementation state (verified at `06880ba`).**

The **ripple is unchanged** and Steve's feedback remains fully applicable: it is still driven through the Web Animations API on a `footerPulse` element, with the same timings — `delay` 380ms on a fresh pulse / 0ms when interrupting, `duration` 1,500ms fresh / 1,180ms interrupting, `cubic-bezier(0.2, 0.7, 0.2, 1)`, and a 360ms exit on `cubic-bezier(0.22, 0.61, 0.36, 1)`. The canvas dot-field, its `requestAnimationFrame` loop, and the `IntersectionObserver` (`rootMargin: '120px'`) are all still present.

The **CSS intro choreography has changed.** The footer's keyframe set is now four bloom-style keyframes:

- `footerShadowBloom`
- `footerGlowBloom`
- `footerIconLightBloom`
- `footerTileHighlightBloom`

The earlier gate-opening intro and dot-wave keyframes no longer exist.

The footer also now has a **`pointerup` touch interaction path** that activates the interaction and auto-resets after approximately 2,600ms, with the reduced-motion guard still in place. **This applies to the Footer only and must not be generalized to other sections.**

---

# 4. Clerk — PRIMARY Motion Benchmark

**Clerk is the primary external motion benchmark for Beam.**

Evidence is kept in two layers, which have opposite strengths and must not be silently merged.

## 4.0 Scope of the Clerk benchmark

**Clerk is Beam's PRIMARY MOTION benchmark, not a visual-design reference.**

We benchmark:

- perceived speed
- interaction behavior
- sequencing
- state transitions
- scrolling transformations
- hierarchy
- rest / active / result behavior
- polish
- continuity

We **do NOT** copy Clerk's:

- dark feature-card visual system
- brand gradients
- hub-and-orbit radar geometry
- authentication-specific artefacts such as OTP / passcode visuals
- embedded-component visual language
- typography, colors, card styling, or layout

**Beam's approved Figma remains the visual source of truth.** When a Clerk pattern is cited anywhere in this document, it is cited for how the motion *behaves and feels* — never for how it looks. A Beam section that matches Clerk's motion quality while looking nothing like Clerk is a success, not a miss.

## 4.1 Clerk Technical Findings

Source: direct DOM, CSS, and Web Animations API inspection of the homepage plus four product pages (User Authentication, Enterprise Authentication, Multi-tenancy, Billing), at 1440×900.

### Method limitation — stated explicitly

**Do not repeat the earlier incorrect conclusion that Clerk barely animates.** That conclusion was wrong.

The technical browser audit reliably captured:

- resting state
- unconditional / ambient animations
- exact implementation values (durations, easings, keyframes, geometry)

It had **blind spots** for:

- hover-triggered behavior — Clerk's hover states are Tailwind `group-hover:` CSS, and CSS `:hover` cannot be triggered by synthetic events
- visibility-triggered behavior — the inspection context suspends `requestAnimationFrame` and IntersectionObserver callbacks
- experiential sequencing — animation progress stayed frozen at 0, so cadence, dead time, and loop behavior were unobservable

An earlier claim that "no animated beam or laser exists on Clerk" was drawn from the absence of SMIL tags and `offset-path` elements. That inference was unsound and is retracted; a travelling highlight can be built by other means.

### Page geometry

| Page | Height | Viewports | Videos | Non-nav sticky |
|---|---|---|---|---|
| Homepage | 7,652px | 8.5 | 0 | 0 |
| User Authentication | 5,335px | 5.9 | 0 | 0 |
| Enterprise Authentication | 3,727px | 4.1 | 0 | 0 |
| Multi-tenancy | 8,214px | 9.1 | 0 | 1 |
| Billing | 8,290px | 9.2 | 0 | 0 |

For comparison, Beam is 10,919px = **12.1 viewports**.

### Clerk springs

A captured autoplay state change uses a nominal **500ms** spring-like compiled `linear()` curve:

| Elapsed | Progress |
|---|---|
| 10ms | ~13% |
| 50ms | ~51% |
| 90ms | ~72% |
| ~163ms | ~90% |
| ~255ms | ~97% |
| 500ms | settled |

Monotonic, **no overshoot** — critically or over-damped.

**Important conclusion: nominal duration ≠ perceived duration.** The motion feels fast because the meaningful displacement happens early, then quietly settles.

**Do not create a rule saying all animation must finish within 500ms.**

### Transition durations and easing vocabulary

Measured by frequency: 0.15s (×40), 0.5s (×35 + ×20 opacity), 0.45s (×26), 0.3s (×23 + ×9 + ×9), 1s (×14), 0.2s (×12 + ×10), 0.13s (×6).

Easings: `cubic-bezier(0.4, 0, 0.2, 1)` dominant; `cubic-bezier(0.33, 1, 0.68, 1)` (easeOutCubic) ×58; `cubic-bezier(0.4, 0.36, 0, 1)` on section CTAs ×23; `cubic-bezier(0.175, 0.885, 0.32, 1.1)` — the only overshoot curve — restricted to 130ms micro-elements.

Interaction feedback is **asymmetric**: `data-hovered:duration-0` on hover-in (instant), 150ms `ease-linear` on return.

### Hover displacement

307 distinct hover rules. Verified vocabulary uses restrained movement:

- ~2px (`translate-y-[-2px]`)
- 8px (`translate-x-2`)
- up to ~24px in larger cases (`translate-x-6`)
- `opacity` 0 ↔ 1
- color / background / border / stroke
- `grayscale-0` (logos activating)
- small rotations (`rotate-90`)

**Outer composition remains stable.** No hover rule exists that could reposition layout. Scoping is per-card via named groups (`group/card`, `group/button`, `group/code-block`).

### Scroll behavior

Across all inspected pages:

- **no GSAP-style scrub / snap systems**, zero pin-spacers
- native scrolling remains under user control
- scroll-entry reveals are **opacity-only, 500ms, `cubic-bezier(0.4, 0, 0.2, 1)`, `transform: none`** — no translate, no blur
- **one** meaningful sticky scroll sequence found, on Multi-tenancy

**Multi-tenancy sticky sequence:**

- one persistent visual — a live Clerk `<SignUp/>` component, 600px tall, held by `sticky top-[max(calc(50vh-17.3rem),6.875rem)]`
- approximately three explanatory steps scrolling past it (Organization creation → Built-in invitations → RBAC)
- roughly **640px per step**; container 1,880px ≈ 2.09 viewports
- sticky instead of scrubbed animation — measured `transform: none` at eight sampled scroll positions
- no snap, no scroll-timeline lag
- the visual releases naturally at container end

Treat this as a **useful reference, not a universal Clerk rule** — it appears on one page of five.

### Autoplay demonstrations

**Clerk's video-like product demos are NOT video.** Zero `<video>` elements across all five pages.

They are code-native DOM / React state machines firing discrete **one-shot** transitions and springs (`iterations: 1`, re-created per state step). This matters because **Beam can implement comparable behavior directly in code** with the libraries it already has.

### Continuous ambient behavior

The entire homepage runs **two** continuous animations, both on one element: a 12,000ms linear rotation and a 4,000ms ease-out rotation on a purple→cyan gradient disc at **25% opacity** behind the Billing visual. The Billing page adds a single 1,000ms linear infinite spinner inside a demo. Enterprise Authentication had zero running animations.

The complete CSS keyframe vocabulary across all five pages is **six rules**: `fade-in`, `letter-reveal`, `blink`, `float`, `spin`, `pulse` — plus `terminal-cursor-blink` at `1s steps(1,end) infinite`. A `motion-reduce:animate-none` utility confirms reduced-motion support.

For comparison, Beam defines roughly sixty keyframes.

---

## 4.2 Clerk Experiential Findings

**The manual screen recordings are the authority for what Clerk actually FEELS like during interaction.** Where the technical layer is silent or frozen, this layer governs.

### The experiential formula

```
STABLE COMPOSITION
→ IMMEDIATE INTERACTION RESPONSE
→ FAST, FOCUSED MICRO-SEQUENCE
→ CLEAR RESULT / STATE
→ QUIET SETTLE
```

### The interaction shape

```
1 TRIGGER
→ 1 FOCAL MOVEMENT
→ 1 READABLE RESULT
```

### What this means in practice

- Key visuals are generally **understandable at rest**, before any interaction.
- Hover **adds behavior / state** to an already-legible composition; it does not assemble the entire UI from nothing.
- Motion is **localized** — usually only the meaningful part of the hovered card becomes active.
- Surrounding cards, layout, text, and overall composition **remain stable**.
- A complete hover demonstration may perceptually last **~1–3 seconds**.
- Individual beats can be much faster.
- **Time-to-understanding matters more than raw total duration.**
- There is little or no dead time.
- **Return-to-rest is quieter than the primary action** — no large dramatic reverse transition.
- Semantic animations tend to **settle** rather than run as uncontrolled perpetual loops.
- Motion answers *"What is active? What happened? What changed? Where did the state go?"* — rarely *"How can this look more animated?"*
- Scrolling feels natural and under the visitor's control; the page never holds the visitor hostage while a timeline completes.

### How to measure

**Do not convert Clerk into a rigid duration formula.** Measure:

- time to first response
- time to main idea
- dead time
- time to readable result
- settle behavior

instead of judging only total duration.

---

## 4.3 Clerk Connector / Travelling-State Candidate

Observed manually in the homepage dark feature-card grid: a **cyan travelling highlight / state moving along a connection toward another UI state or device.**

Behavior:

```
stable source
→ stable path / connection
→ travelling highlight / state
→ destination reacts / resolves
```

**Status: LIKELY RELEVANT / CANDIDATE** for Steve's Section 2 beam reference.

**Do not call it definitively Steve's exact reference yet.** See §8.

### Extracted principle

A connector should communicate:

```
WHERE STATE STARTED
→ WHERE IT TRAVELLED
→ WHERE IT ARRIVED
```

**The value is not "a glowing line." The value is readable causality.** Endpoints must stay visually stable so the viewer understands which two systems are related; the connector carries the state change.

---

# 5. Emil / animations.dev — SUPPORTING Craft Standard

**Emil is supporting craft guidance, not the primary benchmark.**

Use Emil to strengthen implementation quality *after* Beam meaning, Steve direction, and Clerk behavior have established the direction.

## Principles we adopt as support

**Purpose gate.** Every animation answers "why does this animate?" in one sentence from a fixed list: explanation, feedback / responsiveness, spatial consistency, state indication, preventing a jarring change, or rarely delight. *"If everything animates, nothing stands out."*

**Easing first, then duration.** These are one decision, in that order. When motion feels flat, the curve is usually too weak — not the duration too short.

**Curve families.** Strong `ease-out` for responsive entry and exit; `ease-in-out` for movement already on-screen; `ease` for hover and color; `linear` only for genuinely constant motion. **Never `ease-in` on responsive UI.** Built-in named curves are almost never strong enough — prefer custom asymmetric curves.

**Real springs** for interruptible state changes where appropriate. Default to serious spring behavior with little or no bounce (`{ duration: 0.3, bounce: 0 }`); bounce is personality, and smaller elements need more of it to read the same.

**Perceptual duration.** Emil's own term: *"For a spring, the time it feels finished even while subtle residual movement continues."* This is the vocabulary that reconciles Clerk's nominal 500ms with its immediate feel.

**Avoid uniform stagger.** 30–80ms, varied by importance. Uniform delay / distance / easing kills hierarchy.

**One entrance per container.** Don't slide a panel in *and* trickle its children in — present it with content already there.

**Object permanence.** An element should visibly travel between states rather than vanish and reappear from nowhere.

**Re-triggerable motion must be interruptible.** CSS transitions and springs retarget from the current state; `@keyframes` restart from zero.

**Choose a deliberate hero / rest frame.** Pause looping animation on a representative frame, never frame 0.

**Reduced motion preserves meaning.** Gentler, not zero: remove movement, keep opacity and color; delete purely decorative motion; for explanatory visuals, **jump between frames rather than tweening**.

**Hover gated for fine pointers.** `@media (hover: hover) and (pointer: fine)`; touch needs its own path.

**Prefer `transform` / `opacity`** for performance; swap down a tier for everything else; keep animated blur small; add `will-change` only after observing dropped frames.

**Choose animation tools intentionally.** CSS for simple and hardware-accelerated motion; Motion for React for springs, exits, and layout morphs. Note that **GSAP has no spring support**.

## Explicit limits on Emil's authority

- **Do not turn Emil's suggested duration bands into hard Beam requirements.** They govern cubic-bezier UI transitions, not spring perceptual duration, and Emil himself allows marketing pages to run longer.
- **Do not let Emil's "no scroll animations" marketing guidance automatically remove Beam's scroll storytelling.** Clerk — the primary benchmark — demonstrably uses scroll-entry reveals, and Steve has not asked for scroll storytelling to be removed.
- Emil's materials contain one internal contradiction on reduced motion. `emil-design-engineering/animations.md` says "disable all animations"; the dedicated `animation-accessibility` skill says "gentler, not zero." **We follow the dedicated accessibility skill.**

---

# 6. Shared Beam Motion Rules

## Semantic Purpose

Every animation must state, in one sentence, what it communicates about Beam. Motion whose only justification is dynamism is reconsidered or cut. Decorative motion is permitted only where it is clearly subordinate and does not compete with meaning.

## Stable Composition

Compositions are legible **at rest**. Motion adds behavior and state to an already-readable visual; it does not assemble the interface from nothing. The outer structure — cards, panels, endpoints, containers — stays stable while state changes happen inside it.

## Perceived Speed

Judge motion by **time to first response, time to main idea, dead time, time to readable result, and settle behavior** — not by total duration. Meaningful displacement should happen early; residual settling may continue after comprehension. Dead intervals where nothing meaningful is happening are defects.

## Sequence & Hierarchy

One trigger produces one focal movement and one readable result. When several things must animate, vary delay, distance, and prominence by importance. Uniform stagger is not acceptable. Avoid two simultaneous focal events competing for the same attention.

## State & Causality

Motion must show cause and effect. A state change should have a visible origin, a visible transition, and a visible resolution. Ambient activity is not a substitute for a readable event.

## Neutral-before-activation — the 2026-09-03 huddle pattern

Steve's huddle round is internally consistent. The pattern behind it, stated once so it does not have to be rediscovered per section:

1. **State should be visually neutral BEFORE activation.** Gray is the honest default. An element that has not been reached has no business showing an active colour.
2. **Colour / state changes happen because of a visible causal event** — something arrived. Not because a timer elapsed.
3. **Failed processes must not visually complete.** If the story is breakage, the connection stops short. A completed-looking animation contradicts the copy beside it.
4. **Successful processes must clearly complete.** The converse holds; do not hedge a success state.
5. **Persistent objects transform rather than being replaced** wherever the same object can carry the next state. Object permanence over scene-swapping.
6. **Remove redundant helper motion.** If the primary element already explains the movement, a second indicator is noise.
7. **A section that already communicates correctly is usually sped up, not redesigned.** Redesign needs a comprehension failure or a technical reason.
8. **Motion communicates `cause → state change → result`.**

This does not replace the Beam sequence — it is how each beat inside it is judged:

```
STABLE COMPOSITION
→ IMMEDIATE RESPONSE
→ FOCUSED MOTION SEQUENCE
→ CLEAR RESULT / STATE
→ QUIET SETTLE
```

And it does not replace the standing question asked of every animation:

> **"What is this animation communicating?"**

## Rest State

**Every looping, autoplay, or sequenced explanatory visual must have a deliberately chosen rest / result state that remains meaningful when motion is not running.** The rest state is what most visitors and reviewers see. Never rest on frame 0 of a loop, and never rest mid-transformation.

Interactive or live product surfaces — such as the Hero workspace demo — are **not** treated as frame-based animations and are exempt from this rule. Their resting condition is simply their normal, usable state.

## Hover Interaction

Hover is an enhancement, never the only path to meaning. Response to hover is immediate; the return to rest is quieter than the action. Hover changes stay localized to the hovered element and must not move surrounding layout. Gate hover for fine pointers, and ensure touch users receive the same product meaning by another route.

## Autoplay / Visibility-triggered Animation

Product demonstrations may play automatically when they become relevant. They should be built as discrete, committed state steps rather than perpetual loops. A demonstration begins at its beginning when the visitor arrives at it — not mid-cycle. Pause work that is off-screen.

## Scroll Transformation

Scroll should remain under the visitor's control. Content beside a held surface should keep moving so the reader always perceives progress.

**Persistent / sticky surfaces are the preferred DEFAULT** where they can communicate the same product story without intercepting scroll progress.

**This is a default, not a mandate to convert every existing scroll-driven section.** Where a section's scroll-linked behavior already carries meaningful causality that a sticky surface would lose, that behavior may stay. **The section-specific agreed decision always overrides this generic default** — see "Scroll transforms / pinning" below.

## Connector / Travelling-State Behavior

**Applies only where a connector itself carries semantic state or causality.** A purely structural or decorative line that merely indicates adjacency is not governed by this rule.

Where the rule does apply, the connector should communicate:

```
source / starting state
→ travel / transmission
→ destination / result
```

Endpoints stay visually stable so the viewer understands which two systems are related. A connector carrying semantic meaning should read as a single identifiable state moving between two identified systems, and should resolve. Continuous repeating patterns belong to ambient vocabulary, not to semantic state transfer.

**Apply this model only where the product context actually supports it.** Not every relationship in Beam is a transmission, and forcing a source → travel → destination reading onto a section whose meaning is not transmission would be exactly the decorative motion this document exists to prevent.

### Scope limit — important

**Steve's explicit Clerk / beam feedback applies ONLY to Problem / Solution.**

This shared principle must **not** be used as a mandate to rebuild connectors in **Sync, Agents, Share & Host**, or any other section. Those sections require their own product-meaning or Steve-feedback justification before their connector behavior is changed. The presence of this rule in the shared section is not that justification.

## Entrance / Reveal

Entrances are minimal and never carry meaning the content should carry. Nothing enters from nothing. Critical information must never wait on a reveal. One entrance per container.

## Exit / Quiet Settle

Exits and returns-to-rest are shorter and less prominent than the primary action. Reversing an interaction must not punish the viewer with a long reset sequence. Exit direction mirrors entry direction.

## Looping & Replay

Prefer sequences that settle over sequences that loop indefinitely. Where a loop exists, it must be interruptible or replayable without restarting from a jarring zero state, must pause off-screen, and must rest on a chosen hero frame. Replay must be available to a visitor who cannot hover.

## Reduced Motion

Reduced motion is **gentler, not zero**. Remove movement; keep opacity and color that carry meaning. Delete purely decorative motion entirely. For explanatory visuals where motion carries the explanation, **jump between states rather than tweening between them**, so the visitor still receives every state. Ship and *watch* both variants — reasoning about the reduced variant is not the same as seeing it.

## Accessibility

Reduced-motion and touch users must receive the same product meaning as everyone else. Visuals need accurate `aria-label`s; decorative layers are hidden from assistive technology. Interactive controls remain keyboard-operable with visible focus. Note the existing constraint that key-visual labels are outlined vector paths, so meaning currently rests on container labels.

## Performance

Prefer `transform` and `opacity`. Swap down a tier rather than animating layout or paint properties. Keep animated blur small. Add `will-change` only after observing dropped frames, and target only the animating element. Be especially careful with motion that runs while the page is busy — hydration on a large bundle is exactly that case.

## Animation Tool Choice

Choose deliberately per job rather than by habit. CSS transitions for interruptible, user-triggered state changes; CSS keyframes for genuinely autonomous or constant motion; Web Animations API where playback must be controlled programmatically; Motion for React for springs, presence/exit animation, and layout morphs. **GSAP cannot produce springs** — if spring feel is required, it must come from Motion for React. Having two animation libraries installed is a standing finding to resolve deliberately, not by drift.

## Tuning with DialKit

Motion values should be tunable without a rebuild-and-reload cycle for every adjustment, so that timing and choreography can be judged by feel against the Clerk benchmark rather than guessed in source.

**Status: not installed.** DialKit has not been added to Beam, and installing it is out of scope until explicitly approved. Until then, tuning is manual, and any live-tuning harness must be treated as a development-only concern that never ships in the production bundle.

---

## Agreed decisions

### Scroll-entry reveals

**Allowed, but NOT default.**

- If a reveal has no semantic purpose, prefer **no animation**.
- Otherwise **opacity-only**.
- **No generic translate-Y + blur choreography** as a site-wide default.
- **Critical information must never wait on reveal.**

This follows Clerk's verified practice (opacity-only, `transform: none`) rather than Emil's blanket prohibition, and is consistent with Steve's Secrets instruction.

### Scroll transforms / pinning

**No scroll hijacking by default.**

**Exception:** scroll-linked behavior is allowed where it clearly improves Beam's product causality and story.

**These section-specific decisions override the generic sticky-surface default in §6.**

### Problem / Solution

Its existing scroll-driven storytelling concept **remains allowed for now**, because:

- its causality is meaningful,
- Beam product meaning supports it,
- Steve did not ask for its removal,
- Steve's explicit target is the beam / connector behavior.

Do not convert this section to a sticky surface on the strength of the generic default alone.

### On-Demand

Its existing pin / scrub implementation is **NOT protected** and may be substantially rebuilt if a persistent / sticky or other interaction model better matches Steve's feedback and the Clerk benchmark. Persistent / sticky surfaces are valid candidates based on Clerk's Multi-tenancy pattern.

### Existing animations

**Existing motion is NOT sacred.** If current choreography is wrong, **rebuild it**. Do not preserve bad motion merely because code already exists. The approved Figma visual design remains fixed regardless.

---

# 7. Section-Specific Guardrails

Guardrails, not choreography. Final animation design is not specified here except where Steve has already been explicit.

## Hero

**Must remain understandable:** Beam is one workspace of real files, present across environments. The "Everywhere" claim needs representation it currently lacks.

**Steve constraint:** none given.

**Clerk benchmark:** command-line hero with the interface already established and no entrance to wait through; live product surfaces rather than illustrations.

**Emil support:** one entrance per container; frequency principle — in-demo interactions are high-frequency within a session and should stay near-instant.

**Must NOT happen:** the key visual must not be blank or unreadable on first paint; staggered reveals must not delay the informative element; the interactive demo's own state logic and persistence must not be disturbed by motion work.

---

## Problem / Solution

**Must remain understandable:** three manual setup steps are replaced by one mount command, and the destination becomes genuinely ready including secrets.

**Steve constraint:** *"The beam lasers, need to make it like Clerk."* — scoped to this section only.

**Clerk benchmark:** the travelling-state candidate — stable source → stable path → travelling state → destination resolves (status: CANDIDATE).

**Emil support:** object permanence; `linear` belongs to constant/ambient motion; line-drawing via `stroke-dashoffset` as a connector technique; performance — `background-position` is a paint-tier property and `will-change` should follow observed jank, not precede it.

**Huddle 2026-09-03 (authoritative):** State 1 is a FAILED process — pills start gray, the beam travels only ~halfway, impact turns pills gray → red with a localized ripple, then red pills slide out and are replaced (PS1–PS6). State 2 removes the black helper pills; the connector alone carries the motion (PS7–PS9).

**Must NOT happen:** do not remove the scroll-driven concept — it is not the feedback target. Do not destabilise the machine-card endpoints. Do not let the connector keep running independently of the section's causal sequence. **Do not let State 1's beam reach the destination**, and do not let its replacement cadence read as successful progression.

---

## Sync

**Must remain understandable:** a change made on one machine arrives on the others by itself, secrets included.

**Steve constraint:** *"weird and raw"* — **CLOSED.** The rebuilt motion is FOUNDER APPROVED and live on `main`.

**Huddle 2026-09-03 (authoritative):** the only open ask is dotted-trail refinement toward Clerk's motion quality — spacing, path-following, leading-edge clarity, tail falloff, consistency through bends, restrained luminance (SY1–SY7). Semantics, the 1800ms real-clock transaction, the linear counter, hug geometry and the non-clickable affordance are LOCKED.

**Clerk benchmark:** stable composition legible at rest; relationships established by stable geometry before motion.

**Emil support:** choose a deliberate hero/rest frame rather than resting on frame 0; object permanence for propagation; interruptibility.

**Must NOT happen:** do not regress the approved semantics or timing model. Do not leave a visitor who returns to the section with a frozen, meaningless frame. Do not leave replay available only to mouse users. No solid pill, no continuous laser, no full-path marquee, no Clerk colours or branding.

---

## On-Demand

**Must remain understandable:** the full tree is present as references, and opening a file is what causes its contents to arrive; large repos mount without filling local disk.

**Steve constraints:** transition must be *"seamless like this section at Clerk"*; the count-up and the ready state must share one coherent tempo with no dead gap (measured ≈880ms).

**Clerk benchmark:** the component gallery as a stable frame whose interior changes; the Multi-tenancy sticky sequence (one persistent visual, ~640px per step, no scrub, no snap).

**Emil support:** duration proportional to how much changed; cohesion — sub-animations share one timing feel; crossfade with a small directional hint and light blur rather than a heavy swap; avoid two competing focal events.

**Huddle 2026-09-03 (authoritative):** ONE persistent panel transforms across all three points (OD1). *Everything appears instantly* reveals sequentially in quick succession while still feeling almost instant (OD2–OD3). *Contents load on demand* moves the same panel up and scales it down into the "On your disk …" state (OD4). *Built for huge repos* zooms the same panel again (OD5).

**Must NOT happen:** demonstrations must not begin mid-cycle when the visitor arrives. The list and the visual must not both claim attention on every step change. Do not treat the existing pin/scrub structure as fixed. **Do not build three disconnected animations, and do not swap in a new panel where the existing one can transform.** Do not reveal everything simultaneously, and do not make the stagger slow.

---

## Agents

**Must remain understandable:** an agent operates on the same real workspace, bounded by a scope the user granted, and what it did is recorded.

**Steve constraint:** *"I am not sure what's going on here, the animation is very very slow."* — **superseded.**

**Huddle 2026-09-03 (authoritative):** the concept and choreography are **acceptable as-is**. The primary change is **SPEED** (AG1–AG4): same story, same meaning, faster pacing, less waiting, quicker readable result, Clerk's perceived speed as reference.

**Clerk benchmark:** one card / one feature / one concrete artefact — abstract guarantees shown as the evidence they produce; discrete one-shot state steps rather than one continuous timeline.

**Emil support:** stagger varied by importance (six confirmations one percentage point apart is textbook uniform stagger); one focal beat at a time; interruptibility; purpose gate.

**Must NOT happen:** **do not redesign the sequence** unless a technical issue requires it. Note the implementation risk: this visual's CSS targets Figma-generated ids and raw path prefixes, so changes fail silently — verify visually, not just by build success.

---

## Share & Host

**Must remain understandable:** one file can become either a shareable link or a live deployed site, in a single step.

**Steve constraint:** *"incredibly slow, so slow. Refer to how fast the animation is at Clerk website."*

**Huddle 2026-09-03 (authoritative):** speed up the overall animation, and add causal colour state — pills begin GRAY while unconnected and switch to their active colour **only when the connection reaches them** (SH1–SH4).

**Clerk benchmark:** perceived speed — meaningful displacement early, quiet settle; nothing on Clerk runs a 12-second semantic cycle.

**Emil support:** exits shorter than entries; easing-first before shortening; one focal movement per trigger.

**Must NOT happen:** the two branches must not compete inside one cycle such that following one means missing the other. Perceived duration must not contradict the "instantly" and "under 30 seconds" claims beside it. Do not simply shorten the existing timeline without strengthening the curve — that yields fast but flat motion. **Do not show a pill in its active colour before the connection has reached it**, and do not drive colour from a timer independent of the connector.

---

## Secrets

**Must remain understandable:** secrets arrive with the workspace and become available to the running application, without ever being committed or copied.

**Steve constraint:** explicit and prescriptive — composition visible at all times; terminal typing is the intro animation; no element-revealing opening.

**Huddle 2026-09-03 (authoritative):** reconfirmed, plus the animation must **autoplay** and **auto-loop** (SE1–SE5). This is an authorised exception to §6 Looping & Replay's preference for settling.

**Clerk benchmark:** command-line focal element with the interface already established; `terminal-cursor-blink` confirms terminal typing as a legitimate primitive.

**Emil support:** one entrance per container — present it with content already there; `linear` with `steps()` is the correct treatment for typing; reduced motion "jump, don't tween."

**Must NOT happen:** **do not reintroduce a large UI reveal before the terminal action.** This is a direct instruction, not a preference.

---

## Footer

**Must remain understandable:** one command results in an attached, ready workspace.

**Steve constraint:** direction is approved. The ripple blast may be reduced, reworked, or removed entirely — removal is pre-authorised.

**Clerk benchmark:** ambient motion that is slow, faint, and eventless; no pointer-reactive ambient layer anywhere near a conversion action.

**Emil support:** purpose gate — motion with no listed purpose is decorative and gets cut; reduced motion removes decorative motion entirely; press and hover feedback belong on the CTA itself.

**Must NOT happen:** ambient motion must not produce a discrete, attention-claiming event near the CTA. Do not discard the parts Steve called promising while addressing the ripple.

---

# 8. Unresolved / Do Not Assume

**Rule: UNRESOLVED DOES NOT BLOCK THE ENTIRE PROJECT.** It blocks only assumptions about that specific decision. **Never silently invent an answer.**

| # | Unresolved item | Blocks |
|---|---|---|
| 1 | ~~**The exact Clerk animation Steve personally meant by "beam lasers."**~~ Still not identified, but **NO LONGER BLOCKING** — the huddle of 2026-09-03 specifies Problem/Solution behavior directly (PS1–PS9). Clerk remains a motion-quality reference only. | Nothing. Implement from PS1–PS9 |
| 2 | ~~**The exact reason Sync reads as "weird and raw."**~~ **CLOSED.** The rebuilt Sync motion is FOUNDER APPROVED and shipped. Only dotted-trail refinement remains (SY1–SY7). | Nothing |
| 3 | **The exact target duration for Agents.** Still no number. Scope is now narrowed to speed only (AG1–AG4); the concept is accepted. Clerk's perceived-speed profile is the reference in the absence of a figure. | Fixing a numeric budget for Agents |
| 4 | **The exact target duration for Share & Host.** Still no number. The gray → active causal rule (SH2–SH4) is specified; the duration is not. | Fixing a numeric budget for Share & Host |
| 5 | **Which On-Demand timing is the canonical tempo** — whether the count-up or the ready state sets the correct pace. | Deciding which value to change |
| 6 | **Whether the Multi-tenancy sticky visual internally changes state across all three steps.** Structure implies it; not observed. | Treating it as a verified state-transformation reference |
| 7 | **Whether Steve's silence on Hero and Pricing means approval or omission.** | Prioritising Hero work |
| 8 | **Whether mobile is in scope.** As of `06880ba` the Problem/Solution pinned scene runs on all breakpoints (shorter range under 1024px, features as a mobile carousel); On-Demand's mobile behavior has not been re-verified. | Scoping breakpoint behavior |
| 9 | ~~**Whether DialKit or any live-tuning harness may be introduced.**~~ **CLOSED.** DialKit is installed as a devDependency and lives in the dev-only Motion Lab; it is not wired to any production visual and is excluded from the production bundle. | Nothing |
| 10 | **How to resolve two animation libraries** (framer-motion 13.1.1 and gsap 3.15.0), given GSAP cannot produce springs. | Library strategy |
| 11 | **Which pills State 1 replaces, and how many replacement rounds run before the scroll state ends.** The huddle specifies the behavior (gray → red → slide out → replaced) but not the count or the loop condition. | Fixing State 1's replacement cadence |
| 12 | **How far "approximately halfway" is, precisely.** No figure given for where the failed beam stops. | Locking State 1's beam travel distance |
| 13 | **Whether the On-Demand persistent panel must survive across the existing pin/scrub boundaries** or may re-mount between them while appearing continuous. | Choosing the On-Demand implementation strategy |

---

# 9. CONCLUSION — How We Answer Steve's Direction

## Final Direction Framework

**Steve defines WHAT must improve and what is unacceptable.** His feedback is the acceptance criterion. Where he is explicit — Secrets, the footer ripple, the On-Demand timing gap — his instruction is followed directly, not reinterpreted.

**Beam defines WHAT the animation must communicate.** Every section has a product meaning, a user takeaway, and a causal sequence. Motion exists to make that meaning clearer. Motion that does not serve it is reconsidered regardless of how well made it is.

**Clerk is the PRIMARY reference for HOW** polished interaction, sequencing, perceived speed, key-visual behavior, scrolling transformation, and state transitions should FEEL. When asking "is this good enough?", the comparison is Clerk.

**Emil supports Clerk** by helping translate those observed qualities into robust implementation decisions — easing families, spring configuration, interruption strategy, stagger, rest frames, reduced motion, performance, and tool choice. Emil explains *why* a Clerk-like behavior works and catches craft mistakes.

**Emil does NOT replace Clerk.** Where Emil's generic guidance conflicts with Steve, Beam meaning, approved Figma, or verified Clerk behavior, the higher authority wins.

```
STEVE DIRECTION
+
BEAM PRODUCT MEANING
↓
CLERK PRIMARY MOTION BENCHMARK
↓
EMIL SUPPORTING CRAFT PRINCIPLES
↓
BEAM MOTION DESIGN
↓
IMPLEMENTATION + DIALKIT TUNING
↓
MOTION QA AGAINST CLERK QUALITY + STEVE FEEDBACK
```

---

# Steve Feedback Resolution Map

| Beam Section | Steve Feedback | Beam Meaning | Primary Clerk Benchmark / Pattern | Emil Supporting Principle | Refinement Direction |
|---|---|---|---|---|---|
| **Problem / Solution** | "The beam lasers, need to make it like Clerk" | Three manual setup steps replaced by one mount that arrives ready | **CANDIDATE — likely relevant, exact Steve reference not independently confirmed.** Travelling-state: stable source → stable path → travelling state → destination resolves | Object permanence; `linear` is ambient vocabulary; `stroke-dashoffset` line-drawing; composite-only properties | **HUDDLE 2026-09-03 supersedes the open-ended direction.** State 1 is a FAILED process: gray pills, beam stops ~halfway, impact turns pills red with a localized ripple, red pills slide out and are replaced — reading as repeated friction, never as a completed connection. State 2 drops the black helper pills and lets the connector alone carry the motion. Scroll-driven concept retained. |
| **Sync** | "This looks really weird and raw" | An edit on one machine arrives on the others by itself | Stable composition legible at rest; relationship established by geometry before motion | Deliberate hero/rest frame; object permanence; interruptibility | **SHIPPED AND APPROVED.** MacBook → Beam → Cloud for both ADD and DELETE, 1800ms real-clock transaction, linear 0.0 → 1.8 counter, hug-content panels, non-clickable. **Remaining ask:** refine the dotted trail toward Clerk's motion quality — spacing, path-following, leading-edge clarity, tail falloff, consistency through bends, restrained luminance. Motion quality only; no Clerk colours or branding. |
| **On-Demand — seamless transition** | "Make the transition seamless like this section at Clerk" | The full tree is present as references; opening a file fetches it | Component gallery as a stable frame whose interior changes; Multi-tenancy persistent sticky surface at ~640px per step | Cohesion — one timing feel; crossfade with directional hint and light blur; one focal event | **HUDDLE 2026-09-03:** ONE persistent panel transforms across all three points. *Everything appears instantly* reveals sequentially in quick succession yet still feels almost instant; *Contents load on demand* moves that same panel up and scales it down; *Built for huge repos* zooms it again. Object permanence over scene-swapping. Existing pin/scrub structure is open to rebuild. |
| **On-Demand — Built for huge repos timing** | "The ready in 1.2s is too slow compared to the number animation above it" | Large repos mount without filling local disk | Perceived speed — meaningful displacement early, no dead interval | Duration proportional to how much changed; sub-animations share one timing feel | Bind the count-up and the result state into one coherent sequence and eliminate the ≈880ms dead interval, so the result reads as the conclusion of the count rather than a separate later event. |
| **Agents** | "I am not sure what's going on here, the animation is very very slow" | An agent works on the real workspace, scope-bounded and audited | One card / one feature / one concrete artefact; discrete one-shot state steps | Stagger varied by importance; one focal beat; purpose gate; interruptibility | **HUDDLE 2026-09-03 supersedes the comprehension requirement.** The concept and choreography are accepted; the primary change is **SPEED** — same story, same meaning, faster pacing, less waiting, quicker readable result, with Clerk's perceived speed as the reference. Do not redesign the sequence unless a technical issue requires it. |
| **Share & Host** | "Incredibly slow, so slow. Refer to how fast the animation is at Clerk website" | One file becomes a link or a live site in a single step | Perceived speed; nothing on Clerk runs a 12s semantic cycle | Easing-first before shortening; exits shorter than entries; one focal movement per trigger | Compress time-to-main-idea so the meaningful action and result land within normal dwell, and stop the two branches competing within one cycle — strengthening the curve rather than only cutting duration. **HUDDLE 2026-09-03 adds causal colour:** pills begin GRAY while unconnected and switch to their active colour only when the connection reaches them. Never active before connection. |
| **Secrets** | "Should not start by revealing the elements… focus on the terminal typing as the intro" | Secrets travel with the workspace and leave no trace | Command-line focal element with interface already established; `terminal-cursor-blink` primitive | One entrance per container; `linear` + `steps()` for typing; reduced-motion jump-don't-tween | Keep the composition established first, then terminal typing becomes the semantic trigger, directly following Steve's instruction and matching Clerk's stable-composition interaction pattern. **HUDDLE 2026-09-03 adds:** supporting elements already visible at the start, and the animation must **autoplay and auto-loop** — an authorised exception to the preference for settling. |
| **Footer** | "Looks promising. But the ripple blast feels weird — tweaked or removed altogether" | One command results in an attached, ready workspace | Single ambient loop, slow, faint, eventless; no pointer-reactive ambient near conversion | Purpose gate; reduced motion removes decorative motion; press/hover feedback on the CTA | Preserve the approved/promising direction while removing or heavily subordinating the ripple event so ambient motion no longer competes with the CTA, and let the attach confirmation read as a consequence of the command. |

---

## Definition of Success

Beam motion is successful when:

1. **Steve's explicit feedback is addressed.**
2. **The product meaning of each section becomes clearer because of motion.**
3. **The experience reaches Clerk's quality bar** for perceived speed, polish, continuity, interaction behavior, and key-visual storytelling.
4. **Emil's principles improve craft and implementation** without overriding Clerk or Beam.
5. **Animation still works when viewed at rest.**
6. **Motion feels intentional rather than decorative.**
7. **Visitors understand the main idea quickly** without waiting through dead time.
8. **Reduced-motion and touch users still receive the same product meaning.**
9. **Typecheck and production build remain green.**
10. **Motion can be tuned without redesigning the approved Figma visual.**

---

*This document synthesizes: the Beam product-context and current-motion audit; Steve's Slack feedback (authoritative corrected scope); **Steve's huddle round of 2026-09-03 (latest authoritative section direction, marked `HUDDLE 2026-09-03` inline)**; the Clerk technical benchmark (homepage + four product pages, direct inspection); the Clerk experiential benchmark (manual screen recordings); and the Emil Kowalski / animations.dev craft standards installed at user level.*
