import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit } from "@/lib/security"

/**
 * GET /api/trade - List active trade offers
 * Query: ?wallet_address=0x...
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get("wallet_address")?.toLowerCase()

  // Get all active offers (optionally filtered by wallet)
  let query = supabase
    .from("trade_offers")
    .select("*, offered_spin:spin_history!trade_offers_offered_spin_history_id_fkey(*, items(*)), requested_spin:spin_history!trade_offers_requested_spin_history_id_fkey(*, items(*))")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50)

  if (walletAddress && isValidEthAddress(walletAddress)) {
    query = query.or(`from_wallet.eq.${walletAddress},to_wallet.eq.${walletAddress}`)
  }

  const { data: offers, error } = await query

  if (error) {
    return NextResponse.json({ error: "Failed to fetch trade offers" }, { status: 500 })
  }

  return NextResponse.json({ offers: offers || [] })
}

/**
 * POST /api/trade - Create or accept a trade offer
 * Body for CREATE: { action: "create", wallet_address, offered_spin_history_id, requested_spin_history_id, to_wallet }
 * Body for ACCEPT: { action: "accept", wallet_address, trade_offer_id }
 * Body for CANCEL: { action: "cancel", wallet_address, trade_offer_id }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  const action = body.action
  const walletAddress = body.wallet_address?.toLowerCase()

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const rl = rateLimit(`trade:${walletAddress}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  if (action === "create") {
    return createTradeOffer(supabase, body, walletAddress)
  } else if (action === "accept") {
    return acceptTradeOffer(supabase, body, walletAddress)
  } else if (action === "cancel") {
    return cancelTradeOffer(supabase, body, walletAddress)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

async function createTradeOffer(supabase: any, body: any, walletAddress: string) {
  const offeredId = body.offered_spin_history_id
  const requestedId = body.requested_spin_history_id
  const toWallet = body.to_wallet?.toLowerCase()

  if (!offeredId || !requestedId) {
    return NextResponse.json({ error: "Missing offered or requested item" }, { status: 400 })
  }

  if (toWallet && !isValidEthAddress(toWallet)) {
    return NextResponse.json({ error: "Invalid target wallet address" }, { status: 400 })
  }

  if (toWallet === walletAddress) {
    return NextResponse.json({ error: "Cannot trade with yourself" }, { status: 400 })
  }

  // Verify caller owns the offered item
  const { data: offeredItem, error: offeredError } = await supabase
    .from("spin_history")
    .select("id, owned_by")
    .eq("id", offeredId)
    .eq("owned_by", walletAddress)
    .single()

  if (offeredError || !offeredItem) {
    return NextResponse.json({ error: "You don't own the offered item" }, { status: 403 })
  }

  // Verify the requested item exists and is owned by the target (if specified)
  const reqQuery = supabase
    .from("spin_history")
    .select("id, owned_by")
    .eq("id", requestedId)

  if (toWallet) {
    reqQuery.eq("owned_by", toWallet)
  }

  const { data: requestedItem, error: reqError } = await reqQuery.single()

  if (reqError || !requestedItem) {
    return NextResponse.json({ error: "Requested item not found or not owned by target" }, { status: 404 })
  }

  const actualToWallet = toWallet || requestedItem.owned_by

  // Check no existing pending offers for this item
  const { data: existingOffer } = await supabase
    .from("trade_offers")
    .select("id")
    .eq("offered_spin_history_id", offeredId)
    .eq("status", "pending")
    .single()

  if (existingOffer) {
    return NextResponse.json({ error: "This item already has a pending trade offer" }, { status: 400 })
  }

  // Create the trade offer
  const { data: offer, error: insertError } = await supabase
    .from("trade_offers")
    .insert({
      from_wallet: walletAddress,
      to_wallet: actualToWallet,
      offered_spin_history_id: offeredId,
      requested_spin_history_id: requestedId,
      status: "pending",
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: "Failed to create trade offer" }, { status: 500 })
  }

  return NextResponse.json({ success: true, trade_offer: offer })
}

async function acceptTradeOffer(supabase: any, body: any, walletAddress: string) {
  const tradeOfferId = body.trade_offer_id

  if (!tradeOfferId) {
    return NextResponse.json({ error: "Missing trade_offer_id" }, { status: 400 })
  }

  // Get trade offer
  const { data: offer, error: offerError } = await supabase
    .from("trade_offers")
    .select("*")
    .eq("id", tradeOfferId)
    .eq("to_wallet", walletAddress)
    .eq("status", "pending")
    .single()

  if (offerError || !offer) {
    return NextResponse.json({ error: "Trade offer not found or not addressed to you" }, { status: 404 })
  }

  // Re-verify ownership of both items
  const { data: offeredItem } = await supabase
    .from("spin_history")
    .select("id, owned_by")
    .eq("id", offer.offered_spin_history_id)
    .eq("owned_by", offer.from_wallet)
    .single()

  const { data: requestedItem } = await supabase
    .from("spin_history")
    .select("id, owned_by")
    .eq("id", offer.requested_spin_history_id)
    .eq("owned_by", walletAddress)
    .single()

  if (!offeredItem || !requestedItem) {
    // One of the items is no longer owned – cancel the offer
    await supabase
      .from("trade_offers")
      .update({ status: "cancelled" })
      .eq("id", tradeOfferId)
    return NextResponse.json({ error: "One of the items is no longer available" }, { status: 400 })
  }

  // Swap ownership
  const { error: swap1Error } = await supabase
    .from("spin_history")
    .update({ owned_by: walletAddress })
    .eq("id", offer.offered_spin_history_id)

  if (swap1Error) {
    return NextResponse.json({ error: "Trade failed during swap" }, { status: 500 })
  }

  const { error: swap2Error } = await supabase
    .from("spin_history")
    .update({ owned_by: offer.from_wallet })
    .eq("id", offer.requested_spin_history_id)

  if (swap2Error) {
    // Rollback the first swap
    await supabase
      .from("spin_history")
      .update({ owned_by: offer.from_wallet })
      .eq("id", offer.offered_spin_history_id)
    return NextResponse.json({ error: "Trade failed during swap" }, { status: 500 })
  }

  // Mark offer as completed
  await supabase
    .from("trade_offers")
    .update({ status: "completed" })
    .eq("id", tradeOfferId)

  return NextResponse.json({ success: true, message: "Trade completed!" })
}

async function cancelTradeOffer(supabase: any, body: any, walletAddress: string) {
  const tradeOfferId = body.trade_offer_id

  if (!tradeOfferId) {
    return NextResponse.json({ error: "Missing trade_offer_id" }, { status: 400 })
  }

  const { data: offer, error } = await supabase
    .from("trade_offers")
    .select("*")
    .eq("id", tradeOfferId)
    .eq("from_wallet", walletAddress)
    .eq("status", "pending")
    .single()

  if (error || !offer) {
    return NextResponse.json({ error: "Trade offer not found or not yours" }, { status: 404 })
  }

  await supabase
    .from("trade_offers")
    .update({ status: "cancelled" })
    .eq("id", tradeOfferId)

  return NextResponse.json({ success: true, message: "Trade offer cancelled" })
}
