import { getPool } from "./db.js";
export default async function handler(req,res) {
 if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
 try {
  const {rows:[r]}=await getPool().query(`
   SELECT
   (SELECT COALESCE(SUM(visits),0) FROM public.analytics_daily) AS visits,
   (SELECT COALESCE(SUM(total),0) FROM public.confessions_daily) AS confessions,
   (SELECT COUNT(DISTINCT country_code) FROM public.analytics_daily WHERE country_code <> 'XX') AS countries,
   (SELECT COUNT(*) FROM public.reviews) AS reviews,
   (SELECT COALESCE(ROUND(AVG(rating)::numeric,1),0) FROM public.reviews) AS rating_average
  `);
  return res.status(200).json({visits:Number(r.visits),confessions:Number(r.confessions),countries:Number(r.countries),reviews:Number(r.reviews),ratingAverage:Number(r.rating_average)});
 } catch(e){console.error("Erro em /api/stats:",e);return res.status(500).json({success:false,error:"Não foi possível carregar as estatísticas."});}
}
