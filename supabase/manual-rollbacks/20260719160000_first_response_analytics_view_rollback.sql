-- Manual rollback for 20260719160000_first_response_analytics_view.sql.
--
-- Removes only the first-response analytics view prepared by Prompt 8A.
-- Does not touch messaging data, RPCs, RLS policies, reports, queues, or reads.

begin;

drop view if exists public.marktx_first_response_analytics_v1 restrict;

commit;

select
  to_regclass('public.marktx_first_response_analytics_v1') is null as rollback_passed,
  to_regclass('public.marktx_first_response_analytics_v1') as remaining_object;
