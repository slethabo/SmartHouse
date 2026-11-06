-- Optional additive upgrade for an existing installation. No project rows are
-- changed and no RLS policies, roles or grants are expanded. The current client
-- already round-trips storeys through answers JSON; this adds DB-side validation
-- and permits future trusted concept snapshots with 2 or 3 floors.
begin;
alter table public.house_concepts drop constraint if exists house_concepts_floors_check;
alter table public.house_concepts add constraint house_concepts_floors_check check (floors between 1 and 3);
alter table public.design_briefs alter column assumptions set default 'Schematic one-to-three-storey concept; professional review required.';

create or replace function private.validate_storeys_answer() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.answers ? 'storeys' then
    if jsonb_typeof(new.answers->'storeys') <> 'number' then
      raise exception 'Storeys must be a number from 1 to 3' using errcode='22023';
    end if;
    if (new.answers->>'storeys')::numeric not between 1 and 3
      or (new.answers->>'storeys')::numeric <> trunc((new.answers->>'storeys')::numeric) then
      raise exception 'Storeys must be a whole number from 1 to 3' using errcode='22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_storeys_answer() from public,anon,authenticated;
drop trigger if exists validate_storeys_answer on public.consultation_drafts;
create trigger validate_storeys_answer before insert or update of answers on public.consultation_drafts
for each row execute function private.validate_storeys_answer();
drop trigger if exists validate_storeys_answer on public.design_briefs;
create trigger validate_storeys_answer before insert on public.design_briefs
for each row execute function private.validate_storeys_answer();
commit;
