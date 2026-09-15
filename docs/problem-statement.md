# Problem Statement

## Background

Military aviation, commercial airlines, and MRO (Maintenance, Repair & Overhaul) operators manage fleets of high-value turbofan engines whose condition directly determines mission availability. These engines degrade continuously through normal use: turbine blade wear, fuel system deposit buildup, and compressor efficiency losses accumulate cycle by cycle. Catching this degradation at the right time — not too early (wasteful) and not too late (dangerous) — is one of the hardest operational challenges in aviation maintenance.

## The Problem

**Fleet operators cannot quickly answer the most important question in aircraft maintenance: "Is this specific engine safe to fly today's specific mission?"**

Current approaches fall into two categories, both inadequate:

1. **Time-based scheduled maintenance:** Engines are serviced every N flight cycles regardless of actual condition. This overservices healthy engines and underservices engines that degrade faster than average. It cannot respond to an unusual degradation event between scheduled windows.

2. **Reactive maintenance:** Engineers wait until a fault code appears or performance drops visibly. By this point, the engine is already in a degraded state that may require expensive emergency overhaul — or worse, create an unplanned Aircraft-on-Ground (AOG) event.

AOG events cost commercial operators between $10,000 and $150,000 per day in direct costs, plus the cascading effect of flight cancellations and passenger disruption. In defence contexts, a grounded aircraft can mean a failed mission with serious operational consequences.

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
