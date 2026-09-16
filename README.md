# Elo — Guia de configuração (passo a passo)

Este documento assume zero conhecimento prévio de programação. Segue a ordem exata.

## Parte 1 — Criar a base de dados (Supabase)

1. Vai a https://supabase.com e cria uma conta gratuita.
2. Cria um novo projeto (**New project**). Escolhe um nome e uma palavra-passe para a base de dados (guarda-a nalgum lugar seguro — não é a mesma coisa que a tua conta de login na app).
3. Espera cerca de 2 minutos enquanto o Supabase aprovisiona o projeto.
4. No menu lateral, vai a **SQL Editor** → **New query**.
5. Abre o ficheiro `schema.sql` (incluído nesta pasta), copia todo o conteúdo, cola no editor e clica **Run**.
   - Isto cria a tabela `profiles` e as regras de segurança que impedem um utilizador de editar o perfil de outro.
6. No menu lateral, vai a **Project Settings** → **API**.
   - Copia o valor de **Project URL**.
   - Copia o valor de **anon public** (uma chave longa).

## Parte 2 — Ligar o código à base de dados

1. Abre o ficheiro `config.js` nesta pasta.
2. Substitui:
   - `COLOCA_AQUI_O_TEU_PROJECT_URL` pelo Project URL que copiaste.
   - `COLOCA_AQUI_A_TUA_ANON_KEY` pela anon key que copiaste.
3. Grava o ficheiro.

**Nota de segurança:** a "anon key" é pública por design — não é secreta. A proteção real dos dados vem das regras de segurança (RLS) que o `schema.sql` já configurou. Nunca precisas de esconder esta chave, mas nunca uses a "service role key" (outra chave que o Supabase mostra) no código do frontend — essa sim é secreta.

## Parte 3 — Publicar o site (Vercel)

1. Vai a https://vercel.com e cria uma conta gratuita (podes usar a conta do GitHub para facilitar).
2. Cria uma conta em https://github.com se ainda não tiveres.
3. No GitHub, cria um novo repositório (**New repository**), nome sugerido: `elo-app`.
4. Faz upload dos 5 ficheiros desta pasta (`index.html`, `style.css`, `app.js`, `config.js`, `schema.sql`) para esse repositório — o GitHub permite arrastar os ficheiros diretamente na interface web, sem linha de comandos.
5. Em Vercel, clica **Add New Project**, escolhe o repositório `elo-app`, e clica **Deploy**.
   - Não precisas de configurar nada — é um site estático, o Vercel deteta isso automaticamente.
6. Em cerca de 1 minuto, o Vercel dá-te um link do tipo `elo-app.vercel.app`. É o teu site, já publicado e acessível a qualquer pessoa.

## Testar

1. Abre o link do Vercel.
2. Cria uma conta de teste com o teu email.
3. Preenche o perfil (o que ofereces / o que procuras).
4. Cria uma segunda conta (outro email, ou usa o modo anónimo do browser) com características complementares.
5. Vai a **Descobrir** em ambas as contas e confirma que aparecem uma à outra.

## O que fazer a seguir (por prioridade)

1. **Confirmação de email:** por definição, o Supabase pode exigir confirmação por email antes do primeiro login — em *Authentication → Settings* podes desativar isto temporariamente enquanto testas com poucos utilizadores.
2. **Domínio próprio:** o Vercel permite ligar um domínio próprio (ex: `elo.pt`) gratuitamente, se comprares o domínio (custo à parte, tipicamente 8-12€/ano).
3. **Mensagens entre utilizadores:** próxima funcionalidade lógica depois de validares que o matching funciona.
4. **Avaliações/reputação:** só faz sentido depois de teres uso real da plataforma.

## Limitações desta versão (para teres consciência)

- A correspondência é feita no browser do utilizador (client-side), o que é aceitável até algumas centenas de perfis, mas não escala indefinidamente — a partir de milhares de perfis, a lógica deveria mover-se para uma função no servidor.
- Não há verificação de identidade — qualquer email funciona.
- Não há sistema de mensagens ainda — os utilizadores veem-se mutuamente, mas não podem comunicar dentro da plataforma.
