# Design — NagrikSewa AI

Locked design system. Future Hallmark runs read this file first; pages defer to it. Amend intentionally — the file is the rule.

## System
- Genre · modern-minimal (Civic Infrastructure & Autonomous Operations)
- Macrostructure · Technical Split-Canvas / Command Operating System
- Theme · custom (vibe: "civic command center, high-contrast municipal cobalt, purposeful tactile controls, zero generic slop")
- Axes · dark-technical / geometric-sans / civic-cobalt-saffron

## Tokens (canonical)
```css
:root {
  /* Paper (Background & Surfaces) */
  --color-paper:        #080d1a;
  --color-paper-2:      #0e1626;
  --color-paper-card:   #131d31;
  --color-paper-elev:   #1a263e;
  
  /* Ink (Typography & Contrast) */
  --color-ink:          #f8fafc;
  --color-ink-muted:    #94a3b8;
  --color-ink-faint:    #64748b;
  
  /* Borders & Rules (Hairline, subtle, never harsh) */
  --color-rule:         rgba(255, 255, 255, 0.09);
  --color-rule-focus:   rgba(14, 165, 233, 0.45);
  
  /* Municipal Action & Gov Status Accents */
  --color-accent:       #0284c7;  /* Civic Cobalt */
  --color-accent-hover: #0369a1;
  --color-accent-saffron: #f97316; /* RTS SLA Warning Saffron */
  --color-accent-emerald: #10b981; /* Verified Resolution Emerald */
  --color-accent-rose:  #ef4444;   /* Level-4 Escalation Crimson */

  /* Typography Stacks */
  --font-display: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body:    'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* 4-pt Spacing Scale */
  --space-3xs: 2px;
  --space-2xs: 4px;
  --space-xs:  8px;
  --space-sm:  12px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 48px;
}
```

## Anti-Pattern Boundaries (Zero Slop)
- **No purple-gradient heroes or generic indigo blobs**: Grounded in purposeful civic cobalt (`#0284c7`) and deep municipal slate (`#080d1a`).
- **No gradient headline text**: Display titles must be crisp, solid ink with deliberate weight and typographic hierarchy.
- **No fake drawn chrome**: Never mock browser bars, fake macOS window dots, or decorative code-editor bars. Real toolbars only.
- **No unstyled raw buttons**: Every interactive trigger uses purposeful pill or micro-radius tactile states.
- **Honest copy only**: Every statistic reflects actual database counts or certified RTS Act SLA requirements.

## Component Stances
- **Buttons**: Tactile pills (`border-radius: 9999px` or `8px`), crisp hairline borders, micro-elevation on hover (`translateY(-1px)`).
- **Diagrams / Canvases**: High-contrast dark technical grid (`#080d1a` background, 24px dot pitch, SVG Pan/Zoom enabled).
- **Drawer & Code Editor**: High-density floating drawer, dark monochromatic editor surface (`#050811`), syntax highlighting in JetBrains Mono.
