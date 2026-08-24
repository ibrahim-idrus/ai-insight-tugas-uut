import { useEffect, useState } from "react";

interface Table {
  name: string;
}

function App() {
  const [tables, setTables] = useState<Table[]>([]);
  const [status, setStatus] = useState<string>("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));

    fetch("/api/tables")
      .then((res) => res.json())
      .then((data) => setTables(data))
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>LMS Dashboard</h1>
      <p>
        API Status: <strong>{status}</strong>
      </p>
      <h2>Database Tables ({tables.length})</h2>
      <ul>
        {tables.map((table) => (
          <li key={table.name}>{table.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
