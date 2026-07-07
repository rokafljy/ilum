-- ─────────────────────────────────────────────
-- 0002: M2 온보딩 — 사업 참여코드, 초대 수락·팀 등록 RPC
-- RPC는 security definer로 RLS를 우회하되 내부에서 권한·상태를 직접 검증
-- ─────────────────────────────────────────────

-- 사업 참여코드 (팀장이 팀 등록 시 사용)
alter table programs
  add column if not exists join_code text not null unique
  default upper(encode(gen_random_bytes(4), 'hex'));

-- 초대 정보 공개 조회 (로그인 전에도 기관명·역할 확인 가능)
create or replace function get_invite_info(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v record;
begin
  select i.*, o.name as org_name into v
  from org_invites i join orgs o on o.id = i.org_id
  where i.token = p_token;
  if v.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.accepted_at is not null then return jsonb_build_object('ok', false, 'error', 'already_used'); end if;
  if v.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  return jsonb_build_object('ok', true, 'org_name', v.org_name, 'role', v.role, 'email', v.email);
end $$;

-- 초대 수락 → 기관 구성원 등록
create or replace function accept_org_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select * into v from org_invites where token = p_token;
  if v.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v.accepted_at is not null then return jsonb_build_object('ok', false, 'error', 'already_used'); end if;
  if v.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;

  insert into org_members (org_id, user_id, role)
  values (v.org_id, auth.uid(), v.role)
  on conflict (org_id, user_id) do update set role = excluded.role;

  update org_invites set accepted_at = now() where id = v.id;

  insert into audit_logs (org_id, actor_id, action, target_type, target_id)
  values (v.org_id, auth.uid(), 'org_invite.accept', 'org_invite', v.id::text);

  return jsonb_build_object('ok', true, 'org_id', v.org_id);
end $$;

-- 팀 등록 (팀장) — 사업 참여코드로 신청, 승인 대기 상태로 생성
create or replace function register_team(p_join_code text, p_team_name text, p_company_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_program record; v_company_id uuid; v_team_id uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if coalesce(trim(p_team_name), '') = '' then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;

  select * into v_program from programs where join_code = upper(trim(p_join_code)) and status = 'active';
  if v_program.id is null then return jsonb_build_object('ok', false, 'error', 'program_not_found'); end if;

  -- 같은 사업에 이미 소속된 사용자면 중복 등록 차단
  if exists (
    select 1 from team_members tm join teams t on t.id = tm.team_id
    where tm.user_id = auth.uid() and t.program_id = v_program.id and t.status <> 'removed'
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_in_program');
  end if;

  if coalesce(trim(p_company_name), '') <> '' then
    select id into v_company_id from companies
    where program_id = v_program.id and name = trim(p_company_name);
  end if;

  insert into teams (org_id, program_id, company_id, name, status)
  values (v_program.org_id, v_program.id, v_company_id, trim(p_team_name), 'pending')
  returning id into v_team_id;

  insert into team_members (team_id, user_id, role) values (v_team_id, auth.uid(), 'leader');

  insert into audit_logs (org_id, actor_id, action, target_type, target_id, detail)
  values (v_program.org_id, auth.uid(), 'team.register', 'team', v_team_id::text,
          jsonb_build_object('team_name', trim(p_team_name)));

  return jsonb_build_object('ok', true, 'team_id', v_team_id, 'program_name', v_program.name);
end $$;

-- 팀 합류 (팀원) — 팀 초대코드
create or replace function join_team_with_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_team record;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  select * into v_team from teams where invite_code = upper(trim(p_code)) and status in ('pending','active');
  if v_team.id is null then return jsonb_build_object('ok', false, 'error', 'team_not_found'); end if;

  insert into team_members (team_id, user_id, role)
  values (v_team.id, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing;

  insert into audit_logs (org_id, actor_id, action, target_type, target_id)
  values (v_team.org_id, auth.uid(), 'team.join', 'team', v_team.id::text);

  return jsonb_build_object('ok', true, 'team_id', v_team.id, 'team_name', v_team.name);
end $$;
