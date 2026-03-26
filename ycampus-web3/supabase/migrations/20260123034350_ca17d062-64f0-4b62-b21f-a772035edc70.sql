-- Create profiles row(s) for demo auth users if missing
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)) as full_name, 'student'::public.app_role
from auth.users u
where u.email = 'student@test.com'
  and not exists (select 1 from public.profiles p where p.id = u.id);

-- Re-assign legacy community content (created before real auth) to the demo student account
with demo as (
  select id as user_id from auth.users where email = 'student@test.com' limit 1
)
update public.community_posts p
set author_id = demo.user_id,
    updated_at = now()
from demo
where p.author_id <> demo.user_id
  and not exists (select 1 from auth.users u where u.id = p.author_id);

with demo as (
  select id as user_id from auth.users where email = 'student@test.com' limit 1
)
update public.community_comments c
set author_id = demo.user_id,
    updated_at = now()
from demo
where c.author_id <> demo.user_id
  and not exists (select 1 from auth.users u where u.id = c.author_id);
