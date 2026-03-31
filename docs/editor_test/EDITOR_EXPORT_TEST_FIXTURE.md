# Constella Editor Export Regression Fixture

This document is a full regression fixture for the current Markdown/TXT editor and the `MD / TXT / PDF` export flow.

It is designed to cover all current slash command content types in `NodeEditorModal`, including headings, lists, divider, quote, inline styles, links, images, tables, code blocks, math, and Mermaid diagram variants.

## 1. Slash Command Coverage Matrix

The sections below intentionally exercise these slash commands:

- `h1`
- `h2`
- `h3`
- `bullet`
- `numbered`
- `todo`
- `quote`
- `divider`
- `code`
- `code-js`
- `code-ts`
- `code-py`
- `code-java`
- `code-css`
- `code-html`
- `code-sql`
- `code-sh`
- `code-json`
- `math`
- `math-block`
- `mermaid-flow`
- `mermaid-seq`
- `mermaid-mindmap`
- `mermaid-class`
- `mermaid-state`
- `mermaid-er`
- `mermaid-gantt`
- `mermaid-journey`
- `mermaid-pie`
- `mermaid-gitgraph`
- `mermaid-timeline`
- `mermaid-quadrant`
- `mermaid-requirement`
- `bold`
- `italic`
- `strike`
- `link`
- `image`
- `table`

## 2. Headings

### 2.1 Third-Level Heading

This subsection validates the `h3` slash command and heading nesting.

## 3. Basic Rich Text

This paragraph checks plain body text rendering, line wrapping, punctuation, and mixed inline syntax.

Here is **bold text** using the `bold` command.

Here is *italic text* using the `italic` command.

Here is ~~strikethrough text~~ using the `strike` command.

Here is `inline code` inside a normal paragraph.

Here is a hyperlink created with the `link` command: [OpenAI](https://openai.com).

Here is an image created with the `image` command:

![Constella Export Placeholder](https://placehold.co/720x220/png?text=Constella+Export+Image)

## 4. Lists

- Bullet item A
- Bullet item B
- Bullet item C

1. Numbered item one
2. Numbered item two
3. Numbered item three

- [ ] Todo item not done
- [x] Todo item completed

## 5. Quote And Divider

> This is a blockquote produced by the `quote` slash command.
> It should preserve indentation, spacing, and quote styling in preview and PDF export.

---

## 6. Table

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Alpha | Beta | Gamma |
| 123 | 456 | 789 |
| Long content cell | Text with **formatting** | `code` |

## 7. Generic Code Block

```
Plain fenced code block
without language annotation
to validate the generic `code` slash command.
```

## 8. Language Code Blocks

### JavaScript

```javascript
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

greet("Constella");
```

### TypeScript

```typescript
interface ExportResult {
  format: "md" | "txt" | "pdf";
  success: boolean;
}

const result: ExportResult = {
  format: "pdf",
  success: true
};
```

### Python

```python
def fibonacci(n: int) -> list[int]:
    values = [0, 1]
    while len(values) < n:
        values.append(values[-1] + values[-2])
    return values[:n]

print(fibonacci(8))
```

### Java

```java
public class ExportCheck {
    public static void main(String[] args) {
        System.out.println("PDF export ready");
    }
}
```

### CSS

```css
.export-card {
  border-radius: 16px;
  background: linear-gradient(135deg, #1e293b, #334155);
  color: #e5eefc;
}
```

### HTML

```html
<section class="export-card">
  <h1>Export Preview</h1>
  <p>HTML block for renderer validation.</p>
</section>
```

### SQL

```sql
SELECT id, title, exported_at
FROM documents
WHERE format = 'pdf'
ORDER BY exported_at DESC;
```

### Shell

```bash
npm install
npm run build
npx vue-tsc -b
```

### JSON

```json
{
  "document": "export-test",
  "formats": ["md", "txt", "pdf"],
  "success": true
}
```

## 9. Inline Math

Einstein's famous equation is $E = mc^2$.

The quadratic formula can be written as $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

## 10. Block Math

$$
\int_a^b f(x)\,dx = F(b) - F(a)
$$

$$
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
$$

## 11. Mermaid Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Done]
    B -->|No| D[Retry]
```

## 12. Mermaid Sequence Diagram

```mermaid
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi
```

## 13. Mermaid Mindmap

```mermaid
mindmap
  root((Topic))
    Branch One
      Detail A
      Detail B
```

## 14. Mermaid Class Diagram

```mermaid
classDiagram
    class Animal {
      +String name
      +eat()
    }
    class Dog {
      +bark()
    }
    Animal <|-- Dog
```

## 15. Mermaid State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: Fetch
    Loading --> Success: Done
    Loading --> Error: Fail
    Error --> Idle: Retry
```

## 16. Mermaid ER Diagram

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
      string id
      string email
    }
    ORDER {
      string id
      float total
    }
```

## 17. Mermaid Gantt Chart

```mermaid
gantt
    title Product Launch
    dateFormat  YYYY-MM-DD
    section Design
    Wireframes    :done,    des1, 2026-03-01,2026-03-03
    Review        :active,  des2, 2026-03-04, 3d
    section Build
    API           :         dev1, after des2, 4d
    UI Polish     :         dev2, after dev1, 3d
```

## 18. Mermaid Journey Map

```mermaid
journey
    title User onboarding
    section Discover
      Visit homepage: 4: User
      Read product story: 5: User
    section Activate
      Create account: 3: User
      Finish setup: 4: User
```

## 19. Mermaid Pie Chart

```mermaid
pie title Traffic sources
    "Organic" : 42
    "Direct" : 23
    "Social" : 18
    "Email" : 17
```

## 20. Mermaid Git Graph

```mermaid
gitGraph
    commit id: "init"
    branch feature
    checkout feature
    commit id: "editor"
    checkout main
    merge feature
```

## 21. Mermaid Timeline

```mermaid
timeline
    title Product Evolution
    2023 : Idea
         : First prototype
    2024 : Private beta
         : Team rollout
    2025 : Public launch
```

## 22. Mermaid Quadrant Chart

```mermaid
quadrantChart
    title Feature Prioritization
    x-axis Low effort --> High effort
    y-axis Low impact --> High impact
    quadrant-1 Quick wins
    quadrant-2 Big bets
    quadrant-3 Fill-ins
    quadrant-4 Time sinks
    "Search" : [0.32, 0.82]
    "Sync" : [0.76, 0.88]
    "Themes" : [0.24, 0.42]
    "Import" : [0.81, 0.26]
```

## 23. Mermaid Requirement Diagram

```mermaid
requirementDiagram
    requirement user_auth {
      id: 1
      text: User signs in securely
      risk: medium
      verifymethod: test
    }
    requirement session_persist {
      id: 2
      text: Session survives app restart
      risk: low
      verifymethod: analysis
    }
    element web_app {
      type: application
    }
    web_app - satisfies -> user_auth
    web_app - satisfies -> session_persist
```

## 24. Escaping And Mixed Content

Special characters: `<tag>`, `&`, `"quoted text"`, and backticks inside code should remain safe.

Mixed sentence with link, code, and math: use [docs](https://example.com), inspect `exportDocument()`, and verify $a^2+b^2=c^2$.

## 25. Long Paragraph Stress Test

This section exists to test long-form paragraph wrapping in preview, PDF rendering, and TXT extraction. It intentionally includes enough text to span multiple visual lines so you can confirm spacing, alignment, readability, and whether exported output preserves a natural reading rhythm without clipping, collapsing, or introducing awkward breaks across lines and pages.

## 26. TXT Export Expectations

When exporting as TXT, you should verify:

- The document remains readable without excessive Markdown syntax noise.
- Headings are still understandable as plain text.
- Code blocks become readable plain text.
- Tables degrade acceptably into plain text.
- Mermaid and math content remain preserved as readable text or formula placeholders, depending on the export behavior.

## 27. Final Check

If this document exports successfully to:

- `.md`, the raw Markdown structure should remain intact.
- `.txt`, the content should still be readable in plain text form.
- `.pdf`, layout, code highlighting, formulas, image rendering, and Mermaid diagrams should render cleanly.
