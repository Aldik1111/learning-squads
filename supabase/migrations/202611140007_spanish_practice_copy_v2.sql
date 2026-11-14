-- Spanish v2 clarifies the owner's approved accumulation rule; quiz unchanged.
-- Retain version1 for historical saved attempts.
insert into public.ls_content_versions(module_id,content_version,quiz)
select module_id,2,quiz from public.ls_content_versions
where module_id='spanish-first-conversation' and content_version=1;
