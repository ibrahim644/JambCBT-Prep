import ResultInterface from "./result-interface";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <ResultInterface attemptId={attemptId} />;
}
