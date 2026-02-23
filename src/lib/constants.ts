// ─── Carbon Credit Conversion ────────────────────────────────────────────────
//
// Converting forest biomass (Mg, i.e. metric tonnes) to carbon credits (tCO₂e)
// is a two-step process defined by the IPCC and adopted by all major standards
// (Verra VCS, Gold Standard, ACR).
//
//   Step 1 — Biomass → Carbon
//     Carbon = Biomass × CF
//     CF = carbon fraction of dry biomass (dimensionless)
//
//   Step 2 — Carbon → CO₂ equivalent
//     CO₂e = Carbon × (44 / 12)
//     44/12 = molar-mass ratio of CO₂ to C ≈ 3.6667
//
//   Combined:
//     tCO₂e = Biomass (Mg) × CF × (44 / 12)
//
// References:
//   [1] IPCC 2006 Guidelines, Vol 4, Ch 4, Table 4.3 — default CF = 0.47
//   [2] IPCC 2006 Guidelines, Vol 4, Annex 2 — C-to-CO₂ via × (44/12)
//   [3] ACR ACoF Methodology v1.0 — formula: Biomass × 0.5 × 3.664
//   [4] Martin et al. (2024), Carbon Balance & Management — global avg CF ≈ 0.476
//   [5] Verra VMD0001 v1.2 — biomass carbon stock estimation in VCS projects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default carbon fraction of dry above-ground forest biomass.
 * IPCC 2006 Vol 4, Ch 4, Table 4.3 recommends 0.47 for tropical/subtropical
 * forests. A 0.50 "rule of thumb" is also common (ACR, ref [3]).
 */
export const CARBON_FRACTION = 0.47;

/**
 * Molar-mass ratio of CO₂ (44 g/mol) to C (12 g/mol).
 * Universally agreed constant used to convert tonnes of carbon to
 * tonnes of CO₂ equivalent.
 */
export const CO2_C_RATIO = 44 / 12; // ≈ 3.6667

/**
 * Combined factor: CARBON_FRACTION × CO2_C_RATIO
 * Multiply biomass (Mg) by this to get tCO₂e directly.
 *
 * With CF = 0.47:  0.47 × (44/12) ≈ 1.7233
 *
 * Example: 100 Mg biomass × 1.7233 = 172.33 tCO₂e
 */
export const BIOMASS_TO_CO2_FACTOR = CARBON_FRACTION * CO2_C_RATIO;

/**
 * Convert forest biomass (Mg) to carbon credits (tCO₂e).
 *
 * Formula:  tCO₂e = biomass_Mg × CF × (44/12)
 *
 * @param biomassMg  Total forest biomass in megagrams (metric tonnes)
 * @returns          Carbon credits in tonnes CO₂ equivalent
 */
export function biomassToCredits(biomassMg: number): number {
  return biomassMg * BIOMASS_TO_CO2_FACTOR;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

/** Default price per carbon credit in USD */
export const DEFAULT_PRICE_PER_CREDIT = 3;

// ─── Pagination ──────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 5;
export const MARKETPLACE_PAGE_SIZE = 12;
