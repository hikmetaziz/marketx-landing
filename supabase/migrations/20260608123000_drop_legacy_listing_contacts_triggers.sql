do $$
declare
  legacy_trigger record;
begin
  for legacy_trigger in
    select
      trigger_table.relname as table_name,
      trigger_row.tgname as trigger_name
    from pg_trigger as trigger_row
    join pg_class as trigger_table
      on trigger_table.oid = trigger_row.tgrelid
    join pg_namespace as trigger_schema
      on trigger_schema.oid = trigger_table.relnamespace
    join pg_proc as trigger_function
      on trigger_function.oid = trigger_row.tgfoid
    where trigger_schema.nspname = 'public'
      and trigger_table.relname = 'listings'
      and not trigger_row.tgisinternal
      and pg_get_functiondef(trigger_function.oid) ilike '%listing_contacts%'
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      legacy_trigger.trigger_name,
      legacy_trigger.table_name
    );
  end loop;
end $$;
