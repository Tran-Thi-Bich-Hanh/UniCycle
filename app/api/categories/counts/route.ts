import { connection, NextResponse } from "next/server";
import { getCategoryListingCounts } from "@/lib/data/marketplace";

export async function GET() {
  await connection();
  const counts = await getCategoryListingCounts();

  return NextResponse.json(
    { counts },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
