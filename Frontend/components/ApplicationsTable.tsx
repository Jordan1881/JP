import type { Job } from "@jp/shared-types";

interface ApplicationsTableProps {
  jobs: Job[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ApplicationsTable({ jobs }: ApplicationsTableProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Active applications</h2>
        <p className="meta">{jobs.length} in progress</p>
      </div>
      {jobs.length === 0 ? (
        <p className="empty-state">No applications yet. Add your first job above.</p>
      ) : (
        <div className="table-wrap">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Job title</th>
                <th>Company</th>
                <th>Stage</th>
                <th>Last updated</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>{job.company}</td>
                  <td>
                    <span className="stage-pill">{job.currentStage}</span>
                  </td>
                  <td>{formatDate(job.lastUpdatedAt)}</td>
                  <td>
                    {job.url ? (
                      <a href={job.url} target="_blank" rel="noreferrer">
                        View posting
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
