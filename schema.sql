-- ============================================================
-- ESQUEMA DA BASE DE DADOS — Plataforma de Correspondência
-- Executar isto no editor SQL do teu projeto Supabase
-- (Supabase Dashboard > SQL Editor > New query > colar e correr)
-- ============================================================

-- Tabela de perfis públicos, ligada à tabela interna de utilizadores
-- autenticados do Supabase (auth.users).
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  bio text default '',
  offers text[] default '{}',   -- o que este subscritor oferece
  seeks text[] default '{}',    -- o que este subscritor procura
  created_at timestamp with time zone default now()
);

-- Ativa Row Level Security (RLS): sem isto, qualquer pessoa com a
-- chave pública poderia ler/escrever livremente na tabela.
alter table profiles enable row level security;

-- Qualquer pessoa autenticada pode VER todos os perfis
-- (necessário para o motor de correspondência funcionar).
create policy "Perfis são visíveis por todos os autenticados"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Um utilizador só pode criar o SEU PRÓPRIO perfil.
create policy "Utilizador cria o seu próprio perfil"
  on profiles for insert
  with check (auth.uid() = id);

-- Um utilizador só pode editar o SEU PRÓPRIO perfil.
create policy "Utilizador edita o seu próprio perfil"
  on profiles for update
  using (auth.uid() = id);

-- Índice para acelerar a pesquisa por sobreposição de arrays
-- (essencial quando o número de perfis crescer).
create index profiles_offers_idx on profiles using gin (offers);
create index profiles_seeks_idx on profiles using gin (seeks);
