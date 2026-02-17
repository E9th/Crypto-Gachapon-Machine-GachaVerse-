import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit } from "@/lib/security"
import { GVCOIN } from "@/lib/economy"

/**
 * POST /api/gvcoin/exchange
 * Body: { wallet_address, gacha_amount }
 *
 * Exchange in-game GACHA coins for on-chain GVCoin tokens.
 * - Deducts GACHA from the DB
 * - Records the exchange in gvcoin_exchanges table
 * - Returns a signed exchange receipt for the frontend
 *
 * NOTE: For real on-chain minting, you need ethers.js with
 * the minter private key. This route handles the DB side
 * and returns the exchange details. The mint transaction
 * is simulated until the contract is deployed.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  const walletAddress = body.wallet_address?.toLowerCase()
  const gachaAmount = Math.floor(Number(body.gacha_amount) || 0)

  if (!walletAddress || !isValidEthAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  if (gachaAmount < GVCOIN.GACHA_PER_GVCOIN) {
    return NextResponse.json({
      error: `Minimum exchange is ${GVCOIN.GACHA_PER_GVCOIN} GACHA (= 1 GVC)`,
    }, { status: 400 })
  }

  // Must be a multiple of the exchange rate
  if (gachaAmount % GVCOIN.GACHA_PER_GVCOIN !== 0) {
    return NextResponse.json({
      error: `Amount must be a multiple of ${GVCOIN.GACHA_PER_GVCOIN}`,
    }, { status: 400 })
  }

  // Rate limit
  const rl = rateLimit(`gvcoin:${walletAddress}`, 5, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many exchange requests" }, { status: 429 })
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
  if (currentBalance < gachaAmount) {
    return NextResponse.json({
      error: `Insufficient GACHA. Have ${currentBalance}, need ${gachaAmount}.`,
    }, { status: 400 })
  }

  const gvcAmount = gachaAmount / GVCOIN.GACHA_PER_GVCOIN

  // Deduct GACHA balance
  const newBalance = currentBalance - gachaAmount
  const { error: deductError } = await supabase
    .from("wallet_balances")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("wallet_address", walletAddress)

  if (deductError) {
    return NextResponse.json({ error: "Failed to deduct balance" }, { status: 500 })
  }

  // Record exchange
  const { data: exchangeRecord, error: exchangeError } = await supabase
    .from("gvcoin_exchanges")
    .insert({
      wallet_address: walletAddress,
      gacha_amount: gachaAmount,
      gvc_amount: gvcAmount,
      status: "pending",
    })
    .select("id")
    .single()

  if (exchangeError) {
    // Refund
    await supabase
      .from("wallet_balances")
      .update({ balance: currentBalance, updated_at: new Date().toISOString() })
      .eq("wallet_address", walletAddress)
    return NextResponse.json({ error: "Failed to record exchange" }, { status: 500 })
  }

  // Attempt on-chain mint if contract is configured
  let txHash: string | null = null
  let mintStatus = "pending"

  const contractAddress = process.env.NEXT_PUBLIC_GVCOIN_ADDRESS
  const minterKey = process.env.GVCOIN_MINTER_PRIVATE_KEY
  const rpcUrl = process.env.GVCOIN_RPC_URL || GVCOIN.RPC_URL

  if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000" && minterKey) {
    try {
      // Dynamic import to avoid bundling ethers in the client
      const { ethers } = await import("ethers")
      const abi = (await import("@/lib/gvcoin-abi.json")).default

      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const signer = new ethers.Wallet(minterKey, provider)
      const contract = new ethers.Contract(contractAddress, abi, signer)

      // Mint with 18 decimals
      const mintAmount = ethers.parseUnits(gvcAmount.toString(), 18)
      const tx = await contract.mint(walletAddress, mintAmount, "gacha_exchange")
      await tx.wait()

      txHash = tx.hash
      mintStatus = "minted"
    } catch (err) {
      console.error("GVCoin mint failed:", err)
      mintStatus = "mint_failed"
      // Don't refund — the exchange is still valid, just on-chain delivery failed
      // Admin can retry later
    }
  } else {
    // Contract not deployed yet — mark as pending for manual processing
    mintStatus = "no_contract"
  }

  // Update exchange record with status
  await supabase
    .from("gvcoin_exchanges")
    .update({
      status: mintStatus,
      tx_hash: txHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", exchangeRecord.id)

  return NextResponse.json({
    success: true,
    exchange_id: exchangeRecord.id,
    gacha_spent: gachaAmount,
    gvc_received: gvcAmount,
    new_balance: newBalance,
    tx_hash: txHash,
    status: mintStatus,
    contract_address: contractAddress || null,
  })
}

/**
 * GET /api/gvcoin/exchange?wallet=0x...
 *
 * Returns the GVCoin exchange history for a wallet.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get("wallet")?.toLowerCase()

  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("gvcoin_exchanges")
    .select("*")
    .eq("wallet_address", wallet)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch exchanges" }, { status: 500 })
  }

  return NextResponse.json({
    exchanges: data || [],
    exchange_rate: GVCOIN.GACHA_PER_GVCOIN,
    contract_address: GVCOIN.CONTRACT_ADDRESS,
  })
}
