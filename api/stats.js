import { getPool } from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { rows: [stats] } = await getPool().query(`
      SELECT
        (SELECT COALESCE(SUM(visits), 0) FROM public.analytics_daily) AS visits,
        (SELECT COALESCE(SUM(total), 0) FROM public.confessions_daily) AS confessions,
        (SELECT COUNT(DISTINCT UPPER(country_code))
         FROM public.analytics_daily
         WHERE country_code ~ '^[A-Za-z]{2}$'
           AND UPPER(country_code) <> 'XX'
           AND visits > 0) AS countries,
        (SELECT COUNT(*) FROM public.reviews) AS reviews,
        (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
         FROM public.reviews) AS rating_average
    `);

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    return res.status(200).json({
      visits: Number(stats.visits),
      confessions: Number(stats.confessions),
      countries: Number(stats.countries),
      reviews: Number(stats.reviews),
      ratingAverage: Number(stats.rating_average)
    });
  } catch (error) {
    console.error("Erro em /api/stats:", error);
    return res.status(500).json({ success: false, error: "Não foi possível carregar as estatísticas." });
  }
}
