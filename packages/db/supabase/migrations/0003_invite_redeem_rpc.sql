-- Atomic invite-code redemption via a single Postgres function.
-- Eliminates the race condition in the previous read-insert-update sequence
-- by locking the invite_codes row with SELECT … FOR UPDATE inside one transaction.

create or replace function redeem_invite_code(
  p_code_hash text,
  p_user_id   uuid
)
returns table (
  ok             boolean,
  reason         text,
  invite_code_id uuid
)
language plpgsql
security definer
-- Prevent search-path hijacking: pin to public + pg_temp.
set search_path = public, pg_temp
as $$
declare
  v_invite_code invite_codes%rowtype;
  v_redemption_id uuid;
begin
  -- ── 1. Lock the invite_codes row ──────────────────────────────────────────
  select *
    into v_invite_code
    from invite_codes
   where code_hash = p_code_hash
     for update;

  -- ── 2. Validate ──────────────────────────────────────────────────────────
  if v_invite_code.id is null then
    return query select false, 'INVITE_CODE_NOT_FOUND'::text, null::uuid;
    return;
  end if;

  if v_invite_code.status <> 'active' then
    return query select false, 'INVITE_CODE_INACTIVE'::text, v_invite_code.id;
    return;
  end if;

  if v_invite_code.expires_at is not null
     and v_invite_code.expires_at <= now() then
    return query select false, 'INVITE_CODE_EXPIRED'::text, v_invite_code.id;
    return;
  end if;

  if v_invite_code.used_count >= v_invite_code.max_uses then
    return query select false, 'INVITE_CODE_EXHAUSTED'::text, v_invite_code.id;
    return;
  end if;

  if exists (
    select 1
      from invite_redemptions as ir
     where ir.invite_code_id = v_invite_code.id
       and ir.user_id = p_user_id
  ) then
    return query select false, 'INVITE_CODE_ALREADY_REDEEMED'::text, v_invite_code.id;
    return;
  end if;

  -- ── 3. Insert redemption ─────────────────────────────────────────────────
  insert into invite_redemptions (invite_code_id, user_id)
  values (v_invite_code.id, p_user_id)
  returning id into v_redemption_id;

  -- ── 4. Increment used_count ──────────────────────────────────────────────
  update invite_codes as ic
     set used_count = ic.used_count + 1
   where ic.id = v_invite_code.id;

  -- ── 5. Mark exhausted if this was the last use ───────────────────────────
  if v_invite_code.used_count + 1 >= v_invite_code.max_uses then
    update invite_codes as ic
       set status = 'exhausted'
     where ic.id = v_invite_code.id;
  end if;

  -- ── 6. Activate user profile ─────────────────────────────────────────────
  update user_profiles as up
     set access_status = 'active'
   where up.user_id = p_user_id;

  -- ── 7. Return success ────────────────────────────────────────────────────
  return query select true, null::text, v_invite_code.id;
end;
$$;
