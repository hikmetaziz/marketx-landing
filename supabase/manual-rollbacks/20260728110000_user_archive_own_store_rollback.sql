-- Removes only the owner archive RPC. It does not restore stores or listings already archived manually.

begin;

revoke all on function public.delete_my_store(uuid) from authenticated;
drop function if exists public.delete_my_store(uuid) restrict;

notify pgrst, 'reload schema';

commit;
