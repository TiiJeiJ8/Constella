# Mermaid PDF Fixture Index

Use this index to run a practical calibration session for Mermaid export.

## Fixture Set

- EDITOR_EXPORT_MERMAID_TALL_FIXTURE.md
- EDITOR_EXPORT_MERMAID_WIDE_FIXTURE.md
- EDITOR_EXPORT_MERMAID_MULTI_BLOCK_FIXTURE.md
- EDITOR_EXPORT_MERMAID_PAGE_BOUNDARY_FIXTURE.md
- EDITOR_EXPORT_MERMAID_TUNING_BASELINE.md

## Suggested Execution Order

1. EDITOR_EXPORT_MERMAID_TALL_FIXTURE.md
2. EDITOR_EXPORT_MERMAID_WIDE_FIXTURE.md
3. EDITOR_EXPORT_MERMAID_MULTI_BLOCK_FIXTURE.md
4. EDITOR_EXPORT_MERMAID_PAGE_BOUNDARY_FIXTURE.md
5. EDITOR_EXPORT_MERMAID_TUNING_BASELINE.md

## What To Record Per Export

- oversize: Auto scale or Move to next page
- scale mode: Fit page or Fit width
- density: Standard or Compact
- orientation: Portrait or Landscape
- readability score (1-5)
- space efficiency score (1-5)
- clipping/overflow issue
- page transition issue

## Next-Step Rule

After one full run across all fixtures:

- Tune minScale first if readability is low.
- Tune max-height if clipping appears.
- Tune wrapper spacing if whitespace is excessive.
- Re-run only the affected fixtures for quick iteration.
