-- Deposit is 60% and non-refundable
alter table public.settings
  alter column deposit_pct set default 60,
  add column deposit_note text not null default 'Deposits are non-refundable.';
alter table public.orders alter column deposit_pct set default 60;
