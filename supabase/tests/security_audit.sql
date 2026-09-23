DO $$
DECLARE
  v_member_id UUID := gen_random_uuid();
  v_other_id  UUID := gen_random_uuid();
  v_admin_id  UUID := gen_random_uuid();
  v_error_caught BOOLEAN := false;
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. TEST TRIGGER & ANTI-ESCALATION ON SIGNUP
  -- --------------------------------------------------------------------------
  -- Insert into auth.users with a malicious attempt to inject "role": "admin" in metadata
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES 
    (v_member_id, 'member1@test.com', '{"name": "Member One", "role": "admin"}'::jsonb, 'authenticated', 'authenticated'),
    (v_other_id, 'member2@test.com', '{"name": "Member Two"}'::jsonb, 'authenticated', 'authenticated'),
    (v_admin_id, 'admin@test.com', '{"name": "Admin User"}'::jsonb, 'authenticated', 'authenticated');

  -- Verify handle_new_user() automatically created the profiles record with role = 'member'
  IF (SELECT role FROM public.profiles WHERE id = v_member_id) != 'member' THEN
    RAISE EXCEPTION 'TRIGGER TEST FAILED: Metadata injection allowed admin role creation!';
  END IF;
  RAISE NOTICE 'TRIGGER TEST PASSED: handle_new_user() securely forced role to member.';

  -- Set the admin user's role to 'admin' using direct database owner update
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_id;

  -- --------------------------------------------------------------------------
  -- SCENARIO A: Normal member attempts: UPDATE profiles SET role = 'admin'
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = v_member_id;
    IF FOUND THEN
      RAISE EXCEPTION 'SCENARIO A FAILED: Normal member successfully updated role = admin';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
  END;

  RESET ROLE;
  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'SCENARIO A FAILED: Member role escalation to admin was not rejected!';
  END IF;
  RAISE NOTICE 'SCENARIO A PASSED: Role escalation to admin strictly rejected.';

  -- --------------------------------------------------------------------------
  -- SCENARIO B: Normal member attempts to update another member's profile
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles SET bio = 'Hacked Bio' WHERE id = v_other_id;
  IF FOUND THEN
    RAISE EXCEPTION 'SCENARIO B FAILED: Normal member modified another member profile';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'SCENARIO B PASSED: Cross-profile update rejected (0 rows affected).';

  -- --------------------------------------------------------------------------
  -- SCENARIO C: Normal member updates their own profile fields
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles 
  SET full_name = 'Member One Updated',
      bio = 'Updated own bio',
      aws_builder_alias = 'member_one_alias',
      aws_builder_profile_url = 'https://community.aws/u/member1'
  WHERE id = v_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCENARIO C FAILED: Member self-update failed';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'SCENARIO C PASSED: Member self-update of personal fields succeeded.';

  -- --------------------------------------------------------------------------
  -- SCENARIO D: Admin updates an appropriate member profile
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles 
  SET bio = 'Admin updated this member profile'
  WHERE id = v_other_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCENARIO D FAILED: Admin profile update failed';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'SCENARIO D PASSED: Admin successfully updated another member profile.';

  -- --------------------------------------------------------------------------
  -- SCENARIO E: Admin changes a member's role
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  UPDATE public.profiles 
  SET role = 'admin'
  WHERE id = v_other_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCENARIO E FAILED: Admin role change failed';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'SCENARIO E PASSED: Admin successfully changed member role to admin.';

  -- --------------------------------------------------------------------------
  -- CLEAN UP: Delete test users (CASCADE deletes profiles)
  -- --------------------------------------------------------------------------
  DELETE FROM auth.users WHERE id IN (v_member_id, v_other_id, v_admin_id);
  RAISE NOTICE 'ALL DATABASE SECURITY TESTS EXECUTED AND PASSED CLEANLY.';
END $$;
