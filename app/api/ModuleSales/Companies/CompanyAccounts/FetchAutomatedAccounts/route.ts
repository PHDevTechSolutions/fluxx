import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Initialize database connection
const Xchire_databaseUrl = process.env.Fluxx_DB_URL;
if (!Xchire_databaseUrl) {
    throw new Error("Fluxx_DB_URL is not set in the environment variables.");
}
const Xchire_sql = neon(Xchire_databaseUrl);

/**
 * GET /api/ModuleSales/UserManagement/CompanyAccounts?referenceid=...
 * Fetch accounts by reference ID, excluding those with 'Inactive' status.
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const referenceId = url.searchParams.get("referenceid");

        console.log("Xchire received reference ID:", referenceId);

        if (!referenceId) {
            return NextResponse.json(
                { success: false, error: "Missing reference ID." },
                { status: 400 }
            );
        }

        const Xchire_fetch = await Xchire_sql`
            SELECT * 
            FROM accounts 
            WHERE referenceid = ${referenceId} 
            AND status != 'Inactive';
        `;

        if (Xchire_fetch.length === 0) {
            return NextResponse.json(
                { success: false, error: "No accounts found with the provided reference ID." },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: Xchire_fetch }, { status: 200 });
    } catch (Xchire_error: any) {
        console.error("Xchire error fetching accounts:", Xchire_error);
        return NextResponse.json(
            { success: false, error: Xchire_error.message || "Failed to fetch accounts." },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic"; // Always serve fresh data
