import type { User } from "@supabase/supabase-js";
import {
  createUserProfile,
  getUserProfile,
  type UserProfile,
} from "@mentoros/db";

export async function getOrCreatePendingProfile(user: User): Promise<UserProfile> {
  const existingProfile = await getUserProfile(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  try {
    return await createUserProfile({
      user_id: user.id,
      email: user.email ?? null,
      access_status: "pending",
      role: "tester",
    });
  } catch {
    const profile = await getUserProfile(user.id);

    if (profile) {
      return profile;
    }

    throw new Error("Unable to create user profile.");
  }
}
