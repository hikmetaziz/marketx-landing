-- Moderator rejection reason shown to listing owner

alter table public.listings
  add column if not exists rejected_reason text;

comment on column public.listings.rejected_reason is 'Admin rejection message when status is rejected';
