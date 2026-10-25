import { redirect } from "next/navigation";
import ExamInterface from "./exam-interface";

type Props = {
  params: Promise<{ attemptId: string }>;
};

export default async function ExamPage({ params }: Props) {
  const { attemptId } = await params;

  return <ExamInterface attemptId={attemptId} />;
}
