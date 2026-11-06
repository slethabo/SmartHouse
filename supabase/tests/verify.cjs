/* Isolated executable integration checks; never reads DATABASE_URL or .env. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

async function main() {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const root = path.resolve(__dirname, '..');
  const temporaryRoot = path.resolve(root, '../tmp');
  fs.mkdirSync(temporaryRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(temporaryRoot, 'supabase-check-'));
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const cluster = new EmbeddedPostgres({
    databaseDir: directory, user: 'postgres', password: randomUUID(), port,
    persistent: true, initdbFlags: ['--encoding=UTF8', '--locale=C', '--no-sync'],
    postgresFlags: ['-h', '127.0.0.1'], onLog: () => {},
    onError: (message) => process.stderr.write(String(message)),
  });
  let db;
  let started = false;
  let count = 0;
  const check = (name) => { count++; process.stdout.write(`PASS ${name}\n`); };
  try {
    await cluster.initialise();
    await cluster.start(); started = true;
    // Use the instance's generated credentials, not an existing project connection.
    db = cluster.getPgClient('postgres', '127.0.0.1');
    assert.ok(db instanceof Client || typeof db.query === 'function');
    await db.connect();
    await db.query(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
      $$;
      grant usage on schema auth to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated,anon,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated,anon,service_role;
      grant select on storage.objects to authenticated;
    `);
    // Simulate Supabase's potentially permissive default grants too.
    await db.query(`alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
    const existing = randomUUID();
    await db.query('insert into auth.users(id,email) values ($1,$2)', [existing,'existing@example.invalid']);
    await db.query(fs.readFileSync(path.join(root,'schema.sql'),'utf8'));
    await db.query(fs.readFileSync(path.join(root,'storage.sql'),'utf8'));
    await db.query(fs.readFileSync(path.join(root,'verify.sql'),'utf8'));
    await db.query(fs.readFileSync(path.join(root,'upgrade-multi-storey.sql'),'utf8'));
    await db.query(fs.readFileSync(path.join(root,'upgrade-multi-storey.sql'),'utf8'));
    check('schema/storage SQL and security audit execute successfully');
    assert.equal((await db.query('select count(*)::int n from public.profiles')).rows[0].n,1);
    check('existing Auth users are backfilled');

    const alice = randomUUID(), bob = randomUUID();
    await db.query(`insert into auth.users(id,email,raw_user_meta_data) values
      ($1,'alice@example.invalid','{"full_name":"Alice"}'),
      ($2,'bob@example.invalid','{"full_name":"Bob","role":"admin"}')`,[alice,bob]);
    async function session(role, uid='') {
      await db.query('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
      assert.ok(['postgres','authenticated','anon','service_role'].includes(role));
      await db.query(`set role ${role}`);
    }
    async function rejected(sql, params, pattern) {
      await assert.rejects(db.query(sql,params),pattern);
    }
    await session('authenticated',alice);
    assert.equal((await db.query('select full_name from public.profiles')).rows[0].full_name,'Alice');
    await db.query("update public.profiles set full_name='Alice Homeowner' where id=$1",[alice]);
    const project = (await db.query("insert into public.projects(title) values ('Alice home') returning *")).rows[0];
    assert.equal(project.owner_id,alice);
    assert.equal((await db.query('select revision from public.consultation_drafts')).rows[0].revision,0);
    check('signup profiles, own-name updates, owner defaults and automatic draft creation');
    await rejected('update public.projects set owner_id=$1 where id=$2',[bob,project.id],/permission denied/);
    await rejected("insert into private.administrators(user_id) values ($1)",[alice],/permission denied/);
    await rejected("update public.consultation_drafts set revision=100",[],/permission denied/);
    check('ownership, administrator membership and direct draft writes are protected');

    const answers = JSON.parse(JSON.stringify({ location:'Cape Town',width:20,length:30,
      access:'South',budget:1500000,finish:'Basic',budgetIncludes:'Materials and labour',
      occupants:4,bedrooms:3,bathrooms:2,workFromHome:'No',guests:'Rarely',kitchen:'Open plan',
      style:'Modern',privacy:'No preference',accessibility:'None stated' }));
    await rejected('select public.confirm_design_brief($1,0,true)',[project.id],/Missing required/);
    await db.query('select public.save_consultation_draft($1,0,$2)',[project.id,JSON.stringify(answers)]);
    await rejected('select public.save_consultation_draft($1,0,$2)',[project.id,'{}'],/Stale draft/);
    await rejected('select public.confirm_design_brief($1,1,false)',[project.id],/acknowledgement/);
    await rejected('select public.confirm_design_brief($1,0,true)',[project.id],/Stale draft/);
    const brief = (await db.query('select * from public.confirm_design_brief($1,1,true)',[project.id])).rows[0];
    assert.equal((await db.query('select * from public.confirm_design_brief($1,1,true)',[project.id])).rows[0].id,brief.id);
    check('required answers, acknowledgements, stale saves and confirmations, idempotent brief confirmation');
    await rejected('select public.save_consultation_draft($1,1,$2)',[project.id,JSON.stringify({...answers,storeys:4})],/Storeys/);
    await db.query('select public.save_consultation_draft($1,1,$2)',[project.id,JSON.stringify({...answers,storeys:3})]);
    const multiBrief=(await db.query('select * from public.confirm_design_brief($1,2,true)',[project.id])).rows[0];
    assert.equal(multiBrief.answers.storeys,3);
    check('additive multi-storey upgrade is repeatable, rejects invalid storeys and preserves the confirmed choice');

    await session('authenticated',bob);
    assert.equal((await db.query('select public.my_role() role')).rows[0].role,'homeowner');
    for (const table of ['projects','consultation_drafts','design_briefs'])
      assert.equal((await db.query(`select * from public.${table}`)).rowCount,0);
    assert.equal((await db.query("update public.projects set title='stolen' where id=$1",[project.id])).rowCount,0);
    await rejected('select public.save_consultation_draft($1,1,$2)',[project.id,'{}'],/Active project not found/);
    const otherProject = (await db.query("insert into public.projects(title) values ('Bob home') returning id")).rows[0].id;
    check('second user cannot read, edit or save the first user project; metadata cannot grant admin');

    const pricingInsert = `insert into public.pricing_releases(version,context,basic_rate_per_m2,
      standard_rate_per_m2,premium_rate_per_m2,assumptions,exclusions,effective_on,published_by)
      values ('test-v2','Demo',10000,13000,18000,'Demo','Land',current_date,$1)`;
    await rejected(pricingInsert,[bob],/row-level security/);
    await session('postgres');
    await db.query('insert into private.administrators(user_id) values ($1)',[bob]);
    await session('authenticated',bob);
    assert.equal((await db.query('select public.my_role() role')).rows[0].role,'admin');
    await db.query(pricingInsert,[bob]);
    assert.equal((await db.query('select * from public.projects where id=$1',[project.id])).rowCount,0);
    check('trusted admin membership permits pricing publication without access to other users projects');

    await session('service_role');
    const pricing = (await db.query("select id from public.pricing_releases where version='demo-v1'")).rows[0].id;
    const run = (await db.query(`insert into public.generation_runs(project_id,brief_id,pricing_release_id,request_key,generator_version)
      values ($1,$2,$3,$4,'layout-v2') returning id`,[project.id,brief.id,pricing,randomUUID()])).rows[0].id;
    await rejected(`insert into public.generation_runs(project_id,brief_id,pricing_release_id,request_key,generator_version)
      values ($1,$2,$3,$4,'layout-v2')`,[otherProject,brief.id,pricing,randomUUID()],/foreign key/);
    await rejected("update public.design_briefs set budget=1 where id=$1",[brief.id],/Immutable snapshot/);
    const conceptId = randomUUID();
    async function saveConcept(total, incomplete=false) {
      await db.query('begin');
      try {
        await db.query(`insert into public.house_concepts(id,project_id,brief_id,generation_run_id,pricing_release_id,
          version,title,architectural_style,bedrooms,bathrooms,width_m,depth_m,floor_area_m2,geometry,validation,fits_plot,within_budget)
          values ($1,$2,$3,$4,$5,1,'Family home','Modern',3,2,8.8,15.2,133.76,
          '{"rooms":[],"doors":[],"windows":[]}','{}',true,true)`,[conceptId,project.id,brief.id,run,pricing]);
        if (!incomplete) {
          const estimate = (await db.query(`insert into public.cost_estimates(concept_id,pricing_release_id,finish_level,
            floor_area_m2,rate_per_m2,budget_snapshot,total,assumptions,exclusions)
            values ($1,$2,'basic',133.76,9500,1500000,1270720,'Demo','Land') returning id`,[conceptId,pricing])).rows[0].id;
          await db.query(`insert into public.cost_estimate_lines(estimate_id,category,description,amount) values
            ($1,'structure','Structure',$2),($1,'finishes','Finishes',317680),($1,'services','Services',190608),
            ($1,'professional_fees','Fees',63536),($1,'contingency','Contingency',127072)`,[estimate,total-698896]);
        }
        await db.query('commit');
      } catch (error) { await db.query('rollback'); throw error; }
    }
    await assert.rejects(saveConcept(1270720,true),/same transaction/);
    await assert.rejects(saveConcept(1270719),/summing to total/);
    await saveConcept(1270720);
    check('cross-project references and snapshot edits rejected; concept/estimate publication atomic; cost sums enforced');
    await rejected("update public.pricing_releases set basic_rate_per_m2=1 where id=$1",[pricing],/Immutable snapshot/);
    await rejected(`insert into public.cost_estimates(concept_id,pricing_release_id,finish_level,floor_area_m2,
      rate_per_m2,budget_snapshot,total,assumptions,exclusions)
      values ($1,$2,'basic',133.76,1,1500000,134,'Demo','Land')`,[conceptId,pricing],/Estimate must match/);
    await db.query(`insert into public.concept_assets(concept_id,kind,storage_path,alt_text)
      values ($1,'front','alice/front.webp','Front view')`,[conceptId]);
    await db.query(`insert into public.concept_exports(concept_id,format,status,storage_path,completed_at)
      values ($1,'svg','ready','alice/plan.svg',now())`,[conceptId]);
    await session('postgres');
    await db.query("insert into storage.objects(bucket_id,name) values ('concept-assets','alice/front.webp'),('concept-assets','unregistered.webp'),('concept-exports','alice/plan.svg')");
    await session('authenticated',alice);
    for (const table of ['house_concepts','cost_estimates','concept_assets','concept_exports'])
      assert.equal((await db.query(`select * from public.${table}`)).rowCount,1);
    assert.equal((await db.query('select * from public.cost_estimate_lines')).rowCount,5);
    assert.equal((await db.query('select * from storage.objects')).rowCount,2);
    await db.query('insert into public.project_selections(project_id,concept_id) values ($1,$2)',[project.id,conceptId]);
    await db.query("update public.projects set status='archived' where id=$1",[project.id]);
    await rejected('select public.save_consultation_draft($1,1,$2)',[project.id,'{}'],/Active project not found/);
    check('owner reads the complete house page, selects a concept, downloads only registered files; archive blocks draft saves');
    await session('authenticated',bob);
    for (const table of ['house_concepts','cost_estimates','cost_estimate_lines','concept_assets','concept_exports'])
      assert.equal((await db.query(`select * from public.${table}`)).rowCount,0);
    assert.equal((await db.query('select * from storage.objects')).rowCount,0);
    await rejected('insert into public.project_selections(project_id,concept_id) values ($1,$2)',[otherProject,conceptId],/foreign key/);
    check('non-owner cannot read design children, download files, or select a concept from another project');
    await session('anon');
    await rejected('select * from public.projects',[],/permission denied/);
    await rejected('select public.save_consultation_draft($1,1,$2)',[project.id,'{}'],/permission denied/);
    check('anonymous database reads and RPC execution denied');
    await session('postgres');
    await db.query('delete from auth.users where id=$1',[alice]);
    assert.equal((await db.query('select * from public.projects where id=$1',[project.id])).rowCount,0);
    assert.equal((await db.query('select * from public.house_concepts')).rowCount,0);
    await db.query('delete from auth.users where id=$1',[bob]);
    check('Auth user deletion cascades relational data without breaking immutable pricing history');
    process.stdout.write(`\n${count} integration checks passed. Local cluster: ${directory}\n`);
  } finally {
    if (db) await db.end();
    if (started) await cluster.stop();
  }
}
main().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode=1; });
