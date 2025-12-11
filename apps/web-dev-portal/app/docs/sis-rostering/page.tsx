import { CodeBlock } from '@/components/code-block';

export default function SISRosteringPage() {
  return (
    <div className="prose prose-slate max-w-none">
      <h1>SIS & Rostering</h1>
      
      <p className="lead text-xl text-gray-600">
        Import students, teachers, and classes from your Student Information System 
        using OneRoster CSV files or API.
      </p>

      <h2>Import Methods</h2>

      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Best For</th>
            <th>Frequency</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>OneRoster CSV</strong></td>
            <td>Batch imports, initial setup</td>
            <td>Daily/weekly</td>
          </tr>
          <tr>
            <td><strong>SFTP Upload</strong></td>
            <td>Automated scheduled imports</td>
            <td>Nightly</td>
          </tr>
          <tr>
            <td><strong>OneRoster API</strong></td>
            <td>Real-time sync, delta updates</td>
            <td>Continuous</td>
          </tr>
        </tbody>
      </table>

      <h2>OneRoster CSV Format</h2>

      <p>
        Aivo supports OneRoster 1.1 CSV format. You&apos;ll need to provide these files:
      </p>

      <h3>Required Files</h3>

      <ul>
        <li><code>users.csv</code> - Students, teachers, and staff</li>
        <li><code>orgs.csv</code> - Schools and districts</li>
        <li><code>classes.csv</code> - Courses and sections</li>
        <li><code>enrollments.csv</code> - User-to-class mappings</li>
      </ul>

      <h3>Optional Files</h3>

      <ul>
        <li><code>academicSessions.csv</code> - Terms and semesters</li>
        <li><code>courses.csv</code> - Course catalog</li>
        <li><code>demographics.csv</code> - Additional user data</li>
      </ul>

      <h3>users.csv Example</h3>

      <CodeBlock
        language="csv"
        filename="users.csv"
        code={`sourcedId,status,dateLastModified,enabledUser,orgSourcedIds,role,username,userIds,givenName,familyName,middleName,identifier,email,sms,phone,grades,password
user_001,active,2024-12-01T00:00:00Z,true,school_001,student,alice.student,local:12345,Alice,Student,,12345,alice@school.edu,,,06,
user_002,active,2024-12-01T00:00:00Z,true,school_001,teacher,bob.teacher,local:67890,Bob,Teacher,,67890,bob@school.edu,,,K-12,`}
      />

      <h3>classes.csv Example</h3>

      <CodeBlock
        language="csv"
        filename="classes.csv"
        code={`sourcedId,status,dateLastModified,title,grades,courseSourcedId,classCode,classType,location,schoolSourcedId,termSourcedIds,subjects,subjectCodes,periods
class_001,active,2024-12-01T00:00:00Z,Math 6A,06,course_math6,MATH6A,homeroom,,school_001,term_fall2024,Mathematics,MA,1`}
      />

      <h3>enrollments.csv Example</h3>

      <CodeBlock
        language="csv"
        filename="enrollments.csv"
        code={`sourcedId,status,dateLastModified,classSourcedId,schoolSourcedId,userSourcedId,role,primary,beginDate,endDate
enroll_001,active,2024-12-01T00:00:00Z,class_001,school_001,user_001,student,true,2024-08-15,2025-06-15
enroll_002,active,2024-12-01T00:00:00Z,class_001,school_001,user_002,teacher,true,2024-08-15,2025-06-15`}
      />

      <h2>SFTP Upload</h2>

      <p>
        For automated imports, upload CSV files to your dedicated SFTP directory:
      </p>

      <CodeBlock
        language="text"
        filename="SFTP Details"
        code={`Host: sftp.aivo.com
Port: 22
Username: your_tenant_id
Directory: /incoming/oneroster/

File naming convention:
- users_YYYYMMDD.csv
- classes_YYYYMMDD.csv
- enrollments_YYYYMMDD.csv`}
      />

      <p>
        Files are processed every night at 2:00 AM in your timezone. Processing 
        results are emailed to your designated admin contact.
      </p>

      <h2>OneRoster API</h2>

      <p>
        For real-time synchronization, use the OneRoster REST API. Aivo acts as 
        a consumer of your SIS&apos;s OneRoster endpoint.
      </p>

      <h3>Configure API Connection</h3>

      <p>Provide these details in your tenant settings:</p>

      <ul>
        <li><strong>Base URL</strong> - Your SIS OneRoster endpoint</li>
        <li><strong>Client ID</strong> - OAuth client credentials</li>
        <li><strong>Client Secret</strong> - OAuth client credentials</li>
        <li><strong>Sync Frequency</strong> - How often to pull updates</li>
      </ul>

      <h3>Supported Endpoints</h3>

      <p>Aivo queries these OneRoster API endpoints:</p>

      <ul>
        <li><code>GET /users</code></li>
        <li><code>GET /orgs</code></li>
        <li><code>GET /classes</code></li>
        <li><code>GET /enrollments</code></li>
        <li><code>GET /academicSessions</code></li>
      </ul>

      <h2>Data Mapping</h2>

      <h3>User Roles</h3>

      <table>
        <thead>
          <tr>
            <th>OneRoster Role</th>
            <th>Aivo Role</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>student</td><td>Learner</td></tr>
          <tr><td>teacher</td><td>Teacher</td></tr>
          <tr><td>administrator</td><td>School Admin</td></tr>
          <tr><td>parent</td><td>Parent/Guardian</td></tr>
        </tbody>
      </table>

      <h3>Grade Levels</h3>

      <p>
        Aivo maps standard grade codes to learning level bands:
      </p>

      <table>
        <thead>
          <tr>
            <th>OneRoster Grades</th>
            <th>Aivo Band</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>PK, KG, 01, 02</td><td>PRE_K_2</td></tr>
          <tr><td>03, 04, 05</td><td>G3_5</td></tr>
          <tr><td>06, 07, 08</td><td>G6_8</td></tr>
          <tr><td>09, 10, 11, 12</td><td>G9_12</td></tr>
        </tbody>
      </table>

      <h2>Import Status & Logs</h2>

      <p>
        Monitor import status in the District Admin portal or via API:
      </p>

      <CodeBlock
        language="bash"
        filename="Request"
        code={`curl -X GET "https://api.aivo.com/admin/roster/imports" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Tenant-ID: YOUR_TENANT_ID"`}
      />

      <CodeBlock
        language="json"
        filename="Response"
        code={`{
  "imports": [
    {
      "id": "import_abc123",
      "type": "csv_upload",
      "status": "completed",
      "startedAt": "2024-12-11T02:00:00Z",
      "completedAt": "2024-12-11T02:15:00Z",
      "stats": {
        "usersProcessed": 1250,
        "usersCreated": 45,
        "usersUpdated": 1200,
        "usersSkipped": 5,
        "classesProcessed": 85,
        "enrollmentsProcessed": 3200,
        "errors": 3
      }
    }
  ]
}`}
      />

      <h2>Best Practices</h2>

      <ul>
        <li><strong>Unique Identifiers</strong> - Use consistent sourcedIds across imports</li>
        <li><strong>Delta Updates</strong> - Only include changed records when possible</li>
        <li><strong>Validation</strong> - Run CSV files through the OneRoster validator first</li>
        <li><strong>Scheduling</strong> - Import during off-peak hours</li>
        <li><strong>Error Handling</strong> - Review import logs for failed records</li>
      </ul>

      <h2>Next Steps</h2>

      <ul>
        <li><a href="/docs/sis-rostering/oneroster-csv">OneRoster CSV Guide</a></li>
        <li><a href="/docs/sis-rostering/sftp">SFTP Setup Instructions</a></li>
        <li><a href="/docs/guides/oneroster-import">OneRoster Import Quickstart</a></li>
      </ul>
    </div>
  );
}
