/**
 * Economy configuration for GachaVerse
 * Central place to tune all economy values
 */

// ── Reactor (Clicker) ─────────────────────────────────
export const REACTOR = {
  /** Energy consumed per click */
  ENERGY_PER_CLICK: 1,
  /** Raw clicks per click (NOT coins — need CLICKS_PER_COIN clicks to earn 1 coin) */
  CLICKS_PER_COIN: 50,
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

// ── Reactor Upgrades ──────────────────────────────────
export interface ReactorUpgrade {
  level: number
  /** GACHA coin cost to upgrade to this level */
  cost: number
  /** New max energy cap at this level */
  maxEnergy: number
  /** Bonus: extra regen rate added at this level */
  regenBonus: number
  /** Bonus: reduce clicks-per-coin ratio (more efficient) */
  clicksPerCoin: number
}

/**
 * Upgrade table for the Ether Reactor.
 * Level 1 is the starting state (no cost).
 * Each upgrade costs GACHA coins and improves efficiency.
 *
 * Balance rationale:
 * - Level 1→2: 50 GACHA (5 spins worth). Small boost to hook players.
 * - Costs escalate with diminishing returns on efficiency.
 * - At max level: 45 clicks/coin vs 50 at level 1 (only 10% better)
 *   so upgrades feel rewarding but don't break the economy.
 * - Energy cap increases give more play time before cooldown.
 * - Regen bonus is small to avoid AFK farming.
 */
export const REACTOR_UPGRADES: ReactorUpgrade[] = [
  { level: 1, cost: 0,   maxEnergy: 100, regenBonus: 0,    clicksPerCoin: 50 },
  { level: 2, cost: 50,  maxEnergy: 125, regenBonus: 0.05, clicksPerCoin: 49 },
  { level: 3, cost: 120, maxEnergy: 150, regenBonus: 0.10, clicksPerCoin: 48 },
  { level: 4, cost: 250, maxEnergy: 180, regenBonus: 0.15, clicksPerCoin: 47 },
  { level: 5, cost: 400, maxEnergy: 210, regenBonus: 0.20, clicksPerCoin: 46 },
  { level: 6, cost: 600, maxEnergy: 250, regenBonus: 0.25, clicksPerCoin: 46 },
  { level: 7, cost: 850, maxEnergy: 300, regenBonus: 0.30, clicksPerCoin: 45 },
  { level: 8, cost: 1200,maxEnergy: 360, regenBonus: 0.35, clicksPerCoin: 45 },
  { level: 9, cost: 1600,maxEnergy: 430, regenBonus: 0.40, clicksPerCoin: 45 },
  { level: 10,cost: 2200,maxEnergy: 500, regenBonus: 0.50, clicksPerCoin: 45 },
]

/** Helper: get upgrade config for a given level */
export function getUpgradeForLevel(level: number): ReactorUpgrade {
  return REACTOR_UPGRADES[Math.min(level, REACTOR.MAX_LEVEL) - 1]
}

/** Helper: get next upgrade (or null if max) */
export function getNextUpgrade(level: number): ReactorUpgrade | null {
  if (level >= REACTOR.MAX_LEVEL) return null
  return REACTOR_UPGRADES[level] // level is 1-based, array is 0-based, so UPGRADES[level] = next
}

// ── Converter (Recycle) ───────────────────────────────
export const CONVERTER = {
  /** Reward for converting by rarity */
  REWARDS: {
    Common: { energy: 15, coins: 2 },
    Rare: { energy: 30, coins: 8 },
    SSR: { energy: 60, coins: 25 },
    UR: { energy: 120, coins: 60 },
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
  UR: 150,
}

// ── GVCoin Token ──────────────────────────────────────
export const GVCOIN = {
  /** Token name */
  NAME: "GVCoin",
  /** Token symbol */
  SYMBOL: "GVC",
  /** Decimals (like most ERC-20) */
  DECIMALS: 18,
  /** Sepolia testnet chain ID */
  CHAIN_ID: 11155111,
  /** Sepolia RPC URL */
  RPC_URL: "https://rpc.sepolia.org",
  /** Exchange rate: GACHA coins per 1 GVCoin */
  GACHA_PER_GVCOIN: 100,
  /** Minimum GACHA to exchange */
  MIN_EXCHANGE: 100,
  /** Deployed contract address (placeholder — deploy to get real address) */
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_GVCOIN_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const
