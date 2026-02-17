import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress, rateLimit } from "@/lib/security"
import { REACTOR } from "@/lib/economy"

/**
 * GET /api/reactor/energy?wallet=0x...
 * Returns current energy state with server-side regen calculation
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get("wallet")?.toLowerCase()

  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_energy")
    .select("*")
    .eq("wallet_address", wallet)
    .single()

  if (error || !data) {
    // Auto-create energy record for new users
    const { data: newData, error: insertError } = await supabase
      .from("user_energy")
      .insert({
        wallet_address: wallet,
        energy: REACTOR.DEFAULT_MAX_ENERGY,
        max_energy: REACTOR.DEFAULT_MAX_ENERGY,
        level: 1,
        total_harvested: 0,
        last_regen_at: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (insertError || !newData) {
      return NextResponse.json({
        energy: REACTOR.DEFAULT_MAX_ENERGY,
        max_energy: REACTOR.DEFAULT_MAX_ENERGY,
        level: 1,
        total_harvested: 0,
        regen_rate: REACTOR.REGEN_PER_SECOND,
      })
    }

    return NextResponse.json({
      energy: Number(newData.energy),
      max_energy: Number(newData.max_energy),
      level: newData.level,
      total_harvested: Number(newData.total_harvested),
      regen_rate: REACTOR.REGEN_PER_SECOND,
    })
  }

  // Calculate regenerated energy since last update
  const now = new Date()
  const lastRegen = new Date(data.last_regen_at)
  const elapsedSec = (now.getTime() - lastRegen.getTime()) / 1000
  const regenAmount = elapsedSec * REACTOR.REGEN_PER_SECOND
  const maxEnergy = Number(data.max_energy)
  const currentEnergy = Math.min(maxEnergy, Number(data.energy) + regenAmount)

  // Update regen timestamp if significant regen happened
  if (regenAmount >= 1) {
    await supabase
      .from("user_energy")
      .update({
        energy: currentEnergy,
        last_regen_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("wallet_address", wallet)
  }

  return NextResponse.json({
    energy: Math.floor(currentEnergy * 100) / 100,
    max_energy: maxEnergy,
    level: data.level,
    total_harvested: Number(data.total_harvested),
    regen_rate: REACTOR.REGEN_PER_SECOND,
    cooldown_until: data.cooldown_until,
  })
}
