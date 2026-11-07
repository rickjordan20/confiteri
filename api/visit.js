import { getPool } from "./db.js";
export default async function handler(req,res) {
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 try {
  const ua=String(req.headers["user-agent"]||"").toLowerCase();
  if(["bot","crawler","spider","slurp","bingpreview","facebookexternalhit","telegrambot","discordbot","headless","puppeteer","playwright","vercel"].some(x=>ua.includes(x))) return res.status(200).json({success:true,ignored:true});
  const source=typeof req.body?.source==="string"?req.body.source:"direct";
  const country=String(req.headers["x-vercel-ip-country"]||"XX");
  await getPool().query("SELECT public.register_visit($1,$2)",[country,source]);
  return res.status(200).json({success:true});
 } catch(e) {console.error("Erro ao registrar visita:",e);return res.status(500).json({success:false});}
}
