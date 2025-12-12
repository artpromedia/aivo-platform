import { ReviewQueue } from './review-queue';

export default function MarketplaceReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <p className="mt-1 text-slate-600">
          Review and approve marketplace item submissions
        </p>
      </div>
      <ReviewQueue />
    </div>
  );
}
