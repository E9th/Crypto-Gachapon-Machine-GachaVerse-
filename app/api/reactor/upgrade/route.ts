import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit } from "@/lib/security"
import { REACTOR, getUpgradeForLevel, getNextUpgrade } from "@/lib/economy"

/**
 * POST /api/reactor/upgrade
 * Body: { wallet_address }
 *
 * Upgrades the reactor to the next level by spending GACHA coins.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  const walletAddress = body.wallet_address?.toLowerCase()

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  // Rate limit
  const rl = rateLimit(`upgrade:${walletAddress}`, 5, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many upgrade requests" }, { status: 429 })
  }

  // Get current energy data
  const { data: energyData, error: energyError } = await supabase
    .from("user_energy")
    .select("*")
    .eq("wallet_address", walletAddress)
    .single()

  if (energyError || !energyData) {
    return NextResponse.json({ error: "Reactor not found. Try clicking first!" }, { status: 404 })
  }

  const currentLevel = energyData.level
  const nextUpgrade = getNextUpgrade(currentLevel)

  if (!nextUpgrade) {
    return NextResponse.json({ error: "Already at max level!" }, { status: 400 })
  }

  // Check balance
  const { data: walletData, error: walletError } = await supabase
    .from("wallet_balances")
    .select("balance")
    .eq("wallet_address", walletAddress)
    .single()

  if (walletError || !walletData) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
  }

  const currentBalance = Number(walletData.balance)
  if (currentBalance < nextUpgrade.cost) {
    return NextResponse.json({
      error: `Not enough GACHA. Need ${nextUpgrade.cost}, have ${currentBalance}.`,
    }, { status: 400 })
  }

  // Deduct balance
  const newBalance = currentBalance - nextUpgrade.cost
  const { error: balanceError } = await supabase
    .from("wallet_balances")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("wallet_address", walletAddress)

  if (balanceError) {
    return NextResponse.json({ error: "Failed to deduct balance" }, { status: 500 })
  }

  // Calculate current energy with regen before upgrade
  const now = new Date()
  const lastRegen = new Date(energyData.last_regen_at)
  const elapsedSec = (now.getTime() - lastRegen.getTime()) / 1000
  const currentUpgrade = getUpgradeForLevel(currentLevel)
  const regenRate = REACTOR.REGEN_PER_SECOND + currentUpgrade.regenBonus
  const regenAmount = elapsedSec * regenRate
  const currentEnergy = Math.min(Number(energyData.max_energy), Number(energyData.energy) + regenAmount)

  // Update reactor level and max energy
  const { error: updateError } = await supabase
    .from("user_energy")
    .update({
      level: nextUpgrade.level,
      max_energy: nextUpgrade.maxEnergy,
      energy: Math.min(currentEnergy, nextUpgrade.maxEnergy),
      clicks_per_coin: nextUpgrade.clicksPerCoin,
      last_regen_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("wallet_address", walletAddress)

  if (updateError) {
    // Refund on failure
    await supabase
      .from("wallet_balances")
      .update({ balance: currentBalance, updated_at: now.toISOString() })
      .eq("wallet_address", walletAddress)
    return NextResponse.json({ error: "Failed to upgrade reactor" }, { status: 500 })
  }

  // Record upgrade history
  await supabase.from("reactor_upgrades").insert({
    wallet_address: walletAddress,
    from_level: currentLevel,
    to_level: nextUpgrade.level,
    cost: nextUpgrade.cost,
  })

  return NextResponse.json({
    success: true,
    new_level: nextUpgrade.level,
    new_max_energy: nextUpgrade.maxEnergy,
    new_clicks_per_coin: nextUpgrade.clicksPerCoin,
    new_regen_rate: REACTOR.REGEN_PER_SECOND + nextUpgrade.regenBonus,
    energy: Math.min(currentEnergy, nextUpgrade.maxEnergy),
    new_balance: newBalance,
    cost: nextUpgrade.cost,
  })
}
