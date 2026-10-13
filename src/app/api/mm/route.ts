import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * MM desk feed — serves the market-making engine's own output files.
 * No brain API, no venue calls: pure local files under research/data.
 *
 * GET /api/mm?mode=paper|live
 *   -> { ok, mode, status, daily, replay, collector, fills, generated }
 *
 * Env:
 *   MM_DATA_DIR    absolute path to research/data (default: ../research/data)
 *   MM_DESK_TOKEN  if set, requires "Authorization: Bearer <token>"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.MM_DATA_DIR ?? path.resolve(process.cwd(), "..", "research", "data");
const TOKEN = process.env.MM_DESK_TOKEN ?? "";

async function readJson(p: string) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

async function readCsv(p: string): Promise<Record<string, string>[]> {
  try {
    const txt = await fs.readFile(p, "utf8");
    const [head, ...lines] = txt.trim().split(/\r?\n/);
    const cols = head.split(",").map((c) => c.trim());
    return lines.map((l) => {
      const v = l.split(",");
      const o: Record<string, string> = {};
      cols.forEach((c, i) => {
        o[c] = v[i] ?? "";
      });
      return o;
    });
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (TOKEN) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${TOKEN}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const mode = req.nextUrl.searchParams.get("mode") === "live" ? "live" : "paper";
  const eng = path.join(DATA_DIR, "engine", mode);

  const [status, daily, replay, collector] = await Promise.all([
    readJson(path.join(eng, "status.json")),
    readCsv(path.join(eng, "daily.csv")),
    readCsv(path.join(DATA_DIR, "engine", "replay_daily.csv")),
    readJson(path.join(DATA_DIR, "live", "collector_status.json")),
  ]);

  let fills: Record<string, string>[] = [];
  try {
    const files = (await fs.readdir(eng)).filter((f) => /^fills_\d+\.csv$/.test(f)).sort();
    const last = files.at(-1);
    if (last) fills = (await readCsv(path.join(eng, last))).slice(-15).reverse();
  } catch {
    /* no fills yet */
  }

  if (!status) {
    return NextResponse.json(
      { ok: false, error: `no engine status in ${eng} (is the ${mode} engine running?)`, mode },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode,
    status,
    daily,
    replay,
    collector,
    fills,
    generated: new Date().toISOString(),
  });
}
