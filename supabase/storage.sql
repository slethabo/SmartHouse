-- Optional: run AFTER schema.sql in Supabase SQL Editor, as postgres.
-- File uploads/deletions must use the Storage API, not SQL INSERT/DELETE on objects.
begin;
insert into storage.buckets(id,name,public)
values ('concept-assets','concept-assets',false), ('concept-exports','concept-exports',false)
on conflict (id) do nothing;

do $$
begin
  if exists(select 1 from storage.buckets where id in ('concept-assets','concept-exports') and public) then
    raise exception 'SmartHouse buckets must be private; change the existing bucket settings first';
  end if;
end;
$$;

-- Metadata rows inherit concept/project RLS. Unregistered files are invisible.
create policy smarthouse_asset_download on storage.objects for select to authenticated
using (bucket_id='concept-assets' and exists (
  select 1 from public.concept_assets a where a.storage_bucket=bucket_id and a.storage_path=name
));
create policy smarthouse_export_download on storage.objects for select to authenticated
using (bucket_id='concept-exports' and exists (
  select 1 from public.concept_exports e where e.storage_bucket=bucket_id and e.storage_path=name and e.status='ready'
));
-- No anonymous reads or browser uploads. A trusted server uploads generated files
-- with the service-role key, then records their metadata against the correct concept.
-- Store bucket/path, never expiring signed URLs. Generate signed URLs on demand.
commit;
