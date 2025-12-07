export default function PrivacyPolicyPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-semibold text-slate-900">Aivo Privacy Notice</h1>
      <p className="text-sm text-slate-700">
        This notice describes how Aivo collects, uses, shares, retains, and deletes personal
        information for learners and parents on consumer plans. It complements district contractual
        terms and FERPA/CPRA obligations.
      </p>
      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3 text-sm text-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Data we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Learner profile data provided by parents (name, grade, contact as entered).</li>
            <li>Learning activity data (sessions, assessments, recommendations, events).</li>
            <li>Device/application telemetry needed for security and service reliability.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">How we use data</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Deliver core learning experiences and baseline placement.</li>
            <li>Provide optional AI tutor features when parents grant consent.</li>
            <li>Improve quality and safety via aggregate analytics where permitted.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Sharing</h2>
          <p>
            We do not sell personal information. We share only with subprocessors required to run
            the service, under contract.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Retention</h2>
          <p>
            We follow published retention schedules; key categories (events, homework uploads, AI
            incidents) are time-bound and may be anonymized or deleted after their retention window.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Your choices</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Consent management: parents can grant/revoke required and optional consents in-app.
            </li>
            <li>
              Data Subject Rights: request export or deletion/anonymization from the parent app or
              via support.
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Contact</h2>
          <p>
            Questions or appeals: privacy@aivo.example.com. Include your tenant name (or “consumer”)
            and learner ID.
          </p>
          <p className="text-xs text-slate-500">
            If legal supplies a different contact/address, update this paragraph and redeploy.
          </p>
        </div>
      </div>
    </section>
  );
}
