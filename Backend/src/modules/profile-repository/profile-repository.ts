import type { CareerProfile, UpdateProfileInput } from "@jp/shared-types";

export interface ProfileStore {
  get(userId: string): Promise<CareerProfile | null>;
  save(profile: CareerProfile): Promise<CareerProfile>;
  deleteByUser(userId: string): Promise<void>;
}

export class InMemoryProfileStore implements ProfileStore {
  private readonly profiles = new Map<string, CareerProfile>();

  async get(userId: string): Promise<CareerProfile | null> {
    const profile = this.profiles.get(userId);
    return profile ? structuredClone(profile) : null;
  }

  async save(profile: CareerProfile): Promise<CareerProfile> {
    this.profiles.set(profile.userId, structuredClone(profile));
    return structuredClone(profile);
  }

  async deleteByUser(userId: string): Promise<void> {
    this.profiles.delete(userId);
  }

  clear(): void {
    this.profiles.clear();
  }
}

function emptyProfile(userId: string): CareerProfile {
  return {
    userId,
    techStack: [],
    targetRoles: [],
    seniority: "",
    yearsOfExperience: 0,
    locationPreference: "",
    remotePreference: "",
    salaryExpectations: "",
    notableProjects: "",
    softSkills: "",
    careerNarrative: "",
  };
}

export class ProfileRepository {
  constructor(private readonly store: ProfileStore) {}

  async get(userId: string): Promise<CareerProfile | null> {
    return this.store.get(userId);
  }

  isComplete(profile: CareerProfile | null): boolean {
    return Boolean(profile?.interviewCompletedAt);
  }

  async saveInterviewProfile(
    userId: string,
    input: UpdateProfileInput,
    now: string = new Date().toISOString(),
  ): Promise<CareerProfile> {
    const profile: CareerProfile = {
      ...emptyProfile(userId),
      ...input,
      userId,
      interviewCompletedAt: now,
    };
    return this.store.save(profile);
  }

  async update(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<CareerProfile> {
    const existing = (await this.store.get(userId)) ?? emptyProfile(userId);
    if (!existing.interviewCompletedAt) {
      throw new Error("Complete the profile interview before editing");
    }
    return this.store.save({ ...existing, ...input, userId });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.store.deleteByUser(userId);
  }
}
