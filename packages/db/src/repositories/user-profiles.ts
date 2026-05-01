import type { AccessStatus, CreateUserProfileInput, UserProfile } from "../types";
import { getRepositoryDbClient, wrapRepositoryError, toDbValues } from "./shared";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const operation = "getUserProfile";
  try {
    return await getRepositoryDbClient().maybeSingle<UserProfile>("user_profiles", {
      filters: [{ column: "user_id", operator: "eq", value: userId }],
    });
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
  const operation = "createUserProfile";
  try {
    return await getRepositoryDbClient().insert<UserProfile>(
      "user_profiles",
      toDbValues({ ...input }),
    );
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export async function activateUserProfile(userId: string): Promise<UserProfile> {
  return updateUserProfileAccessStatus(userId, "active");
}

export async function updateUserProfileAccessStatus(
  userId: string,
  status: AccessStatus,
): Promise<UserProfile> {
  const operation = "updateUserProfileAccessStatus";
  try {
    return await getRepositoryDbClient().update<UserProfile>(
      "user_profiles",
      { access_status: status },
      { filters: [{ column: "user_id", operator: "eq", value: userId }] },
    );
  } catch (error) {
    wrapRepositoryError(operation, error);
  }
}

export const userProfilesRepository = {
  getUserProfile,
  createUserProfile,
  activateUserProfile,
  updateUserProfileAccessStatus,
};
