import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isValidEthAddress } from "@/lib/security"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get("wallet")?.toLowerCase()
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  if (!wallet || !isValidEthAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  // Fetch items owned by this wallet (includes traded items)
  const { data, error } = await supabase
    .from("spin_history")
    .select("*, items(*)")
    .eq("owned_by", wallet)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
