-- Manual rollback for 20260723121000_admin_transfer_store_owner.sql.
-- Drops only the transfer RPC. Does not modify store/member/listing data.

begin;

drop function if exists public.admin_transfer_store_owner(uuid, uuid) restrict;

commit;
