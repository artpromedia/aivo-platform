import { ReviewDetail } from './review-detail';

interface ReviewDetailPageProps {
  params: Promise<{
    vendorId: string;
    itemId: string;
    versionId: string;
  }>;
}

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { vendorId, itemId, versionId } = await params;
  return (
    <ReviewDetail
      vendorId={vendorId}
      itemId={itemId}
      versionId={versionId}
    />
  );
}
