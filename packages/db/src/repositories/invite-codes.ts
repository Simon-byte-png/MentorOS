import type {
  InviteCode,
  RedeemInviteCodeByHashInput,
  RedeemInviteCodeInput,
  RedeemInviteCodeResult,
} from "../types";
import { DbRepositoryError } from "../errors";
import { getRepositoryDbClient, wrapRepositoryError } from "./shared";

export async function getInviteCodeByHash(codeHash: string): Promise<InviteCode | null> {
  const operation = "getInviteCodeByHash";
  try {
    return await getRepositoryDbClient().maybeSingle<InviteCode>("invite_codes", {
      filters: [{ column: "code_hash", operator: "eq", value: codeHash }],
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

/**
 * Recommended interface: redeems an invite code by its hash via a Postgres RPC
 * transaction. The RPC handles locking, validation, redemption insert,
 * used_count increment, and user profile activation atomically.
 */
export async function redeemInviteCodeByHash(
  input: RedeemInviteCodeByHashInput,
): Promise<RedeemInviteCodeResult> {
  const operation = "redeemInviteCodeByHash";
  try {
    const result = await getRepositoryDbClient().rpc<RedeemInviteCodeResult[]>(
      "redeem_invite_code",
      { p_code_hash: input.code_hash, p_user_id: input.user_id },
    );

    const row = Array.isArray(result) ? result[0] : result;
    if (!row) {
      throw new DbRepositoryError("RPC redeem_invite_code returned no result.", {
        operation,
      });
    }

    return row;
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

/**
 * Compatibility wrapper: accepts invite_code_id, looks up the code_hash,
 * then delegates to redeemInviteCodeByHash.
 *
 * TODO: apps/web should migrate to redeemInviteCodeByHash(code_hash, user_id)
 * to avoid the extra lookup query. See apps/web/app/api/invite/redeem/route.ts.
 */
export async function redeemInviteCode(
  input: RedeemInviteCodeInput,
): Promise<RedeemInviteCodeResult> {
  const operation = "redeemInviteCode";
  try {
    const inviteCode = await getRepositoryDbClient().maybeSingle<InviteCode>(
      "invite_codes",
      {
        filters: [{ column: "id", operator: "eq", value: input.invite_code_id }],
      },
    );

    if (inviteCode === null) {
      throw new DbRepositoryError("Invite code was not found.", {
        operation,
        code: "INVITE_CODE_NOT_FOUND",
      });
    }

    return await redeemInviteCodeByHash({
      code_hash: inviteCode.code_hash,
      user_id: input.user_id,
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export const inviteCodesRepository = {
  getInviteCodeByHash,
  redeemInviteCodeByHash,
  redeemInviteCode,
};
