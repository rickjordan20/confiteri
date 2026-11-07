import { getPool } from "./db.js";

// Estatísticas agregadas: nunca retornamos IPs ou dados do exame pessoal.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  try {
    const { rows } = await getPool().query(`
      SELECT UPPER(country_code) AS code, SUM(visits)::bigint AS visits
      FROM public.analytics_daily
      WHERE country_code ~ '^[A-Za-z]{2}$'
        AND UPPER(country_code) <> 'XX'
      GROUP BY UPPER(country_code)
      ORDER BY SUM(visits) DESC, UPPER(country_code) ASC
    `);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
    return res.status(200).json({
      success: true,
      countries: rows.map(({ code, visits }) => ({ code, visits: Number(visits) }))
    });
  } catch (error) {
    console.error("Erro em /api/countries:", error);
    return res.status(500).json({ success: false, error: "Não foi possível carregar os países." });
  }
}
