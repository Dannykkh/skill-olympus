# Experience Contract: Skill Olympus Pages v6

## Source Mode

Mode: benchmark. Preserve the live page's approved editorial identity while changing its information
architecture and factual content.

## Product Facts

- Skill Olympus v6.0.0 has 100 public skill sources.
- The default allowlist union contains 24 entries: 18 user entry points and 6 runtime adapters.
- Each integrated runtime exposes 20 or 21 active skills; 76 modules remain source-only.
- Claude Code, Codex CLI, Antigravity CLI, and Grok Build are integrated surfaces.
- OpenClaw and Hermes Agent receive portable skills only.
- All 42 custom-agent references remain source-only; zero are registered by default.

## Benchmark Sources

- The current live Korean and English pages at the public GitHub Pages URL.
- README.md and the three localized READMEs on master at v6.0.0.
- The runtime matrix and installer commands in the repository documentation.

## Page Goal

Help an individual developer understand the product model in one viewport, choose the correct install
path, and reach the repository or installation section without reading the full catalog.

## Audience and Tasks

The primary audience is an individual developer using one or more coding CLIs. Their tasks are to
understand what is shared, identify their host's support level, inspect the delivery workflow, and run
the correct installer. Maintainers are a secondary audience and need factual counts and clear boundaries.

## Header and Navigation

Use a compact sticky header with Overview, Workflow, Support, Install, GitHub, and four real locale links.
The GitHub action is primary; language links expose current-page state through aria-current.

## Core Message

One workflow system for four integrated coding CLIs, with portable skills for two additional hosts.
Zeus coordinates delivery; Chronos preserves progress; Mnemo preserves decisions.

## Content Integrity

| Content | Classification | Source |
|---|---|---|
| Runtime tiers and counts | verified | v6.0.0 README and installer policy |
| Workflow phase names | verified | Zeus, Chronos, and Mnemo skill contracts |
| Installation commands | verified | repository installer scripts and README |
| Product claims | verified | released source and tests |

No prototype, placeholder, or hypothesis content is presented as a product fact.

## Section Order

Header, hero, runtime map, delivery pipeline, workflow choices, support matrix, installation, evidence,
footer. The product model appears before mythology or catalog depth.

## CTA Strategy

Primary action: open the GitHub repository. Secondary action: jump to install. At the install section,
commands are the action and each host's limitations are shown before the user runs them.

## Trust Strategy

Use released version, exact registry counts, explicit zero-custom-agent default, support-level boundaries,
MIT license, and links to source, changelog, and tests. Avoid testimonial or fabricated usage metrics.

## Asset Provenance

The system overview is a repository-authored SVG derived from released skill contracts. The design uses
no stock photography, generated raster illustration, or third-party icon pack. Fonts come from Google
Fonts or the Pretendard CDN and retain their upstream licenses.

## Desktop Structure

Use a maximum 1160-pixel grid. The hero is an asymmetric two-column composition. The runtime map spans
the grid; the six-step pipeline reads horizontally; support and install use paired columns with visible
rules. The primary action stays above the fold.

## Mobile Transformations

- retain the value proposition, version, actions, runtime tiers, and installer.
- reorder the system diagram into integrated hosts, skills-only hosts, pipeline, persistence, and memory.
- compress navigation to brand, repository action, and locale links.
- collapse comparison columns into bordered rows.
- defer long workflow explanations below the system overview.
- replace horizontal phase rails with a numbered vertical sequence.
- remove decorative metadata that does not change a decision.

## States

Loading uses the complete static HTML immediately and hides webfont swapping with font-display swap.
Empty is not applicable because content is bundled. Error means external font or GitHub link failure and
falls back to readable local fonts and visible URLs. Success means the page renders its core message,
navigation, diagram, and install commands without JavaScript.

## Performance Budget

First-view required assets are one shared stylesheet and one small SVG. JavaScript is optional and under
3 KB uncompressed. No framework, video, or raster hero asset is allowed. The full page should remain
usable before webfonts load and avoid layout shift through stable font stacks and dimensions.

## Accessibility Contract

Provide semantic landmarks, a skip link, ordered headings, visible focus, 44-pixel touch targets, text
alternatives for the system diagram, reduced-motion support, and AA color contrast. Language routes set
the correct html lang and expose alternate hreflang links.

## Adopt

Adopt the existing dark editorial identity, signal yellow, serif display voice, mono operational labels,
visible rules, and direct repository action.

## Adapt

Adapt the hero from a mythology slogan to a precise product promise. Adapt the old roster and five-step
pipeline into a current runtime model and six-step Zeus delivery sequence.

## Avoid

Avoid full-parity claims for skills-only hosts, stale Gemini references, equal marketing-card grids,
purple-blue gradients, hidden mobile content, tiny body copy, and motion that continues after entry.

## Prompt Contract

- goal: communicate v6.0.0 support and workflow in one scan.
- task: implement a four-locale static GitHub Pages landing page and shared system SVG.
- facts: use only released registry, runtime, and installer facts.
- content_integrity: preserve every verified qualifier, especially skills-only and zero registered agents.
- assets: use the authored SVG, locale fonts, and no unverified imagery.
- responsive: apply the stated retain, reorder, compress, collapse, defer, replace, and remove operations.
- states: deliver loading, empty, error, and success behavior through resilient static HTML.
- success: pass contract, render, link, overflow, metadata, font, reduced-motion, and accessibility checks.

## Success Checks

- No active-page copy identifies Gemini as a supported runtime.
- All four locale URLs have canonical and complete hreflang links.
- Desktop and mobile show no horizontal overflow or clipped action.
- The diagram remains understandable without relying on color alone.
- Core content and navigation work with JavaScript disabled.
- Installer commands and support boundaries match the released README.
