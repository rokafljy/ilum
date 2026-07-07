-- ─────────────────────────────────────────────
-- 0005: 문서 워크플로우 — 상태 전이 보호, 승인 RPC, 증빙 저장소
-- ─────────────────────────────────────────────

-- 상태 전이 가드: 팀원은 draft↔submitted만, 결정(승인/반려/확인)은 기관·운영사만
create or replace function documents_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_is_org boolean;
begin
  v_is_org := is_org_member(old.org_id) or is_super_admin();

  if new.status is distinct from old.status then
    if v_is_org then
      null; -- 기관: 모든 전이 허용
    elsif old.status = 'draft' and new.status = 'submitted' then
      new.submitted_at := now();
    elsif old.status = 'submitted' and new.status = 'draft' then
      null; -- 제출 회수
    else
      raise exception 'status transition % -> % not allowed', old.status, new.status;
    end if;
  end if;

  -- 결정 메타는 기관만 변경 가능
  if (new.decided_by is distinct from old.decided_by
      or new.decided_at is distinct from old.decided_at) and not v_is_org then
    raise exception 'decision fields are managed by the organization';
  end if;

  return new;
end $$;

drop trigger if exists documents_guard on documents;
create trigger documents_guard before update on documents
  for each row execute function documents_guard();

-- 승인/반려/확인 RPC — 감사로그 + 팀 알림까지 원자 처리
create or replace function decide_document(p_doc uuid, p_decision text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_doc documents;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if p_decision not in ('approved','rejected','confirmed') then
    return jsonb_build_object('ok', false, 'error', 'bad_decision');
  end if;

  select * into v_doc from documents where id = p_doc;
  if v_doc.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not (is_org_member(v_doc.org_id) or is_super_admin()) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if v_doc.status <> 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  update documents set
    status = p_decision,
    reject_note = case when p_decision = 'rejected' then p_note else null end,
    decided_at = now(),
    decided_by = auth.uid()
  where id = p_doc;

  insert into audit_logs (org_id, actor_id, action, target_type, target_id, detail)
  values (v_doc.org_id, auth.uid(), 'document.' || p_decision, v_doc.doc_type, p_doc::text,
          jsonb_build_object('title', v_doc.title, 'note', p_note));

  insert into notifications (org_id, program_id, team_id, type, message)
  values (v_doc.org_id, v_doc.program_id, v_doc.team_id,
          case when p_decision = 'rejected' then 'error' else 'success' end,
          case p_decision
            when 'approved' then v_doc.title || ' 문서가 승인됐어요.'
            when 'confirmed' then v_doc.title || ' 문서가 확인됐어요.'
            else v_doc.title || ' 문서가 반려됐어요. 사유를 확인해 주세요.'
          end);

  return jsonb_build_object('ok', true);
end $$;

-- 증빙 저장소 버킷 (영수증·사진)
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

drop policy if exists evidence_read on storage.objects;
create policy evidence_read on storage.objects for select
  using (bucket_id = 'evidence');

drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects for insert
  with check (bucket_id = 'evidence' and auth.uid() is not null);
