# Presentation

Place your slide deck in this folder.

## Accepted Formats

  slides.pdf      ← Preferred (universally viewable)
  slides.pptx     ← Acceptable
  slides.key      ← Acceptable (macOS Keynote)

Rename your file to `slides.pdf` (or `slides.pptx`) so the evaluation
pipeline can locate it reliably.

## Recommended Slide Structure (5–8 slides)

  Slide 1: Title — Project name, team name, track
  Slide 2: Problem — What problem? Who has it? Why does it matter?
  Slide 3: Solution — What you built in one clear diagram or screenshot
  Slide 4: Architecture — How the system works technically
  Slide 5: Demo / Key Feature — Screenshot or flow of your best feature
  Slide 6: IBM Technologies — Specifically how you used them
  Slide 7: Results / Impact — What does success look like? Any metrics?
  Slide 8: Team — Names, roles, what each person built

## Tips

- Keep slides visual — diagrams beat bullet points
- One idea per slide
- Font size minimum 24pt for readability
- Do not paste large code blocks into slides — reference the repo instead

---

## 📝 Slide-by-Slide Content (Copy-Paste into slides.pptx)

### Slide 1: Title
- **Headline:** D1: AeroReady 
- **Sub-headline:** Mission Readiness & Predictive Maintenance Platform
- **Team:** Team Astraea (Deep Kayastha, Dhairya Harivadan Patel, Parmar Krish Hiteshkumar, Mayur Ashokbhai Maghrola)
- **Track:** AI Track

### Slide 2: The Problem
- **Headline:** The $90B Maintenance Problem
- **Bullet 1:** The US military spends $90B/year on calendar-based maintenance schedules.
- **Bullet 2:** Healthy assets are over-serviced, while unanalyzed HUMS sensor data leads to unexpected failures.
- **Bullet 3:** The core unanswered question: *"Is this specific aircraft safe to fly today's mission?"*

### Slide 3: The Solution
- **Headline:** AeroReady: Data-Driven Go/No-Go Decisions
- **Bullet 1:** Ingests raw turbofan telemetry and predicts remaining life.
- **Bullet 2:** Compares predicted life against specific mission durations.
- **Bullet 3:** Outputs an explicit Margin of Safety (e.g., "+86 cycles of margin").

### Slide 4: Architecture
- **Headline:** Dual-Model ML Pipeline
- **Bullet 1:** **LSTM:** Predicts Remaining Useful Life (RUL) with high accuracy (MAE: 10.05).
- **Bullet 2:** **Isolation Forest:** Classifies 14 individual sensors as Normal, Degrading, or Abnormal against a healthy baseline.
- **Bullet 3:** Fast, deterministic, and completely local—no external AI APIs required for the pipeline.

### Slide 5: Demo / Key Feature
- **Headline:** The Mission Readiness Dashboard
- *(Include Screenshot of the Fleet Dashboard here)*
- **Bullet 1:** Fleet-wide view of prioritized engines.
- **Bullet 2:** Detailed sensor health drawer for immediate mechanic review.

### Slide 6: IBM Technologies
- **Headline:** IBM Bob as an IDE & Flight Line Copilot
- **Bullet 1:** **As our IDE:** IBM Bob was used to scaffold the pipeline, build the React UI, and write the backend.
- **Bullet 2:** **As our Copilot:** We built a FastMCP server exposing 5 tools to IBM Bob. Non-technical operators can ask *"Which engines need maintenance?"* and receive zero-hallucination, evidence-grounded answers.

### Slide 7: Results / Impact
- **Headline:** From Reactive to Predictive
- **Bullet 1:** Prevents costly, dangerous Aircraft-on-Ground (AOG) events.
- **Bullet 2:** Saves billions by servicing assets based on actual condition.
- **Bullet 3:** Keeps critical military assets in the air and mission-ready.
