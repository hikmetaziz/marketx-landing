-- Return a small, ranked set of private vocabulary candidates for shared search.

create or replace function public.search_vocabulary_candidates(
  query_text text,
  max_results integer default 5
)
returns table (
  normalized_term text,
  edit_distance integer,
  similarity real,
  variant_count bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  with input as (
    select
      public.normalize_search_term(query_text) as normalized_query,
      least(greatest(coalesce(max_results, 5), 1), 10)::integer
        as result_limit
  ),
  params as (
    select
      normalized_query,
      result_limit,
      case
        when char_length(normalized_query) <= 4 then 1
        when char_length(normalized_query) <= 8 then 2
        else 3
      end as max_distance
    from input
    where char_length(normalized_query) between 3 and 128
  ),
  grouped as (
    select
      sv.normalized_term as candidate_term,
      count(*)::bigint as candidate_variant_count
    from public.search_vocabulary as sv
    cross join params as p
    where sv.is_active = true
      and sv.normalized_term <> p.normalized_query
      and char_length(sv.normalized_term)
        between greatest(3, char_length(p.normalized_query) - p.max_distance)
        and least(128, char_length(p.normalized_query) + p.max_distance)
      and sv.normalized_term
        operator(extensions.%) p.normalized_query
    group by sv.normalized_term
  ),
  scored as (
    select
      g.candidate_term,
      extensions.levenshtein_less_equal(
        g.candidate_term,
        p.normalized_query,
        p.max_distance
      )::integer as candidate_edit_distance,
      extensions.similarity(
        g.candidate_term,
        p.normalized_query
      )::real as candidate_similarity,
      g.candidate_variant_count,
      p.max_distance,
      p.result_limit
    from grouped as g
    cross join params as p
  )
  select
    s.candidate_term,
    s.candidate_edit_distance,
    s.candidate_similarity,
    s.candidate_variant_count
  from scored as s
  where s.candidate_edit_distance <= s.max_distance
  order by
    s.candidate_edit_distance asc,
    s.candidate_variant_count desc,
    s.candidate_similarity desc,
    s.candidate_term asc
  limit (select result_limit from params);
$function$;

revoke all on function
  public.search_vocabulary_candidates(text, integer)
  from public;

grant execute on function
  public.search_vocabulary_candidates(text, integer)
  to anon, authenticated, service_role;
