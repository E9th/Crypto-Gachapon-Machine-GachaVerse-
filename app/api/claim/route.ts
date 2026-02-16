import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit } from "@/lib/security"
import crypto from "crypto"

/**
 * POST /api/claim - Claim a gacha item as an NFT (simulated minting)
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

  const rl = rateLimit(`claim:${walletAddress}`, 10, 60_000)
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

  // Check if already claimed
  const { data: existingClaim } = await supabase
    .from("nft_claims")
    .select("id, status, token_id")
    .eq("spin_history_id", spinHistoryId)
    .in("status", ["pending", "minted"])
    .single()

  if (existingClaim) {
    return NextResponse.json({
      error: "Item has already been claimed as NFT",
      claim: existingClaim,
    }, { status: 400 })
  }

  // Check if item is listed on marketplace
  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("spin_history_id", spinHistoryId)
    .eq("status", "active")
    .single()

  if (listing) {
    return NextResponse.json({ error: "Item is listed on marketplace. Remove listing first." }, { status: 400 })
  }

  // Simulate NFT minting
  const tokenId = Math.floor(Math.random() * 1_000_000) + 1
  const fakeTxHash = "0x" + crypto.randomBytes(32).toString("hex")
  const contractAddress = "0xGACHAVERSE" + crypto.randomBytes(15).toString("hex")

  // Create NFT claim record with "pending" status
  const { data: claim, error: claimError } = await supabase
    .from("nft_claims")
    .insert({
      spin_history_id: spinHistoryId,
      wallet_address: walletAddress,
      item_id: historyItem.item_won_id,
      token_id: tokenId.toString(),
      tx_hash: fakeTxHash,
      contract_address: contractAddress,
      status: "pending",
    })
    .select()
    .single()

  if (claimError) {
    return NextResponse.json({ error: "Failed to create NFT claim" }, { status: 500 })
  }

  // Simulate minting delay (in production, this would be an async blockchain tx)
  // For demo, we immediately mark as minted
  await supabase
    .from("nft_claims")
    .update({ status: "minted" })
    .eq("id", claim.id)

  return NextResponse.json({
    success: true,
    nft: {
      token_id: tokenId,
      tx_hash: fakeTxHash,
      contract_address: contractAddress,
      item_name: historyItem.items.name,
      rarity: historyItem.items.rarity,
      status: "minted",
    },
  })
}

/**
 * GET /api/claim - Get all NFT claims for a wallet
 * Query: ?wallet_address=0x...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get("wallet_address")?.toLowerCase()

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: claims, error } = await supabase
    .from("nft_claims")
    .select("*, items(*)")
    .eq("wallet_address", walletAddress)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 })
  }

  return NextResponse.json({ claims: claims || [] })
}
