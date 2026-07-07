-- ─────────────────────────────────────────────
-- 일움 초기 스키마 (0001)
-- 원칙:
--  1) 모든 테넌트 데이터 행에 org_id — RLS로 기관 간 격리
--  2) 양식류는 documents 통합 테이블 (워크플로우 컬럼 + jsonb body)
--  3) row 단위 업데이트 — 클라이언트 병합/_u 체계 없음
-- ─────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── 사용자 ──
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table super_admins (
  user_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── 테넌트: 기관 ──
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active','suspended')),
  checker_name text not null default '',
  checker_stamp_url text not null default '',
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('admin','staff')), -- 기관 관리자 / 담당자
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','staff')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── 사업 (규칙 설정의 귀속점) ──
create table programs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  year int,
  type text not null default '프로젝트형',
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('draft','active','archived')),
  -- settings 예: { "teamBudget":1800000, "mentoringTotal":8, "expRules":{...}, "stages":[...], "evidenceReq":{...}, "autoApprove":{"enabled":false,"limit":0} }
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  start_date date,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  name text not null,
  status text not null default 'pending' check (status in ('pending','active','rejected','removed')),
  invite_code text not null unique default upper(encode(gen_random_bytes(4), 'hex')),
  created_at timestamptz not null default now()
);

create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('leader','member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ── 문서 통합 (품의서·회의록·멘토링일지·지출결과서·검수확인서·출장보고서·강의결과보고서) ──
create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  doc_type text not null check (doc_type in
    ('request','meeting','mentoring','expense_report','inspection','business_trip','lecture_report')),
  status text not null default 'draft' check (status in
    ('draft','submitted','approved','rejected','confirmed')),
  session int,                                   -- 회차
  doc_date date,                                 -- 문서 기준일 (회의일·지출일 등)
  title text not null default '',
  body jsonb not null default '{}',              -- 양식 본문: 항목·참석자·사진 URL 등
  parent_id uuid references documents(id) on delete set null,  -- 하위양식 → 지출결과서
  reject_note text,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_org_idx on documents (org_id, program_id, doc_type, status);
create index documents_team_idx on documents (team_id, doc_type);
create index documents_parent_idx on documents (parent_id);

-- ── 소통 ──
create table qna (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  question text not null,
  asked_by uuid references profiles(id),
  answer text,
  answered_by uuid references profiles(id),
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  content text not null,
  company_id uuid references companies(id) on delete cascade,  -- null = 사업 전체
  priority text not null default 'normal' check (priority in ('normal','important')),
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,   -- null = 전체
  team_id uuid references teams(id) on delete cascade,          -- 팀 자체 일정
  type text not null default 'etc',
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  location text not null default '',
  memo text not null default '',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid references programs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,          -- null = 사업/기관 전체
  type text not null default 'info' check (type in ('success','error','info')),
  message text not null,
  created_at timestamptz not null default now()
);

create table notification_reads (
  notification_id uuid not null references notifications(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- ── 통장대조 ──
create table bank_statements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  file_name text not null default '',
  period text not null default '',
  column_map jsonb not null default '{}',
  transactions jsonb not null default '[]',
  result jsonb not null default '{}',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ── 감사로그 ──
create table audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid references orgs(id) on delete set null,
  actor_id uuid references profiles(id),
  action text not null,            -- ex) document.approve, team.reject
  target_type text not null default '',
  target_id text not null default '',
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on audit_logs (org_id, created_at desc);

-- ── updated_at 자동 갱신 ──
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger documents_updated_at before update on documents
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────

-- 헬퍼 (security definer — RLS 재귀 방지)
create function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from super_admins where user_id = auth.uid());
$$;

create function is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where org_id = p_org and user_id = auth.uid());
$$;

create function my_team_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select team_id from team_members where user_id = auth.uid();
$$;

create function my_program_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select t.program_id from team_members tm join teams t on t.id = tm.team_id
  where tm.user_id = auth.uid();
$$;

-- profiles: 본인 + 슈퍼관리자. (동일 기관/팀 조회는 뷰로 추후 제공)
alter table profiles enable row level security;
create policy profiles_self on profiles for all
  using (id = auth.uid() or is_super_admin())
  with check (id = auth.uid() or is_super_admin());

alter table super_admins enable row level security;
create policy super_admins_read on super_admins for select using (user_id = auth.uid());

-- orgs: 슈퍼관리자 전체, 기관 구성원은 자기 기관 조회/수정
alter table orgs enable row level security;
create policy orgs_super on orgs for all using (is_super_admin()) with check (is_super_admin());
create policy orgs_member_read on orgs for select using (is_org_member(id));
create policy orgs_member_update on orgs for update using (is_org_member(id)) with check (is_org_member(id));

alter table org_members enable row level security;
create policy org_members_super on org_members for all using (is_super_admin()) with check (is_super_admin());
create policy org_members_read on org_members for select using (is_org_member(org_id));
create policy org_members_manage on org_members for all
  using (exists (select 1 from org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'admin'))
  with check (exists (select 1 from org_members m where m.org_id = org_members.org_id and m.user_id = auth.uid() and m.role = 'admin'));

alter table org_invites enable row level security;
create policy org_invites_org on org_invites for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());

-- 기관 데이터 공통 패턴: 기관 구성원 전체 권한 + 슈퍼관리자
-- programs / companies
alter table programs enable row level security;
create policy programs_org on programs for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy programs_team_read on programs for select
  using (id in (select my_program_ids()));

alter table companies enable row level security;
create policy companies_org on companies for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy companies_team_read on companies for select
  using (program_id in (select my_program_ids()));

-- teams: 기관 전체 / 팀원은 자기 팀 조회
alter table teams enable row level security;
create policy teams_org on teams for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy teams_member_read on teams for select
  using (id in (select my_team_ids()));

alter table team_members enable row level security;
create policy team_members_org on team_members for all
  using (exists (select 1 from teams t where t.id = team_id and (is_org_member(t.org_id) or is_super_admin())))
  with check (exists (select 1 from teams t where t.id = team_id and (is_org_member(t.org_id) or is_super_admin())));
create policy team_members_self_read on team_members for select
  using (team_id in (select my_team_ids()));

-- documents: 기관 전체 / 팀원은 자기 팀 문서 CRUD (승인 결정 컬럼 보호는 API 계층+감사로그로 보완)
alter table documents enable row level security;
create policy documents_org on documents for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy documents_team on documents for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

-- qna: 기관 전체 / 팀원은 자기 팀
alter table qna enable row level security;
create policy qna_org on qna for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy qna_team on qna for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

-- notices/schedules: 기관 관리, 팀원은 자기 사업 것 조회
alter table notices enable row level security;
create policy notices_org on notices for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy notices_team_read on notices for select
  using (program_id in (select my_program_ids()));

alter table schedules enable row level security;
create policy schedules_org on schedules for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy schedules_team_read on schedules for select
  using (program_id in (select my_program_ids()));
create policy schedules_team_own on schedules for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

-- notifications: 기관 관리 / 팀원은 자기 팀·사업 전체분 조회
alter table notifications enable row level security;
create policy notifications_org on notifications for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy notifications_team_read on notifications for select
  using (team_id in (select my_team_ids())
         or (team_id is null and program_id in (select my_program_ids())));

alter table notification_reads enable row level security;
create policy notification_reads_self on notification_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- bank_statements: 기관 전체 / 팀원은 자기 팀
alter table bank_statements enable row level security;
create policy bank_statements_org on bank_statements for all
  using (is_org_member(org_id) or is_super_admin())
  with check (is_org_member(org_id) or is_super_admin());
create policy bank_statements_team on bank_statements for all
  using (team_id in (select my_team_ids()))
  with check (team_id in (select my_team_ids()));

-- audit_logs: 기관 구성원 조회, 삽입은 인증 사용자 (수정·삭제 불가)
alter table audit_logs enable row level security;
create policy audit_logs_read on audit_logs for select
  using (is_org_member(org_id) or is_super_admin());
create policy audit_logs_insert on audit_logs for insert
  with check (auth.uid() is not null);

-- 신규 가입 시 profiles 자동 생성
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
