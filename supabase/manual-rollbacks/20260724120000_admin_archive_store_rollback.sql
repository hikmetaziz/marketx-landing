-- Removes only the archive RPC. It does not restore stores already archived manually.

begin;

revoke all on function public.admin_archive_store(uuid, text) from authenticated;
drop function if exists public.admin_archive_store(uuid, text) restrict;
grant execute on function public.admin_delete_store(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
