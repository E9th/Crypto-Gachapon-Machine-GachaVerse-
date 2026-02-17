import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { rollGacha } from "@/lib/gacha/engine"
import { isValidEthAddress, rateLimit } from "@/lib/security"
import { SPIN } from "@/lib/economy"

const SPIN_COST = SPIN.COST

export async function POST(request: Request) {
  const supabase = await createClient()

  // Parse and validate wallet address
  const body = await request.json().catch(() => ({}))
  const walletAddress = body.wallet_address?.toLowerCase()

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 }
    )
  }

  // Rate limit: max 20 spins per minute per wallet
  const rl = rateLimit(`spin:${walletAddress}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    )
  }

  // Check wallet balance
  const { data: walletData, error: balanceError } = await supabase
    .from("wallet_balances")
    .select("balance")
    .eq("wallet_address", walletAddress)
    .single()

  if (balanceError || !walletData) {
    return NextResponse.json(
      { error: "Wallet not registered. Please connect your wallet first." },
      { status: 400 }
    )
  }

  const currentBalance = Number(walletData.balance)
  if (currentBalance < SPIN_COST) {
    return NextResponse.json(
      { error: `Insufficient balance. Need ${SPIN_COST} GACHA, have ${currentBalance}.` },
      { status: 400 }
    )
  }

  // Deduct balance FIRST (optimistic deduction)
  const { error: deductError } = await supabase
    .from("wallet_balances")
    .update({
      balance: currentBalance - SPIN_COST,
      updated_at: new Date().toISOString(),
    })
    .eq("wallet_address", walletAddress)

  if (deductError) {
    return NextResponse.json(
      { error: "Failed to deduct balance" },
      { status: 500 }
    )
  }

  // Fetch all items from Supabase
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")

  if (itemsError || !items || items.length === 0) {
    // Refund on error
    await supabase
      .from("wallet_balances")
      .update({ balance: currentBalance, updated_at: new Date().toISOString() })
      .eq("wallet_address", walletAddress)

    return NextResponse.json(
      { error: "Failed to load gacha items" },
      { status: 500 }
    )
  }

  // Roll the gacha using weighted random (server-side only)
  const wonItem = rollGacha(items)

  // Record the spin in history
  const { data: historyEntry, error: historyError } = await supabase
    .from("spin_history")
    .insert({
      wallet_address: walletAddress,
      item_won_id: wonItem.id,
      owned_by: walletAddress,
    })
    .select("id")
    .single()

  if (historyError) {
    // Refund on error
    await supabase
      .from("wallet_balances")
      .update({ balance: currentBalance, updated_at: new Date().toISOString() })
      .eq("wallet_address", walletAddress)

    return NextResponse.json(
      { error: "Failed to record spin" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ...wonItem,
    history_id: historyEntry.id,
    new_balance: currentBalance - SPIN_COST,
  })
}
