# Problem Statement

## Background

Military organisations cannot reliably determine whether aircraft, vehicles, and equipment are mission-ready. Maintenance currently runs on fixed calendar schedules regardless of actual component condition. Meanwhile, HUMS (Health & Usage Monitoring System) sensor data that could predict failures weeks in advance sits largely unanalysed. 

When platforms fail unexpectedly, operational readiness drops and recovery takes weeks. The US military alone spends $90B/year on maintenance — shifting to predictive approaches can save billions while dramatically improving mission capability.

## The Problem

**Military and defence operators lack a fast, data-driven way to answer: "Is this specific asset safe to fly today's mission?"**

Current approaches fall into two categories, both inadequate:

1. **Time-based scheduled maintenance:** Assets are serviced every N calendar days or flight cycles regardless of actual condition. This overservices healthy assets and underservices those that degrade faster than average.
2. **Reactive maintenance:** Engineers wait until a fault code appears or performance drops visibly. By this point, the platform is already in a degraded state, leading to unexpected mission aborts or Aircraft-on-Ground (AOG) events.

The US military spends $90B/year on maintenance. AOG events and unscheduled downtime not only waste resources but create severe risks to operational readiness.

The specific pain points:

- **No RUL visibility:** Maintenance engineers have no fast way to see the estimated remaining useful life of each engine in the fleet.
- **No mission-specific evaluation:** A 30-cycle training sortie and a 120-cycle long-range mission have completely different engine requirements. Existing tools do not compute per-mission readiness.
- **No sensor-level evidence:** When an engineer suspects a problem, they must manually review raw sensor logs across dozens of channels. There is no automated summary of *which* sensors are behaving abnormally and *why*.
- **No natural language interface:** Fleet status information lives in siloed databases and spreadsheets. A maintenance chief cannot simply ask "Which of my engines needs attention before tomorrow's exercise?" and get an immediate, data-backed answer.

## Who is Affected

- **Fleet maintenance engineers** at MRO organisations and airline maintenance bases who are responsible for engine health monitoring and dispatch decisions.
- **Flight operations officers** and maintenance chiefs who must certify aircraft airworthiness before dispatch.
- **Defence operations planners** who assign aircraft to missions and need to know 24–48 hours in advance whether scheduled assets will be available.

## Why It Matters

According to IATA data, unscheduled maintenance accounts for approximately 30% of total maintenance costs in commercial aviation. In military contexts, aircraft availability rates are a direct measure of operational readiness — a fleet with 70% availability rate means 30% of sortie-capable aircraft are on the ground when they may be needed.

Beyond cost, there is a genuine safety dimension. The NASA C-MAPSS dataset — on which AeroReady's models are trained — was created specifically to address turbofan degradation prediction as a safety-critical problem. Engines that reach low RUL values without being identified create real risk.

## Why Existing Solutions Fall Short

- **ACARS / EHM systems:** Aircraft health monitoring systems exist for large commercial operators but are expensive, proprietary, and require deep avionics integration. They are not accessible to smaller operators, defence MRO units, or research contexts.
- **Manual sensor review:** Engineers can review sensor data but this requires expert knowledge, takes hours per aircraft, and is impractical at fleet scale.
- **Generic anomaly detection tools:** General-purpose ML platforms detect anomalies but do not understand the aviation maintenance context — they cannot translate "sensor_11 is degrading" into "this engine has 42 cycles of margin before the next 30-cycle mission."
- **No go/no-go framework:** Even when predictions exist, there is no standard framework for converting a raw RUL number into a mission-specific dispatch decision with an explicit safety margin.

AeroReady addresses all of these gaps in a single, integrated platform.
