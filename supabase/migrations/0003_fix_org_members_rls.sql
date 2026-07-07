-- 0003: org_members RLS 재귀 수정
-- org_members_manage 정책이 org_members를 직접 서브쿼리 → infinite recursion(42P17).
-- security definer 헬퍼로 교체.

create or replace function is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members
    where org_id = p_org and user_id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists org_members_manage on org_members;
create policy org_members_manage on org_members for all
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));
