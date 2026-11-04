-- Kiểm tra bằng database thật: migration 20261104090000_task_links.sql (Link kết quả của công việc).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "task_links: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  owner_employee uuid; board_a uuid; task_uuid uuid; link_uuid uuid; i int;
begin
  insert into public.departments (id, name) values (department_a, '[TEST] phòng A ' || department_a);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-tl-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (owner_user, 'test-tl-1-' || owner_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = owner_user returning e.id into owner_employee;
  perform public.crm_create_dashboard(admin_user, department_a, null, null);
  select b.id into board_a from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_a;
  task_uuid := public.crm_create_task(admin_user, board_a, '[TEST] có link', null, owner_employee,
    null, null, null, '{}', null);

  -- Thêm link có tên và không tên; thẻ board đếm đúng; activity ghi tên link.
  link_uuid := public.crm_add_task_link(admin_user, task_uuid, ' https://onedrive.live.com/x ', 'Báo cáo');
  perform public.crm_add_task_link(admin_user, task_uuid, 'https://docs.example.test/a.docx');
  if (select link_count from public.task_cards where id = task_uuid) <> 2 then
    raise exception 'link_count sai';
  end if;
  if (select url from public.task_links where id = link_uuid) <> 'https://onedrive.live.com/x' then
    raise exception 'Link chưa được bỏ khoảng trắng';
  end if;
  if not exists (select 1 from public.task_activities where task_id = task_uuid
      and action = 'attachment_added' and to_value ->> 'linkTitle' = 'Báo cáo') then
    raise exception 'Activity thêm link thiếu';
  end if;

  -- Link không phải http(s) bị chặn.
  begin
    perform public.crm_add_task_link(admin_user, task_uuid, 'javascript:alert(1)');
    raise exception 'Link javascript: phải bị chặn';
  exception when check_violation then null;
  end;

  -- Xoá mềm: ẩn khỏi đếm, có activity; xoá lần hai báo không tìm thấy.
  perform public.crm_remove_task_link(admin_user, task_uuid, link_uuid);
  if (select link_count from public.task_cards where id = task_uuid) <> 1 then
    raise exception 'Xoá link chưa giảm link_count';
  end if;
  if not exists (select 1 from public.task_links where id = link_uuid and deleted_at is not null) then
    raise exception 'Xoá link phải là xoá mềm';
  end if;
  begin
    perform public.crm_remove_task_link(admin_user, task_uuid, link_uuid);
    raise exception 'Xoá link đã xoá phải bị chặn';
  exception when others then
    if sqlerrm <> 'TASK_LINK_NOT_FOUND' then raise; end if;
  end;

  -- Tối đa 10 link chưa xoá.
  for i in 2..10 loop
    perform public.crm_add_task_link(admin_user, task_uuid, 'https://example.test/' || i);
  end loop;
  begin
    perform public.crm_add_task_link(admin_user, task_uuid, 'https://example.test/11');
    raise exception 'Link thứ 11 phải bị chặn';
  exception when others then
    if sqlerrm <> 'TASK_LINK_LIMIT' then raise; end if;
  end;

  -- Phòng đã xoá → Dashboard chỉ đọc, không thêm link được.
  update public.departments set archived_at = now() where id = department_a;
  begin
    perform public.crm_remove_task_link(admin_user, task_uuid,
      (select id from public.task_links where task_id = task_uuid and deleted_at is null limit 1));
    raise exception 'Board chỉ đọc phải chặn xoá link';
  exception when others then
    if sqlerrm <> 'DASHBOARD_READ_ONLY' then raise; end if;
  end;

  if has_function_privilege('authenticated', 'public.crm_add_task_link(uuid, uuid, text, text)', 'execute') then
    raise exception 'authenticated không được gọi crm_add_task_link';
  end if;
  if has_table_privilege('authenticated', 'public.task_links', 'select') then
    raise exception 'authenticated không được đọc task_links';
  end if;

  raise notice 'task_links: đạt';
end;
$$;

rollback;
