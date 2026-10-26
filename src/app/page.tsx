import StudyApp from "@/components/study-app";
import { parseView } from "@/lib/decisions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === "string") params.set(key, value);
  });
  return <StudyApp initialView={parseView(params)} />;
}
