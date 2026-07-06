import type { CareerProfile } from "@jp/shared-types";
import type { ProfileRepository } from "../../modules/profile-repository/index.js";
import { AgentUseCaseError } from "./errors.js";

export async function requireCompleteProfile(
  profileRepository: ProfileRepository,
  userId: string,
): Promise<CareerProfile> {
  const profile = await profileRepository.get(userId);
  if (!profileRepository.isComplete(profile) || !profile) {
    throw new AgentUseCaseError(
      "Complete your profile interview before generating content",
      400,
    );
  }
  return profile;
}
