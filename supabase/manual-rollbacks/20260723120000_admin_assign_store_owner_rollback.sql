-- Manual rollback for 20260723120000_admin_assign_store_owner.sql.
-- Drops only the admin assignment RPC. Does not modify store/member data.

begin;

drop function if exists public.admin_assign_store_owner(uuid, uuid) restrict;

commit;
