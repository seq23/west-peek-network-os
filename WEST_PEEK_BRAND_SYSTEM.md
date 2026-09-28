# West Peek Brand System

**Status:** CANONICAL / LOCKED

## Brand anchor

The West Peek logo is the primary brand anchor. Use the approved repository asset; do not fabricate substitute marks. Product names may remain repo-specific, but the visual family must remain recognizably West Peek.

## Canonical palette

| Token | Value | Approved use |
| --- | --- | --- |
| West Peek Orange | `#F05A1A` | Primary CTAs, active states, key metrics, selected controls, accent borders, and small emphasis moments |
| Black / near-black | `#050505` / `#171717` | Navigation, hero surfaces, high-authority headings, footer surfaces, and strong-contrast areas |
| White | `#FFFFFF` | Primary content surfaces, cards, inputs, tables, and text on dark surfaces |
| Warm off-white | `#F7F2EA` | Page backgrounds, section separation, secondary cards, and reduced visual fatigue |
| Soft orange tint | `#FFF1E9` | Selected states, notices, focus treatment, and restrained emphasis |

## Governing rule

**Orange is an accent, not the entire interface.**

The product must remain black/white first. Orange must guide attention rather than wash entire pages. Large orange backgrounds, promotional gradients, and repeated orange card fills are prohibited unless a repo-specific approved experience requires them.

## Component rules

- Primary navigation and high-authority shells use black or near-black.
- Primary content surfaces use white.
- Page backgrounds use warm off-white or white.
- Primary CTAs may use West Peek Orange when they need immediate attention; black remains acceptable for high-authority primary actions.
- Active navigation, selected controls, focus rings, key metrics, live indicators, and accent borders may use orange.
- Status semantics retain accessible red, amber, and green where meaning requires them; orange must not replace safety semantics.
- Typography must remain high contrast and restrained.
- Soft orange tint is sparse and never a default page wash.
- Generic blue, purple, indigo, violet, or cyan must not serve as a primary brand color. Provider-specific colors may appear only inside isolated provider surfaces when functionally necessary.

## Logo rule

- Use the approved West Peek logo asset in the primary shell, header, sidebar, or opening product surface.
- Keep the logo legible on white or near-black.
- Do not recolor, redraw, distort, or replace it with a generated placeholder.
- Repo-specific sub-brand wordmarks may accompany the logo, but may not displace West Peek as the parent brand.

## Hallmark acceptance

A Hallmark review must verify:

1. black/white visual authority dominates;
2. `#F05A1A` is the canonical orange;
3. orange usage is restrained and purposeful;
4. warm neutral backgrounds reduce fatigue without making the interface beige or washed out;
5. the approved logo is visible at an appropriate primary brand anchor;
6. mobile and desktop retain high contrast and clear CTA hierarchy;
7. no generic blue/purple/cyan styling competes with the brand system.

## Change control

Any change to the canonical orange, parent-logo treatment, or black/white-first rule requires owner approval and an update to this file in every West Peek repo.

## Network OS dark default (owner-approved 2026-09-27)

Network OS opens on near-black page and card surfaces with high-contrast light text. Its optional light theme remains available through the sidebar and Settings controls; the choice persists in this browser. The navigation shell remains near-black in both themes. The canonical orange remains `#F05A1A`, used for selected states and primary actions, not broad surfaces. The light theme uses `--wp-page`, `--wp-card`, and `--wp-ink` for warm page, white card, and dark text; the dark theme overrides those same tokens with `#0d0c0b`, `#161412`, and `#f4ede6`. Semantic good, warning, and danger colors retain their distinct meanings.
