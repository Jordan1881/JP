import { JobDetailView } from "@/components/JobDetailView";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  return <JobDetailView jobId={id} />;
}
