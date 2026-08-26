alter table documents add column if not exists label text;
alter table documents add column if not exists onedrive_item_id text;

create index if not exists documents_label_idx on documents (project_id, label) where label is not null;
