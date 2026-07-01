import { getDevJobRepository, LOCAL_DEV_USER_ID } from "@jp/backend";
import { HomeView } from "@/components/HomeView";

export default async function HomePage() {
  const jobs = await getDevJobRepository().listActive({
    userId: LOCAL_DEV_USER_ID,
  });

  return <HomeView jobs={jobs} />;
}
