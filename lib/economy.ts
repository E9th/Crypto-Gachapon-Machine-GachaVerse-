/**
 * Economy configuration for GachaVerse
 * Central place to tune all economy values
 */

// ── Reactor (Mining) ──────────────────────────────────
export const REACTOR = {
  /** Energy consumed per click */
  ENERGY_PER_CLICK: 1,
  /** Coins earned per click */
  COINS_PER_CLICK: 1,
  /** Energy regeneration rate (per second) */
  REGEN_PER_SECOND: 0.5,
  /** Default max energy cap */
  DEFAULT_MAX_ENERGY: 100,
  /** Max energy per level: maxEnergy = DEFAULT_MAX_ENERGY + (level - 1) * ENERGY_PER_LEVEL */
  ENERGY_PER_LEVEL: 25,
  /** Max reactor level */
  MAX_LEVEL: 10,
  /** Batch interval: client sends harvest every N seconds */
  BATCH_INTERVAL_SEC: 10,
  /** Max clicks per batch (anti-cheat) — impossible to click more than ~15/sec */
  MAX_CLICKS_PER_BATCH: 150,
  /** Rate limit: max harvest requests per minute */
  RATE_LIMIT_PER_MIN: 12,
} as const

// ── Converter (Recycle) ───────────────────────────────
export const CONVERTER = {
  /** Reward for converting by rarity */
  REWARDS: {
    Common: { energy: 15, coins: 2 },
    Rare: { energy: 30, coins: 8 },
    SSR: { energy: 60, coins: 25 },
  } as Record<string, { energy: number; coins: number }>,
  /** Cooldown between conversions (ms) — "Overheating" mechanic */
  COOLDOWN_MS: 3_000,
  /** Max conversions per minute per wallet */
  RATE_LIMIT_PER_MIN: 20,
} as const

// ── Gacha Spin ────────────────────────────────────────
export const SPIN = {
  /** Cost per spin in GACHA coins */
  COST: 10,
} as const

// ── Sell Prices ───────────────────────────────────────
export const SELL_PRICES: Record<string, number> = {
  Common: 5,
  Rare: 20,
  SSR: 50,
}
