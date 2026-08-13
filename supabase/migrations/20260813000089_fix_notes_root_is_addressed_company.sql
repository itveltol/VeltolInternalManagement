-- Fixes: publishing a company-wide announcement (visibility = 'company',
-- no project/team/etc anchor — the whole point of "company" scope) violated
-- notes_root_is_addressed, which required exactly one anchor on every
-- non-personal root note. A company-wide note is legitimately anchor-less;
-- "company" is itself the addressing. Allow 0 anchors in that case.
alter table public.notes drop constraint notes_root_is_addressed;

alter table public.notes add constraint notes_root_is_addressed
  check (parent_id is not null or (
    ( case when project_id       is not null then 1 else 0 end
    + case when situation_id     is not null then 1 else 0 end
    + case when client_id        is not null then 1 else 0 end
    + case when subcontractor_id is not null then 1 else 0 end
    + case when supplier_id      is not null then 1 else 0 end
    + case when document_id      is not null then 1 else 0 end
    + case when team_id          is not null then 1 else 0 end
    ) = case
          when is_personal then 0
          when visibility = 'company' then 0
          else 1
        end
  ));
