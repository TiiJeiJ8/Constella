# Mermaid Multi-Block Fixture (PDF Export)

Use this fixture to validate placement, spacing, and pagination when multiple Mermaid blocks are close together.

## 1. Purpose

This file helps you evaluate:

- Vertical rhythm between consecutive Mermaid wrappers.
- Whether compact spacing reduces dead space usefully.
- Whether page-break strategy feels predictable.

## 2. Block A

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Worker
    User->>API: Export request
    API->>Worker: Build printable HTML
    Worker-->>API: Ready
    API-->>User: Saved
```

## 3. Block B

```mermaid
classDiagram
    class ExportPanel {
      +open()
      +confirm()
      +cancel()
    }
    class MarkdownRender {
      +renderMarkdownToHtml()
      +buildPrintableDocumentHtml()
    }
    class DocumentExport {
      +exportDocument()
      +exportAsPdf()
    }
    ExportPanel --> DocumentExport
    DocumentExport --> MarkdownRender
```

## 4. Block C

```mermaid
gantt
    title Export Pipeline Timeline
    dateFormat  YYYY-MM-DD
    section Build
    Parse Markdown       :done,   b1, 2026-04-01, 1d
    Render Mermaid       :active, b2, after b1, 1d
    section Output
    Build print HTML     :        o1, after b2, 1d
    Generate PDF         :        o2, after o1, 1d
```

## 5. Observation Notes

- Check top and bottom whitespace around each Mermaid block.
- Check if one large block pushes small blocks awkwardly.
- Check whether compact mode is still readable for labels.
