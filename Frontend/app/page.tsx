import { getDevJobRepository, LOCAL_DEV_USER_ID } from "@jp/backend";
import { HomeView } from "@/components/HomeView";

export default async function HomePage() {
  const jobs = await getDevJobRepository().listActive(LOCAL_DEV_USER_ID);

  return <HomeView jobs={jobs} />;
}
