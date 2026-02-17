import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit } from "@/lib/security"
import { CONVERTER } from "@/lib/economy"

/**
 * POST /api/inventory/convert
 * Body: { wallet_address, spin_history_id, reward_type?: "energy" | "coins" }
 *
 * "Matter Converter" — destroy an item and receive energy or coins back.
 * Default reward_type is "energy" for Common/Rare, "coins" for SSR.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  const walletAddress = body.wallet_address?.toLowerCase()
  const spinHistoryId = body.spin_history_id
  const rewardType: "energy" | "coins" = body.reward_type === "coins" ? "coins" : "energy"

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  if (!spinHistoryId) {
    return NextResponse.json({ error: "Missing spin_history_id" }, { status: 400 })
  }

  // Rate limit
  const rl = rateLimit(`convert:${walletAddress}`, CONVERTER.RATE_LIMIT_PER_MIN, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({
      error: "Converter overheating! Please wait before converting more items.",
    }, { status: 429 })
  }

  // Check converter cooldown on user_energy
  const { data: energyData } = await supabase
    .from("user_energy")
    .select("cooldown_until, energy, max_energy")
    .eq("wallet_address", walletAddress)
    .single()

  const now = new Date()
  if (energyData?.cooldown_until) {
    const cooldownEnd = new Date(energyData.cooldown_until)
    if (now < cooldownEnd) {
      const remainMs = cooldownEnd.getTime() - now.getTime()
      return NextResponse.json({
        error: "Converter is cooling down",
        cooldown_remaining_ms: remainMs,
      }, { status: 400 })
    }
  }

  // Verify ownership
  const { data: historyItem, error: historyError } = await supabase
    .from("spin_history")
    .select("*, items(*)")
    .eq("id", spinHistoryId)
    .eq("owned_by", walletAddress)
    .single()

  if (historyError || !historyItem) {
    return NextResponse.json({ error: "Item not found or not owned by you" }, { status: 404 })
  }

  // Check not listed/claimed
  const { data: existingListing } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("spin_history_id", spinHistoryId)
    .eq("status", "active")
    .single()

  if (existingListing) {
    return NextResponse.json({ error: "Item is listed on marketplace" }, { status: 400 })
  }

  const { data: existingClaim } = await supabase
    .from("nft_claims")
    .select("id")
    .eq("spin_history_id", spinHistoryId)
    .in("status", ["pending", "minted"])
    .single()

  if (existingClaim) {
    return NextResponse.json({ error: "Item has been claimed as NFT" }, { status: 400 })
  }

  const rarity = historyItem.items.rarity as string
  const rewards = CONVERTER.REWARDS[rarity] || CONVERTER.REWARDS.Common
  const rewardAmount = rewardType === "energy" ? rewards.energy : rewards.coins

  // Mark item as converted (remove ownership)
  const { error: removeError } = await supabase
    .from("spin_history")
    .update({ owned_by: "converted" })
    .eq("id", spinHistoryId)

  if (removeError) {
    return NextResponse.json({ error: "Failed to convert item" }, { status: 500 })
  }

  // Apply reward
  let newBalance: number | undefined
  let newEnergy: number | undefined

  if (rewardType === "energy") {
    // Add energy
    const currentEnergy = Number(energyData?.energy || 0)
    const maxEn = Number(energyData?.max_energy || 100)
    newEnergy = Math.min(maxEn, currentEnergy + rewardAmount)

    if (energyData) {
      await supabase
        .from("user_energy")
        .update({
          energy: newEnergy,
          cooldown_until: new Date(now.getTime() + CONVERTER.COOLDOWN_MS).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("wallet_address", walletAddress)
    } else {
      // Create energy record
      await supabase
        .from("user_energy")
        .insert({
          wallet_address: walletAddress,
          energy: rewardAmount,
          max_energy: 100,
          level: 1,
          total_harvested: 0,
          last_regen_at: now.toISOString(),
          cooldown_until: new Date(now.getTime() + CONVERTER.COOLDOWN_MS).toISOString(),
        })
      newEnergy = rewardAmount
    }
  } else {
    // Add coins
    const { data: walletData } = await supabase
      .from("wallet_balances")
      .select("balance")
      .eq("wallet_address", walletAddress)
      .single()

    const currentBalance = Number(walletData?.balance || 0)
    newBalance = currentBalance + rewardAmount

    await supabase
      .from("wallet_balances")
      .update({
        balance: newBalance,
        updated_at: now.toISOString(),
      })
      .eq("wallet_address", walletAddress)

    // Also set converter cooldown
    if (energyData) {
      await supabase
        .from("user_energy")
        .update({
          cooldown_until: new Date(now.getTime() + CONVERTER.COOLDOWN_MS).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("wallet_address", walletAddress)
    }
  }

  // Record conversion history
  await supabase.from("convert_history").insert({
    wallet_address: walletAddress,
    spin_history_id: spinHistoryId,
    item_id: historyItem.item_won_id,
    item_rarity: rarity,
    reward_type: rewardType,
    reward_amount: rewardAmount,
  })

  return NextResponse.json({
    success: true,
    converted_item: historyItem.items.name,
    item_rarity: rarity,
    reward_type: rewardType,
    reward_amount: rewardAmount,
    new_balance: newBalance,
    new_energy: newEnergy,
  })
}
