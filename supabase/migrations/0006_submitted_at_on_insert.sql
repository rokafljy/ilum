-- 0006: 제출 상태로 바로 생성되는 문서의 submitted_at 보정
create or replace function documents_before_insert() returns trigger
language plpgsql as $$
begin
  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  return new;
end $$;

drop trigger if exists documents_before_insert on documents;
create trigger documents_before_insert before insert on documents
  for each row execute function documents_before_insert();

-- 기존 데이터 보정
update documents set submitted_at = created_at
where status in ('submitted','approved','rejected','confirmed') and submitted_at is null;
