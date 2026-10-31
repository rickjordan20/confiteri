import { getPool } from "./db.js";
export default async function handler(req,res) {
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 try {await getPool().query("SELECT public.register_confession()");return res.status(200).json({success:true});}
 catch(e){console.error("Erro ao registrar confissão:",e);return res.status(500).json({success:false});}
}
