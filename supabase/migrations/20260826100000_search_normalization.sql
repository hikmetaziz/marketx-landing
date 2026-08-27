-- Shared immutable normalization for MarktX search queries.

create or replace function public.normalize_search_term(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = public
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        lower(
          translate(
            value,
            U&'\0259\0131\00F6\00FC\015F\00E7\011F\018F\0049\00D6\00DC\015E\00C7\011E\0130',
            'eiouscgEIOUSCGI'
          )
        ),
        U&'[^a-z0-9\0400-\04FF]+',
        ' ',
        'g'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

revoke all on function public.normalize_search_term(text) from public;

grant execute on function public.normalize_search_term(text)
  to anon, authenticated, service_role;