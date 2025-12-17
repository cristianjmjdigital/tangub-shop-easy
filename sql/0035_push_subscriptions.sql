-- Push subscriptions for web push notifications
create table if not exists push_subscriptions (
  id bigserial primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_auth_user_id_idx on push_subscriptions(auth_user_id);

alter table push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'push_subscriptions_select_self'
  ) then
    create policy push_subscriptions_select_self
      on push_subscriptions
      for select
      using (auth.uid() = auth_user_id);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'push_subscriptions_insert_self'
  ) then
    create policy push_subscriptions_insert_self
      on push_subscriptions
      for insert
      with check (auth.uid() = auth_user_id);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'push_subscriptions_update_self'
  ) then
    create policy push_subscriptions_update_self
      on push_subscriptions
      for update
      using (auth.uid() = auth_user_id);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'push_subscriptions_delete_self'
  ) then
    create policy push_subscriptions_delete_self
      on push_subscriptions
      for delete
      using (auth.uid() = auth_user_id);
  end if;
end $$;
