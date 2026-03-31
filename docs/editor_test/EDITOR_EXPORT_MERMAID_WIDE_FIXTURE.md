# Mermaid Wide Fixture (PDF Export)

Use this fixture to validate very wide Mermaid diagrams.

## 1. Purpose

This file emphasizes horizontal pressure. It helps you evaluate:

- Fit width behavior on wide graph structures.
- Fit page behavior when both width and height are constrained.
- Whether right-side nodes are clipped.

## 2. Wide Dependency Graph

```mermaid
flowchart LR
    A01[Module 01] --> A02[Module 02]
    A02 --> A03[Module 03]
    A03 --> A04[Module 04]
    A04 --> A05[Module 05]
    A05 --> A06[Module 06]
    A06 --> A07[Module 07]
    A07 --> A08[Module 08]
    A08 --> A09[Module 09]
    A09 --> A10[Module 10]
    A10 --> A11[Module 11]
    A11 --> A12[Module 12]
    A12 --> A13[Module 13]
    A13 --> A14[Module 14]
    A14 --> A15[Module 15]
    A15 --> A16[Module 16]
    A16 --> A17[Module 17]
    A17 --> A18[Module 18]
    A18 --> A19[Module 19]
    A19 --> A20[Module 20]

    A03 --> B03[Side Branch 03]
    A07 --> B07[Side Branch 07]
    A11 --> B11[Side Branch 11]
    A15 --> B15[Side Branch 15]
    A19 --> B19[Side Branch 19]
```

## 3. Observation Notes

- Compare Fit width vs Fit page legibility.
- Verify no clipped labels at the far right.
- Verify wrapper spacing does not waste too much area.
