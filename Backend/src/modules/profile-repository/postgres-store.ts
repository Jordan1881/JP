import type pg from "pg";
import type { CareerProfile } from "@jp/shared-types";
import type { ProfileStore } from "./profile-repository.js";

interface ProfileRow {
  user_id: string;
  tech_stack: string[];
  target_roles: string[];
  seniority: string;
  years_of_experience: number;
  location_preference: string;
  remote_preference: string;
  salary_expectations: string;
  notable_projects: string;
  soft_skills: string;
  career_narrative: string;
  interview_completed_at: Date | null;
}

function rowToProfile(row: ProfileRow): CareerProfile {
  return {
    userId: row.user_id,
    techStack: row.tech_stack,
    targetRoles: row.target_roles,
    seniority: row.seniority,
    yearsOfExperience: row.years_of_experience,
    locationPreference: row.location_preference,
    remotePreference: row.remote_preference,
    salaryExpectations: row.salary_expectations,
    notableProjects: row.notable_projects,
    softSkills: row.soft_skills,
    careerNarrative: row.career_narrative,
    interviewCompletedAt: row.interview_completed_at?.toISOString(),
  };
}

export class PostgresProfileStore implements ProfileStore {
  constructor(private readonly pool: pg.Pool) {}

  async get(userId: string): Promise<CareerProfile | null> {
    const { rows } = await this.pool.query<ProfileRow>(
      "SELECT * FROM career_profiles WHERE user_id = $1",
      [userId],
    );
    return rows[0] ? rowToProfile(rows[0]) : null;
  }

  async save(profile: CareerProfile): Promise<CareerProfile> {
    const { rows } = await this.pool.query<ProfileRow>(
      `INSERT INTO career_profiles (
         user_id, tech_stack, target_roles, seniority, years_of_experience,
         location_preference, remote_preference, salary_expectations,
         notable_projects, soft_skills, career_narrative,
         interview_completed_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (user_id) DO UPDATE SET
         tech_stack = EXCLUDED.tech_stack,
         target_roles = EXCLUDED.target_roles,
         seniority = EXCLUDED.seniority,
         years_of_experience = EXCLUDED.years_of_experience,
         location_preference = EXCLUDED.location_preference,
         remote_preference = EXCLUDED.remote_preference,
         salary_expectations = EXCLUDED.salary_expectations,
         notable_projects = EXCLUDED.notable_projects,
         soft_skills = EXCLUDED.soft_skills,
         career_narrative = EXCLUDED.career_narrative,
         interview_completed_at = EXCLUDED.interview_completed_at
       RETURNING *`,
      [
        profile.userId,
        JSON.stringify(profile.techStack),
        JSON.stringify(profile.targetRoles),
        profile.seniority,
        profile.yearsOfExperience,
        profile.locationPreference,
        profile.remotePreference,
        profile.salaryExpectations,
        profile.notableProjects,
        profile.softSkills,
        profile.careerNarrative,
        profile.interviewCompletedAt ?? null,
      ],
    );
    return rowToProfile(rows[0]!);
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.pool.query("DELETE FROM career_profiles WHERE user_id = $1", [
      userId,
    ]);
  }
}
