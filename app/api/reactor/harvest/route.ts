import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit } from "@/lib/security"
import { REACTOR } from "@/lib/economy"

/**
 * POST /api/reactor/harvest
 * Body: { wallet_address, clicks }
 * 
 * Batched harvest: client accumulates clicks and sends them periodically.
 * Server validates click count, deducts energy, credits coins.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  const walletAddress = body.wallet_address?.toLowerCase()
  const clicks = Math.floor(Number(body.clicks) || 0)

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  if (clicks <= 0) {
    return NextResponse.json({ error: "No clicks to harvest" }, { status: 400 })
  }

  // Anti-cheat: cap clicks per batch
  if (clicks > REACTOR.MAX_CLICKS_PER_BATCH) {
    return NextResponse.json(
      { error: "Too many clicks in one batch. Suspicious activity detected." },
      { status: 400 }
    )
  }

  // Rate limit
  const rl = rateLimit(`reactor:${walletAddress}`, REACTOR.RATE_LIMIT_PER_MIN, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Reactor overloaded. Please wait." }, { status: 429 })
  }

  // Get current energy (with regen)
  const { data: energyData, error: energyError } = await supabase
    .from("user_energy")
    .select("*")
    .eq("wallet_address", walletAddress)
    .single()

  if (energyError || !energyData) {
    // Auto-create if not exists
    const { error: insertError } = await supabase
      .from("user_energy")
      .insert({
        wallet_address: walletAddress,
        energy: REACTOR.DEFAULT_MAX_ENERGY,
        max_energy: REACTOR.DEFAULT_MAX_ENERGY,
        level: 1,
        total_harvested: 0,
        last_regen_at: new Date().toISOString(),
      })

    if (insertError) {
      return NextResponse.json({ error: "Failed to initialize reactor" }, { status: 500 })
    }

    // Retry fetch
    const { data: retryData } = await supabase
      .from("user_energy")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()

    if (!retryData) {
      return NextResponse.json({ error: "Reactor initialization failed" }, { status: 500 })
    }

    return processHarvest(supabase, retryData, walletAddress, clicks)
  }

  return processHarvest(supabase, energyData, walletAddress, clicks)
}

async function processHarvest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  energyData: {
    energy: number
    max_energy: number
    level: number
    total_harvested: number
    last_regen_at: string
    cooldown_until: string | null
  },
  walletAddress: string,
  clicks: number
) {
  const now = new Date()

  // Check cooldown
  if (energyData.cooldown_until) {
    const cooldownEnd = new Date(energyData.cooldown_until)
    if (now < cooldownEnd) {
      return NextResponse.json({
        error: "Reactor is cooling down",
        cooldown_until: energyData.cooldown_until,
      }, { status: 400 })
    }
  }

  // Calculate current energy with regen
  const lastRegen = new Date(energyData.last_regen_at)
  const elapsedSec = (now.getTime() - lastRegen.getTime()) / 1000
  const regenAmount = elapsedSec * REACTOR.REGEN_PER_SECOND
  const maxEnergy = Number(energyData.max_energy)
  const currentEnergy = Math.min(maxEnergy, Number(energyData.energy) + regenAmount)

  // How many clicks can actually be consumed?
  const energyNeeded = clicks * REACTOR.ENERGY_PER_CLICK
  const actualClicks = Math.min(clicks, Math.floor(currentEnergy / REACTOR.ENERGY_PER_CLICK))

  if (actualClicks <= 0) {
    return NextResponse.json({
      error: "Not enough energy",
      energy: Math.floor(currentEnergy * 100) / 100,
      max_energy: maxEnergy,
    }, { status: 400 })
  }

  const energyConsumed = actualClicks * REACTOR.ENERGY_PER_CLICK
  const coinsEarned = actualClicks * REACTOR.COINS_PER_CLICK
  const newEnergy = currentEnergy - energyConsumed
  const newTotalHarvested = Number(energyData.total_harvested) + coinsEarned

  // Update energy
  const { error: updateError } = await supabase
    .from("user_energy")
    .update({
      energy: newEnergy,
      total_harvested: newTotalHarvested,
      last_regen_at: now.toISOString(),
      last_harvest_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("wallet_address", walletAddress)

  if (updateError) {
    return NextResponse.json({ error: "Failed to update energy" }, { status: 500 })
  }

  // Credit coins to wallet balance
  const { data: walletData } = await supabase
    .from("wallet_balances")
    .select("balance")
    .eq("wallet_address", walletAddress)
    .single()

  if (walletData) {
    const newBalance = Number(walletData.balance) + coinsEarned
    await supabase
      .from("wallet_balances")
      .update({
        balance: newBalance,
        updated_at: now.toISOString(),
      })
      .eq("wallet_address", walletAddress)

    return NextResponse.json({
      success: true,
      clicks_processed: actualClicks,
      coins_earned: coinsEarned,
      new_balance: newBalance,
      energy: Math.floor(newEnergy * 100) / 100,
      max_energy: maxEnergy,
      total_harvested: newTotalHarvested,
    })
  } else {
    // Auto-create wallet balance
    const { error: insertBalanceError } = await supabase
      .from("wallet_balances")
      .insert({
        wallet_address: walletAddress,
        balance: coinsEarned,
      })

    return NextResponse.json({
      success: true,
      clicks_processed: actualClicks,
      coins_earned: coinsEarned,
      new_balance: coinsEarned,
      energy: Math.floor(newEnergy * 100) / 100,
      max_energy: maxEnergy,
      total_harvested: newTotalHarvested,
    })
  }
}
