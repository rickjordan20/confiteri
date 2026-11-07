# Migração para Aiven PostgreSQL

Este branch substitui o cliente Supabase nas rotas `/api/visit`, `/api/confession`, `/api/stats`, `/api/review` e `/api/reviews`.

## Configuração
- Configure `DATABASE_URL` no Vercel para Production e Preview, conforme o ambiente.
- Use a URI PostgreSQL do Aiven, com TLS e validação do certificado. Se a autoridade certificadora não estiver disponível no ambiente, configure a cadeia CA confiável no runtime; **não desative a verificação TLS**.
- O pool usa no máximo três conexões por instância. Verifique o limite de conexões do plano Aiven.
- Gere e versione um novo `package-lock.json` com `npm install --package-lock-only` antes do merge.
- As tabelas `analytics_daily`, `confessions_daily`, `reviews` e as funções `register_visit`, `register_confession` devem existir no schema `public`.

## Validação antes do merge
1. Implantar a branch em Preview no Vercel, com `DATABASE_URL` disponível.
2. Consultar `GET /api/stats` e `GET /api/reviews`; ambos devem retornar 200.
3. Registrar visita via `POST /api/visit` e verificar incremento no banco.
4. Registrar avaliação via `POST /api/review` e verificar que `approved=false`; aprovação requer ação administrativa no banco.
5. Confirmar que nenhuma resposta pessoal do exame é armazenada.
6. **Não testar `POST /api/confession` em produção com dados fictícios**: a operação incrementa contador real.
7. Verificar logs e erros TLS antes de promover para Production.

## Observações
Os dados antigos do Supabase não foram migrados. A importação de históricos é uma tarefa separada. Não desative o Supabase antes de exportar os dados, caso ainda estejam disponíveis.
