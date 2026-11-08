-- Upgrade for an existing installation created before the plot "shape" and
-- "terrain" questions were removed from the consultation. Older databases still
-- reject confirmation with "Missing required answer: shape". This replaces only
-- the confirmation validator with the current schema.sql definition. No tables,
-- rows, RLS policies or roles are changed. Safe to run more than once.
begin;
create or replace function private.confirm_brief(p_project_id uuid, p_draft_revision integer, p_acknowledged boolean)
returns public.design_briefs
language plpgsql security definer set search_path = '' as $$
declare
  draft public.consultation_drafts;
  result public.design_briefs;
  a jsonb;
  k text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.projects where id=p_project_id and owner_id=auth.uid() and status='active'
  ) then raise exception 'Active project not found' using errcode='42501'; end if;
  if p_acknowledged is distinct from true then raise exception 'Brief acknowledgement required' using errcode='22023'; end if;
  select * into strict draft from public.consultation_drafts where project_id=p_project_id for update;
  if draft.revision is distinct from p_draft_revision then
    raise exception 'Stale draft revision; reload before confirming' using errcode='40001';
  end if;
  select * into result from public.design_briefs where project_id=p_project_id and draft_revision=p_draft_revision;
  if found then return result; end if;
  a := draft.answers;
  if a ? 'storeys' then
    if jsonb_typeof(a->'storeys') <> 'number' then
      raise exception 'Storeys must be a number from 1 to 3' using errcode='22023';
    end if;
    if (a->>'storeys')::numeric not between 1 and 3 or (a->>'storeys')::numeric <> trunc((a->>'storeys')::numeric) then
      raise exception 'Storeys must be a whole number from 1 to 3' using errcode='22023';
    end if;
  end if;
  foreach k in array array['location','width','length','access','budget','finish',
    'budgetIncludes','occupants','bedrooms','bathrooms','workFromHome','guests','kitchen','style','privacy','accessibility'] loop
    if a->>k is null or btrim(a->>k) = '' then
      raise exception 'Missing required answer: %', k using errcode='22023';
    end if;
  end loop;
  if a->>'finish' not in ('Basic','Standard','Premium')
    or a->>'style' not in ('Modern','Traditional','Minimalist')
    or a->>'access' not in ('North','South','East','West','Unknown')
    or a->>'workFromHome' not in ('Yes','No') or a->>'guests' not in ('Rarely','Sometimes','Often')
    or a->>'kitchen' not in ('Open plan','Separate')
    or a->>'privacy' not in ('Separate from entertaining spaces','No preference')
    or a->>'accessibility' not in ('None stated','Step-free access','Other needs') then
    raise exception 'Unsupported consultation choice' using errcode='22023';
  end if;
  if (a->>'workFromHome' = 'Yes' and coalesce(a->>'office','') not in ('Dedicated quiet office','Shared workspace'))
    or (a->>'guests' = 'Often' and coalesce(btrim(a->>'guestNeeds'),'') = '')
    or (a->>'accessibility' = 'Other needs' and coalesce(btrim(a->>'accessibilityNotes'),'') = '') then
    raise exception 'Required follow-up answers are missing' using errcode='22023';
  end if;
  foreach k in array array['width','length','budget','occupants','bedrooms','bathrooms'] loop
    if jsonb_typeof(a->k) <> 'number' then raise exception 'Expected number: %', k using errcode='22023'; end if;
  end loop;
  if (a->>'occupants')::numeric not between 1 and 30
    or (a->>'bedrooms')::numeric not between 1 and 6
    or (a->>'bathrooms')::numeric not between 1 and 4
    or exists(select 1 from unnest(array['occupants','bedrooms','bathrooms']) as f(key)
      where (a->>f.key)::numeric <> trunc((a->>f.key)::numeric)) then
    raise exception 'Unsupported household or room counts' using errcode='22023';
  end if;
  insert into public.design_briefs(project_id,version,draft_revision,questionnaire_version,answers,site_width_m,site_depth_m,budget)
  select p_project_id,coalesce(max(version),0)+1,draft.revision,draft.questionnaire_version,a,
    (a->>'width')::numeric,(a->>'length')::numeric,(a->>'budget')::numeric
  from public.design_briefs where project_id=p_project_id returning * into result;
  return result;
end;
$$;
revoke all on function private.confirm_brief(uuid,integer,boolean) from public, anon, authenticated;
grant execute on function private.confirm_brief(uuid,integer,boolean) to authenticated;
commit;
