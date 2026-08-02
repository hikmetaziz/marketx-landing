-- Rollback for 20260719130000_message_sensitive_credentials_block.sql
-- Manual only. Does not touch conversation/message RLS, queue RPCs, or final
-- messaging enforcement policies.

begin;

drop trigger if exists marktx_messages_sensitive_credentials_bi on public.messages;
drop trigger if exists marktx_messages_sensitive_credentials_bu on public.messages;

drop function if exists public.marktx_enforce_message_sensitive_credentials();
drop function if exists public.marktx_classify_message_sensitive_credentials(text);
drop function if exists public.marktx_text_has_any(text, text[]);
drop function if exists public.marktx_has_card_number_like(text);
drop function if exists public.marktx_luhn_valid(text);
drop function if exists public.marktx_normalize_payment_safety_text(text);

commit;
