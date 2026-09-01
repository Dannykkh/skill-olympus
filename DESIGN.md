---
name: skill-olympus
status: current
updated: 2026-09-01
direction: olympian-control-plane
tokens:
  color:
    background: "#0d0e12"
    surface: "#15171d"
    text: "#f4f2ec"
    muted: "#a7a8b0"
    line: "#30323a"
    accent: "#e6bd32"
    accent-strong: "#ffd451"
  typography:
    display-latin: "Fraunces"
    display-korean: "Hahmlet"
    body-latin: "DM Sans"
    body-korean: "Pretendard Variable"
    body-japanese: "Noto Sans JP"
    body-chinese: "Noto Sans SC"
    mono: "IBM Plex Mono"
  spacing:
    page-max: "1160px"
    section-y: "clamp(4.5rem, 9vw, 8rem)"
    gutter: "clamp(1.25rem, 5vw, 4rem)"
  radius:
    small: "2px"
    medium: "6px"
  motion:
    duration-fast: "150ms"
    duration-enter: "700ms"
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
---

# Skill Olympus Design

Skill Olympus is presented as a technical control plane with the gravity of an editorial artifact. The
visual system uses near-black surfaces, porcelain text, and one signal-yellow accent. The signature scene
is a continuous pipeline rail: runtimes enter at the top, Zeus coordinates the middle, and Chronos and
Mnemo run underneath as persistence and memory rails.

## Layout

- Use visible grid lines and asymmetric editorial splits rather than equal card grids.
- Keep the first viewport focused on one value proposition, one system diagram, and two actions.
- Desktop may use two columns; mobile must transform to a single ordered reading path.
- Radius is structural, not decorative. Most boundaries are square or two-pixel corners.

## Typography

- Display copy uses Fraunces, with Hahmlet for Korean glyphs.
- Body copy loads a locale-appropriate webfont; never rely on a silent system fallback.
- Operational labels and commands use IBM Plex Mono.
- Headlines are sentence case. Avoid generic future-facing marketing language.

## Color and Motion

- New CSS colors must provide a hexadecimal fallback followed by oklch().
- Do not introduce purple-blue gradients. Accent yellow marks control flow, selection, and primary action.
- Motion is limited to opacity and transform, runs once on entry, and is disabled by reduced-motion.
- Navigation uses native View Transitions when supported. Scroll-linked accents use CSS timelines only.

## Accessibility

- All foreground/background combinations target WCAG AA.
- Focus indicators remain visible and are not replaced by hover-only feedback.
- The SVG overview has a title and description, while adjacent prose carries the same information.
- Interactive targets are at least 44 CSS pixels on touch layouts.

## Avoid

- No generic three-card marketing grid.
- No decorative glassmorphism, ambient blobs, or continuous looping animation.
- No unsupported parity claims: OpenClaw and Hermes Agent remain skills-only.
- No Gemini runtime in current product copy; historical migration notes may name it when necessary.
