-- Add a non-public status for safe cleanup of old AI placeholder listing rows.
alter type public.listing_status add value if not exists 'draft';
