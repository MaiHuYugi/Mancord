-- Mancord starter data model for Supabase Postgres.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 32),
  display_name text not null default 'New member',
  avatar_url text,
  avatar_media_type text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar_media_type text;
alter table public.profiles add column if not exists profile_completed boolean not null default false;
create unique index if not exists profiles_username_casefold_idx on public.profiles(lower(username));

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  icon_url text,
  icon_media_type text,
  created_at timestamptz not null default now()
);
alter table public.servers add column if not exists icon_url text;
alter table public.servers add column if not exists icon_media_type text;

create table if not exists public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'text' check (kind in ('text','voice','announcement')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (server_id, name)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_channel_created_idx on public.messages(channel_id, created_at desc);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists direct_messages_pair_created_idx on public.direct_messages(sender_id, recipient_id, created_at);

create table if not exists public.server_invites (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  use_count integer not null default 0
);
create index if not exists server_invites_token_idx on public.server_invites(token);

create or replace function public.is_server_member(target_server uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.server_members sm where sm.server_id = target_server and sm.user_id = auth.uid());
$$;
revoke all on function public.is_server_member(uuid) from public;
grant execute on function public.is_server_member(uuid) to authenticated;

create or replace function public.is_channel_member(target_channel uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.channels c where c.id = target_channel and public.is_server_member(c.server_id)
  );
$$;
revoke all on function public.is_channel_member(uuid) from public;
grant execute on function public.is_channel_member(uuid) to authenticated;

create or replace function public.create_server(server_name text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_server_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if char_length(trim(server_name)) not between 1 and 80 then raise exception 'Server name must be 1 to 80 characters'; end if;
  insert into public.servers(name, owner_id) values (trim(server_name), auth.uid()) returning id into new_server_id;
  insert into public.server_members(server_id, user_id, role) values (new_server_id, auth.uid(), 'owner');
  return new_server_id;
end;
$$;
revoke all on function public.create_server(text) from public;
grant execute on function public.create_server(text) to authenticated;

create or replace function public.create_server_invite(target_server uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare new_token text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not public.is_server_member(target_server) then raise exception 'You must be a server member to invite people'; end if;
  new_token := encode(gen_random_bytes(18), 'hex');
  insert into public.server_invites(server_id, token, created_by)
  values (target_server, new_token, auth.uid());
  return new_token;
end;
$$;
revoke all on function public.create_server_invite(uuid) from public;
grant execute on function public.create_server_invite(uuid) to authenticated;

create or replace function public.join_server_by_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target_server uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select server_id into target_server from public.server_invites
    where token = trim(invite_token) and (expires_at is null or expires_at > now())
    for update;
  if target_server is null then raise exception 'This invite link is invalid or expired'; end if;
  insert into public.server_members(server_id, user_id, role)
  values (target_server, auth.uid(), 'member')
  on conflict (server_id, user_id) do nothing;
  update public.server_invites set use_count = use_count + 1 where token = trim(invite_token);
  return target_server;
end;
$$;
revoke all on function public.join_server_by_invite(text) from public;
grant execute on function public.join_server_by_invite(text) to authenticated;

create or replace function public.add_server_member(target_server uuid, target_user uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not public.is_server_member(target_server) then raise exception 'You must be a server member to add people'; end if;
  if not exists (select 1 from public.profiles where id = target_user) then raise exception 'User not found'; end if;
  insert into public.server_members(server_id, user_id, role)
  values (target_server, target_user, 'member')
  on conflict (server_id, user_id) do nothing;
  return true;
end;
$$;
revoke all on function public.add_server_member(uuid, uuid) from public;
grant execute on function public.add_server_member(uuid, uuid) to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare picked_username text;
begin
  -- The public profile setup step assigns the chosen handle after email signup.
  picked_username := 'member_' || substr(replace(new.id::text,'-',''),1,10);
  insert into public.profiles(id, username, display_name)
  values (new.id, picked_username, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), picked_username));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_mancord on auth.users;
create trigger on_auth_user_created_mancord after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

insert into public.profiles(id, username, display_name)
select u.id,
       'member_' || substr(replace(u.id::text,'-',''),1,10),
       coalesce(nullif(u.raw_user_meta_data->>'display_name',''), 'New member')
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.direct_messages enable row level security;
alter table public.server_invites enable row level security;

drop policy if exists "Profiles are visible to signed-in members" on public.profiles;
create policy "Profiles are visible to signed-in members" on public.profiles for select to authenticated using (true);
drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Members can read their servers" on public.servers;
create policy "Members can read their servers" on public.servers for select to authenticated using (exists(select 1 from public.server_members sm where sm.server_id = id and sm.user_id = auth.uid()));
drop policy if exists "Signed-in users can create servers" on public.servers;
-- Create servers through create_server() so owner membership is atomic.
drop policy if exists "Owners can update servers" on public.servers;
create policy "Owners can update servers" on public.servers for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners can delete servers" on public.servers;
create policy "Owners can delete servers" on public.servers for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "Members can read memberships in their servers" on public.server_members;
create policy "Members can read memberships in their servers" on public.server_members for select to authenticated using (public.is_server_member(server_id));
drop policy if exists "Server creation adds its owner" on public.server_members;
create policy "Server creation adds its owner" on public.server_members for insert to authenticated with check (user_id = auth.uid() and role = 'owner' and exists(select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid()));

drop policy if exists "Members can read channels" on public.channels;
create policy "Members can read channels" on public.channels for select to authenticated using (exists(select 1 from public.server_members sm where sm.server_id = server_id and sm.user_id = auth.uid()));
drop policy if exists "Server owners can create channels" on public.channels;
create policy "Server owners can create channels" on public.channels for insert to authenticated with check (exists(select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid()));
drop policy if exists "Server owners can update channels" on public.channels;
create policy "Server owners can update channels" on public.channels for update to authenticated using (exists(select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid())) with check (exists(select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid()));
drop policy if exists "Server owners can delete channels" on public.channels;
create policy "Server owners can delete channels" on public.channels for delete to authenticated using (exists(select 1 from public.servers s where s.id = server_id and s.owner_id = auth.uid()));

drop policy if exists "Channel members can read messages" on public.messages;
create policy "Channel members can read messages" on public.messages for select to authenticated using (public.is_channel_member(channel_id));
drop policy if exists "Channel members can send messages as themselves" on public.messages;
create policy "Channel members can send messages as themselves" on public.messages for insert to authenticated with check (author_id = auth.uid() and public.is_channel_member(channel_id));
drop policy if exists "Authors can edit their messages" on public.messages;
create policy "Authors can edit their messages" on public.messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and public.is_channel_member(channel_id));
drop policy if exists "Authors can delete their messages" on public.messages;
create policy "Authors can delete their messages" on public.messages for delete to authenticated using (author_id = auth.uid());

drop policy if exists "Users can read their direct messages" on public.direct_messages;
create policy "Users can read their direct messages" on public.direct_messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "Users can send direct messages to signed-in members" on public.direct_messages;
create policy "Users can send direct messages to signed-in members" on public.direct_messages for insert to authenticated with check (sender_id = auth.uid() and recipient_id <> auth.uid());
drop policy if exists "Users can delete their sent direct messages" on public.direct_messages;
create policy "Users can delete their sent direct messages" on public.direct_messages for delete to authenticated using (sender_id = auth.uid());

drop policy if exists "Members can read server invites" on public.server_invites;
create policy "Members can read server invites" on public.server_invites for select to authenticated using (public.is_server_member(server_id));

-- Enable database change events for cross-client live chat. Re-running this schema is safe.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'server_members') then
    alter publication supabase_realtime add table public.server_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'servers') then
    alter publication supabase_realtime add table public.servers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channels') then
    alter publication supabase_realtime add table public.channels;
  end if;
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Profile media is publicly readable" on storage.objects;
create policy "Profile media is publicly readable" on storage.objects for select using (bucket_id = 'profile-media');
drop policy if exists "Users can upload their own profile media" on storage.objects;
create policy "Users can upload their own profile media" on storage.objects for insert to authenticated with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can replace their own profile media" on storage.objects;
create policy "Users can replace their own profile media" on storage.objects for update to authenticated using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own profile media" on storage.objects;
create policy "Users can delete their own profile media" on storage.objects for delete to authenticated using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime publication membership for chat tables is enabled above.
