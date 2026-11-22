import { SupplierDetailClient } from '@/components/suppliers/SupplierDetailClient';

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupplierDetailClient id={id} />;
}
