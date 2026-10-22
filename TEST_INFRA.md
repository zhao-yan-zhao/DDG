# Test Infrastructure & Opaque-Box E2E Testing Framework
# 《孤城神机营》 (The Lonely City Divine Engine Camp)

## 1. Overview & Testing Philosophy

The test infrastructure for 《孤城神机营》 is designed strictly around the **Decoupled Headless Domain Architecture** established in `PROJECT.md` and user requirements in `ORIGINAL_REQUEST.md` (derived from GDD V3.0).

- **Opaque-Box Testing**: All tests interact solely through public interfaces and contracts defined in `PROJECT.md` § Interface Contracts. Internal private fields and implementation nuances are strictly unreferenced.
- **Pure Headless Domain Execution**: Tests execute in Node.js via Vitest with zero DOM and zero Phaser renderer dependencies, achieving deterministic, microsecond-latency simulation.
- **Four-Tier Testing Pyramid**:
  - **Tier 1: Feature Coverage**: Functional contracts across all 6 core feature groups (Grid/Interaction, Arms/Reactions, 7-Step Pipeline/Commander, Wave Combat/FTUE, Shop PRNG/36 Tactics, Web/ByteDance Platform Build), with $\ge 5$ test cases per group ($\ge 30$ cases total).
  - **Tier 2: Boundary & Corner Cases**: Strict validation of numerical hard-caps, limits, zero/negative inputs, overflow clamping, CC decay curves, and pity timer edge cases.
  - **Tier 3: Cross-Feature Combinations**: Multi-system interactions (e.g. grid merge triggering faction synergies, wave victory driving interest and shop pity counters, roguelike tactics altering damage pipeline parameters).
  - **Tier 4: Real-World Application Scenarios**: Full end-to-end user journeys (Full 60s FTUE scripted choreography, Wave 1~5 progression, Chapter 1 Boss battle, and Red-Gold dual-faction fusion card unlocking).

---

## 2. Test Architecture & File Layout

```text
d:\Projects\DDG\
├── TEST_INFRA.md                   # This document: architecture, commands, criteria
├── test/
│   ├── e2e/                        # Four-Tier E2E Testing Pyramid
│   │   ├── harness/                # Headless domain contracts & simulation oracles
│   │   ├── tier1-features.test.ts  # Tier 1: Feature coverage
│   │   ├── tier2-boundaries.test.ts# Tier 2: Boundaries, limits, hard-caps
│   │   ├── tier3-combinations.test.ts # Tier 3: Cross-system integration
│   │   └── tier4-scenarios.test.ts # Tier 4: Real-world gameplay workflows
│   ├── *.test.ts                   # Unit & domain test suites (grid, combat, pipeline, etc.)
│   ├── endless-mode.test.ts        # GL-4 Endless mode, affix engine & military ranks
│   ├── forge-system.test.ts        # GL-5 Forge workshop & boss drops
│   ├── commander-*.test.ts         # Multi-commander system & presentation VFX
│   ├── campaign-*.test.ts          # 5 chapters 20 stages & boss AI state machines
│   ├── challenger-*.test.ts        # Adversarial challenger suites (memory, fuzzing, stress)
│   └── platform-*.test.ts          # Web & ByteDance monetization & social integration
```

---

## 3. Test Runner & Execution Commands

The test suite is powered by **Vitest 1.6.x** in ESM mode with native TypeScript support.

### Running All Tests
```bash
# Execute full test suite once
npm test
# Or directly via npx
npx vitest run
```

### Running Specific Tiers
```bash
# Tier 1: Feature Coverage
npx vitest run test/e2e/tier1-features.test.ts

# Tier 2: Boundary & Corner Cases
npx vitest run test/e2e/tier2-boundaries.test.ts

# Tier 3: Cross-Feature Combinations
npx vitest run test/e2e/tier3-combinations.test.ts

# Tier 4: Real-World Scenarios
npx vitest run test/e2e/tier4-scenarios.test.ts
```

### Test Watch & Debug Mode
```bash
# Interactive watch mode for continuous TDD
npx vitest

# Run with verbose reporting
npx vitest run --reporter=verbose
```

---

## 4. Four-Tier Verification Specifications

### Tier 1: Feature Coverage ($\ge 30$ Tests across 6 Areas)
1. **Grid & Interaction (F-R1-01 ~ 06)**:
   - 5×5 matrix bounds ($r \in [0,4], c \in [0,4]$) and 5-slot bench capacity.
   - Multi-grid footprints ($1\times 1, 1\times 2, 2\times 1, 2\times 2$) with top-left anchor conventions.
   - Touch Y-Offset $+80\text{px}$ visual shift and HitTest coordinate projection.
   - 2-in-1 merge state machine (same config, same star, $\ge 50\%$ overlap area).
   - Smart Swap Manhattan nearest-slide algorithm and bounce back on full grid.
   - Fortress Row 0 exclusivity rejection ($r > 0$ strictly rejected).
2. **Arms & Reactions (F-R2-01 ~ 06)**:
   - 16 weapon archetypes across 4 factions (Fire, Mohist, Fortress, Qimen) with ★1~★4 progressions.
   - Orthogonal cross adjacency geometric deduplication (idempotence).
   - Chebyshev $3\times 3$ Moore neighborhood deduplication.
   - Faction resonance thresholds (2-piece and 4-piece passive activation).
   - 4 elemental reactions (猛火轰爆, 雷火天劫, 碎冰崩裂, 幽冥毒火).
   - Elemental anti-crash protection valves (1.5s explosion CD, 4.0s poison fire lock).
3. **7-Step Damage Pipeline & Commander (F-R3-01 ~ 05)**:
   - Step 1: Base Attack ($Atk_{panel}$).
   - Step 2: Skill Multiplier ($Ratio_{skill}$).
   - Step 3: Additive Bonus with $+150\%$ hard cap.
   - Step 4: Independent Multipliers (max 3 whitelist gates, each $\le +25\%$).
   - Step 5: Crit Rate ($\le 75\%$) and Crit Damage ($\le 2.00$).
   - Step 6: Armor calculation ($DR_{armor} = Armor_{eff} / (Armor_{eff} + 150)$) and vulnerability.
   - Step 7: Minimum damage floor ($\ge 1.0$) and shield/special reductions.
   - Commander Wang Shouren passive (+20% fire attack) and 100 Rage ultimate (+150% reload speed).
4. **Wave Combat & FTUE (F-R4-01 ~ 07)**:
   - Wave FSM transitions: `Prep` $\to$ `WaveActive` $\to$ `WaveClear` $\to$ `DecreeReward` $\to$ `Income`.
   - Enemy archetypes (Ordinary, Charging, Heavy, Boss) with movement speeds & shields.
   - CC Diminishing returns ($Duration \times 0.70^k \ge 0.2\text{s}$) with 1.5s post-CC tenacity.
   - Guaranteed stipend (W1: 35 $\to$ W10+: 100) and interest ($\min(\lfloor Silver/10 \rfloor, 5)$).
   - 60s FTUE 4-step scripted progression.
5. **Shop PRNG & 36 Tactics (F5.1 ~ 5.8)**:
   - Wave ladder shop weights (W1~2, W3~5, W6~8, W9~15).
   - Pity timer counter `RollsWithoutMerge` ($\ge 3$ triggers $65\%$ pair compensation).
   - 36 Roguelike Tactics catalog across 5 categories with single-run pick limits.
   - Smart tag weighting ($1.85\times$ for dominant faction, $0.15\times$ for absent faction).
   - Red-Gold fusion card prerequisites (dual ★3 units on field) and $+40\%$ draw weighting.
6. **Web & ByteDance Platform Build (F6.1 ~ 6.6)**:
   - Viewport portrait standard ($750 \times 1334\text{px}$, $1.0\text{m} = 68\text{px}$).
   - Touch drag offset $+80\text{px}$ and single-touch lock (Pointer ID 0).
   - `IPlatform` bridge interface compatibility for Web and ByteDance Mini Game runtime.
   - Build script verification (`npm run build:web` & `npm run build:douyin`).

---

## 5. Hard Caps & Mathematical Invariants Matrix

| Invariant | Specification | Boundary Test Vector | Expected Output |
|---|---|---|---|
| **Additive Bonus Cap** | $\sum Additive \le 1.50$ | Bonus sum $= 2.20$ | Clamped to $1.50$ ($+150\%$) |
| **Independent Multipliers Gate Limit** | Max 3 gates | Provided $[0.20, 0.20, 0.20, 0.20]$ | 4th gate discarded, product uses 3 gates |
| **Independent Multiplier Gate Cap** | Single gate $\le 0.25$ | Single gate $= 0.40$ | Clamped to $0.25$ ($+25\%$) |
| **Crit Rate Hard Cap** | $CritRate \le 0.75$ | Total Crit Rate bonus $= 0.95$ | Clamped to $0.75$ ($75\%$) |
| **Crit Damage Multiplier Cap** | $CritDmg \le 2.00$ | Base $1.50$ + bonus $0.80 = 2.30$ | Clamped to $2.00$ ($200\%$) |
| **Damage Guarantee Floor** | $Dmg_{final} \ge 1.0$ | Incoming damage reduced to $0.02$ | Clamped to $1.0$ |
| **Boss CC Diminishing Returns** | $Duration \times 0.70^k \ge 0.2\text{s}$ | Base $2.0\text{s}$, Boss natural $50\% \to 1.0\text{s}$, 6th hit | Floor $0.20\text{s}$ enforced |
| **Boss CC Tenacity Window** | $1.5\text{s}$ post-CC | Second CC applied at $0.8\text{s}$ | CC rejected (immune during tenacity) |
| **Boss Ice Shatter Cap** | $\le 3\%$ Boss Max HP | 8% max HP calculated on Boss | Clamped to $0.03 \times HP_{max}$, 2.0s CD |
| **Shop Pity Trigger** | `RollsWithoutMerge` $\ge 3$ | Rolls without merge $= 2 \to 3$ | Roll 3 slot 3 forces $65\%$ owned unit |
| **Base Interest Cap** | $\min(\lfloor Silver/10 \rfloor, 5)$ | Silver $= 120$ | Capped at $5$ silver |
| **Fortress Row 0 Check** | Row $\equiv 0$ | Placement at $(row=1, col=2)$ | Rejected: `FORTRESS_ROW_INVALID` |

---

## 6. Failure Diagnosis & Escalation Protocol

1. **Test Failure Triage**:
   - Determine if the failure is caused by an **interface mismatch**, an **algorithmic defect**, or an **unimplemented feature**.
   - Review the failure stack against `PROJECT.md` § Interface Contracts.
2. **Implementation Defect Escalation**:
   - As an E2E Test Writer with QA role, **never modify implementation files in `src/`**.
   - Document the failing test name, expected output, observed output, and file/line in `handoff.md`.
   - Dispatch an escalation notice to the orchestrator or implementing agent.
