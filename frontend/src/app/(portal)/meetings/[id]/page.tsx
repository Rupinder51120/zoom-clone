import MeetingDetails from "@/components/meeting-details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingDetails code={id} />;
}
