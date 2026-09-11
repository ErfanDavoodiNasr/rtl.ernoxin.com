# Fixture E — Diagrams

```mermaid
flowchart LR
  A[شروع] --> B{تصمیم}
  B -->|بله| C[ادامه]
  B -->|خیر| D[پایان]
```

```mermaid
sequenceDiagram
  participant U as User
  participant A as App
  U->>A: Export PDF
  A-->>U: Print dialog
```
