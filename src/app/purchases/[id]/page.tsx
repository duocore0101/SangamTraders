import { PurchaseDetailClient } from '@/components/purchases/PurchaseDetailClient';

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PurchaseDetailClient id={id} />;
}
