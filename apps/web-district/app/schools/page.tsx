const schools = [
  { name: 'Maple Elementary', students: 420, status: 'Active' },
  { name: 'Cedar Middle School', students: 610, status: 'Active' },
  { name: 'Pineview Academy', students: 180, status: 'Pending' },
];

export default function SchoolsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Schools</h1>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">School</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Students</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {schools.map((school) => (
              <tr key={school.name}>
                <td className="px-4 py-3 text-sm text-slate-800">{school.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{school.students}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {school.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
