create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  donor_name text,
  amount_cents integer not null,
  currency text not null default 'eur',
  kind text not null check (kind in ('one_off','monthly','annual','collector_access')),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text not null default 'pending',
  environment text not null default 'sandbox',
  created_at timestamptz not null default now()
);

create index if not exists idx_donations_user on public.donations(user_id);
create index if not exists idx_donations_subscription on public.donations(stripe_subscription_id);

alter table public.donations enable row level security;

create policy "Users can view their own donations"
  on public.donations for select
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Foundation views all donations"
  on public.donations for select
  using (public.has_role(auth.uid(), 'foundation'));

create table if not exists public.donation_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  price_id text not null,
  product_id text,
  kind text not null check (kind in ('monthly','annual','collector_access')),
  status text not null,
  amount_cents integer,
  currency text not null default 'eur',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_donation_subs_user on public.donation_subscriptions(user_id);

alter table public.donation_subscriptions enable row level security;

create policy "Users view own donation subscriptions"
  on public.donation_subscriptions for select
  using (auth.uid() = user_id);

create policy "Foundation views all donation subscriptions"
  on public.donation_subscriptions for select
  using (public.has_role(auth.uid(), 'foundation'));

create or replace function public.has_collector_access(_user_id uuid, _env text default 'sandbox')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.donation_subscriptions
    where user_id = _user_id
      and kind = 'collector_access'
      and environment = _env
      and (
        (status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and cancel_at_period_end = true and current_period_end > now())
      )
  );
$$;