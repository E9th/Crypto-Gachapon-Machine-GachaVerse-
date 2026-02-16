import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress } from "@/lib/security"

/**
 * GET /api/balance?wallet=0x...
 * Get the GACHA token balance for a wallet
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get("wallet")?.toLowerCase()

  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("wallet_balances")
    .select("balance")
    .eq("wallet_address", wallet)
    .single()

  if (error || !data) {
    // Wallet not registered yet, return default
    return NextResponse.json({ balance: 0 })
  }

  return NextResponse.json({ balance: Number(data.balance) })
}
