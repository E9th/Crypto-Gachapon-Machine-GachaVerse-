import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { GVCOIN } from "@/lib/economy"

/**
 * POST /api/gvcoin/retry
 * Body: { wallet_address }
 *
 * Retry minting GVCoin for all failed/pending exchanges.
 * This handles exchanges that were recorded in DB but failed
 * to mint on-chain (e.g., due to wrong private key, contract not deployed, etc.)
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))
  const walletAddress = body.wallet_address?.toLowerCase()

  if (!walletAddress) {
    return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 })
  }

  // Find all unminted exchanges for this wallet
  const { data: pendingExchanges, error: fetchError } = await supabase
    .from("gvcoin_exchanges")
    .select("*")
    .eq("wallet_address", walletAddress)
    .in("status", ["pending", "mint_failed", "no_contract"])
    .order("created_at", { ascending: true })

  if (fetchError) {
    return NextResponse.json({ error: "Failed to fetch exchanges" }, { status: 500 })
  }

  if (!pendingExchanges || pendingExchanges.length === 0) {
    return NextResponse.json({ message: "No pending exchanges to retry", retried: 0 })
  }

  // Validate minter config
  const contractAddress = process.env.NEXT_PUBLIC_GVCOIN_ADDRESS?.trim()
  const rawMinterKey = process.env.GVCOIN_MINTER_PRIVATE_KEY?.trim()
  const rpcUrl = process.env.GVCOIN_RPC_URL?.trim() || GVCOIN.RPC_URL

  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "Contract not configured" }, { status: 500 })
  }

  let minterKey: string | undefined
  if (rawMinterKey) {
    const cleaned = rawMinterKey.startsWith("0x") ? rawMinterKey : `0x${rawMinterKey}`
    if (/^0x[0-9a-fA-F]{64}$/.test(cleaned)) {
      minterKey = cleaned
    }
  }

  if (!minterKey) {
    return NextResponse.json({ error: "Invalid minter private key" }, { status: 500 })
  }

  // Import ethers once
  const { ethers } = await import("ethers")
  const abi = (await import("@/lib/gvcoin-abi.json")).default

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(minterKey, provider)
  const contract = new ethers.Contract(contractAddress, abi, signer)

  const results: Array<{
    id: string
    gvc_amount: number
    status: string
    tx_hash: string | null
    error?: string
  }> = []

  // Retry each pending exchange
  for (const exchange of pendingExchanges) {
    try {
      const mintAmount = ethers.parseUnits(
        Number(exchange.gvc_amount).toString(),
        18
      )
      const tx = await contract.mint(
        exchange.wallet_address,
        mintAmount,
        "gacha_exchange_retry"
      )
      await tx.wait()

      // Update record
      await supabase
        .from("gvcoin_exchanges")
        .update({
          status: "minted",
          tx_hash: tx.hash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", exchange.id)

      results.push({
        id: exchange.id,
        gvc_amount: Number(exchange.gvc_amount),
        status: "minted",
        tx_hash: tx.hash,
      })
    } catch (err: any) {
      console.error(`Retry mint failed for exchange ${exchange.id}:`, err)

      await supabase
        .from("gvcoin_exchanges")
        .update({
          status: "mint_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", exchange.id)

      results.push({
        id: exchange.id,
        gvc_amount: Number(exchange.gvc_amount),
        status: "mint_failed",
        tx_hash: null,
        error: err.shortMessage || err.message || "Unknown error",
      })
    }
  }

  const minted = results.filter((r) => r.status === "minted")
  const failed = results.filter((r) => r.status === "mint_failed")
  const totalMinted = minted.reduce((sum, r) => sum + r.gvc_amount, 0)

  return NextResponse.json({
    success: true,
    retried: results.length,
    minted: minted.length,
    failed: failed.length,
    total_gvc_minted: totalMinted,
    results,
  })
}
