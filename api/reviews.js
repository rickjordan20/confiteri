import { getPool } from "./db.js";
export default async function handler(req,res) {
 if(req.method!=="GET") return res.status(405).json({success:false,error:"Method not allowed"});
 try {
  const {rows}=await getPool().query(`
   SELECT id,rating,CASE WHEN publish_name THEN name ELSE NULL END AS name,
   comment,publish_comment,publish_name,created_at
   FROM public.reviews
   WHERE approved=TRUE AND publish_comment=TRUE AND comment IS NOT NULL
   ORDER BY created_at DESC LIMIT 50
  `);
  return res.status(200).json({success:true,reviews:rows});
 } catch(e){console.error("Erro ao carregar avaliações públicas:",e);return res.status(500).json({success:false,reviews:[],error:"Não foi possível carregar as avaliações."});}
}
