import { getPool } from "./db.js";
export default async function handler(req,res) {
 if(req.method!=="POST") return res.status(405).json({success:false,error:"Method not allowed"});
 try {
  const {rating,name="",comment="",publishComment=false,publishName=false}=req.body||{};
  const n=Number(rating);
  if(!Number.isInteger(n)||n<1||n>5) return res.status(400).json({success:false,error:"A nota deve estar entre 1 e 5."});
  const safeName=String(name??"").trim().slice(0,80),safeComment=String(comment??"").trim().slice(0,500);
  if(publishName===true&&!safeName) return res.status(400).json({success:false,error:"Informe um nome para autorizar sua publicação."});
  if(publishComment===true&&!safeComment) return res.status(400).json({success:false,error:"Informe um comentário para autorizar sua publicação."});
  await getPool().query(
   "INSERT INTO public.reviews (rating,name,comment,publish_comment,publish_name,approved) VALUES ($1,$2,$3,$4,$5,$4)",
   [n,safeName||null,safeComment||null,publishComment===true,publishName===true]
  );
  return res.status(200).json({success:true});
 } catch(e){console.error("Erro ao registrar avaliação:",e);return res.status(500).json({success:false,error:"Não foi possível registrar a avaliação."});}
}
