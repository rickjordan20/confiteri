import { getPool } from "./db.js";
import { createHash } from "node:crypto";

// Proteção leve por instância serverless. Não substitui um rate limiter distribuído.
const recent = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 6;
const BOT_PATTERN = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|telegrambot|discordbot|headless|puppeteer|playwright|vercel|curl|wget|python-requests/i;

export function normalizeCountry(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "XX";
}

export function normalizeSource(value) {
  const source = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9_-]{1,50}$/.test(source) ? source : "direct";
}

export function shouldIgnoreVisit(req) {
  const ua = String(req.headers["user-agent"] || "");
  if (!ua || BOT_PATTERN.test(ua)) return true;
  const fetchSite = String(req.headers["sec-fetch-site"] || "").toLowerCase();
  if (fetchSite === "cross-site") return true;
  // O cabeçalho Origin é controlado pelo navegador; requisições sem Origin
  // (clientes antigos) continuam aceitas para não perder visitas legítimas.
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (origin && host) {
    try {
      if (new URL(String(origin)).host !== String(host)) return true;
    } catch {
      return true;
    }
  }
  return false;
}

function isRateLimited(req) {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (!ip) return false;
  const now = Date.now();
  // Hash temporário em memória: não persistir endereço IP no banco ou logs.
  const key = createHash("sha256").update(ip).digest("hex");
  const entry = recent.get(key);
  if (recent.size > 2000) {
    for (const [id, item] of recent) {
      if (now - item.start > WINDOW_MS) recent.delete(id);
    }
  }
  if (!entry || now - entry.start > WINDOW_MS) {
    recent.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }
  if (shouldIgnoreVisit(req)) return res.status(200).json({ success: true, ignored: true });
  if (isRateLimited(req)) return res.status(429).json({ success: false, error: "Muitas solicitações." });
  try {
    const country = normalizeCountry(req.headers["x-vercel-ip-country"]);
    const source = normalizeSource(req.body?.source);
    await getPool().query("SELECT public.register_visit($1,$2)", [country, source]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao registrar visita:", error);
    return res.status(500).json({ success: false });
  }
}
