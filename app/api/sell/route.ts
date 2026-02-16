import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit, getSellPrice } from "@/lib/security"

/**
 * POST /api/sell - Sell an item back to the shop for GACHA tokens
 * Body: { wallet_address, spin_history_id }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  const walletAddress = body.wallet_address?.toLowerCase()
  const spinHistoryId = body.spin_history_id

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  if (!spinHistoryId) {
    return NextResponse.json({ error: "Missing spin_history_id" }, { status: 400 })
  }

  // Rate limit
  const rl = rateLimit(`sell:${walletAddress}`, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
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

  // Check if already listed or claimed as NFT
  const { data: existingListing } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("spin_history_id", spinHistoryId)
    .eq("status", "active")
    .single()

  if (existingListing) {
    return NextResponse.json({ error: "Item is already listed on marketplace" }, { status: 400 })
  }

  const { data: existingClaim } = await supabase
    .from("nft_claims")
    .select("id")
    .eq("spin_history_id", spinHistoryId)
    .in("status", ["pending", "minted"])
    .single()

  if (existingClaim) {
    return NextResponse.json({ error: "Item has been claimed as NFT and cannot be sold" }, { status: 400 })
  }

  // Calculate sell price based on rarity
  const sellPrice = getSellPrice(historyItem.items.rarity)

  // Get current balance
  const { data: walletData } = await supabase
    .from("wallet_balances")
    .select("balance")
    .eq("wallet_address", walletAddress)
    .single()

  const currentBalance = Number(walletData?.balance || 0)

  // Add balance
  const { error: balanceError } = await supabase
    .from("wallet_balances")
    .update({
      balance: currentBalance + sellPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("wallet_address", walletAddress)

  if (balanceError) {
    return NextResponse.json({ error: "Failed to credit balance" }, { status: 500 })
  }

  // Remove ownership (mark as sold to shop)
  await supabase
    .from("spin_history")
    .update({ owned_by: "shop" })
    .eq("id", spinHistoryId)

  // Record in marketplace_listings
  await supabase.from("marketplace_listings").insert({
    seller_wallet: walletAddress,
    spin_history_id: spinHistoryId,
    item_id: historyItem.item_won_id,
    price: sellPrice,
    status: "sold",
    buyer_wallet: "shop",
    sold_at: new Date().toISOString(),
  })

  return NextResponse.json({
    success: true,
    sold_item: historyItem.items.name,
    sell_price: sellPrice,
    new_balance: currentBalance + sellPrice,
  })
}
