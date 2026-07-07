-- 0004: profiles 조회 범위 확장
-- 기존: 본인+슈퍼관리자만 → 팀 동료·기관 담당자가 이름을 볼 수 없음 (서류·승인·명부에 필수)
-- 조회 허용: 본인 / 슈퍼관리자 / 같은 팀 / 같은 기관 구성원 / 내 기관 소속 팀의 팀원 / 내가 속한 팀의 기관 담당자

create or replace function can_view_profile(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_id = auth.uid()
    or is_super_admin()
    -- 같은 팀 동료
    or exists (
      select 1 from team_members a join team_members b on a.team_id = b.team_id
      where a.user_id = auth.uid() and b.user_id = p_id
    )
    -- 같은 기관 구성원끼리
    or exists (
      select 1 from org_members a join org_members b on a.org_id = b.org_id
      where a.user_id = auth.uid() and b.user_id = p_id
    )
    -- 기관 담당자 → 소속 사업 팀원
    or exists (
      select 1 from org_members om
      join teams t on t.org_id = om.org_id
      join team_members tm on tm.team_id = t.id
      where om.user_id = auth.uid() and tm.user_id = p_id
    )
    -- 팀원 → 자기 기관의 담당자
    or exists (
      select 1 from team_members tm
      join teams t on t.id = tm.team_id
      join org_members om on om.org_id = t.org_id
      where tm.user_id = auth.uid() and om.user_id = p_id
    );
$$;

drop policy if exists profiles_self on profiles;

create policy profiles_read on profiles for select
  using (can_view_profile(id));

create policy profiles_write on profiles for update
  using (id = auth.uid() or is_super_admin())
  with check (id = auth.uid() or is_super_admin());

create policy profiles_insert on profiles for insert
  with check (id = auth.uid() or is_super_admin());
