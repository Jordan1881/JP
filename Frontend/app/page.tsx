import { getDevJobRepository, LOCAL_DEV_USER_ID } from "@jp/backend";
import { AddJobForm } from "@/components/AddJobForm";
import { ApplicationsTable } from "@/components/ApplicationsTable";
import { getGreeting } from "@/lib/app";

export default async function HomePage() {
  const jobs = await getDevJobRepository().listActive({
    userId: LOCAL_DEV_USER_ID,
  });

  return (
    <main className="page">
      <header className="page-header">
        <h1>{getGreeting()}</h1>
        <p className="subtitle">
          Track every application in one searchable table.
        </p>
      </header>
      <div className="layout">
        <AddJobForm />
        <ApplicationsTable jobs={jobs} />
      </div>
    </main>
  );
}
