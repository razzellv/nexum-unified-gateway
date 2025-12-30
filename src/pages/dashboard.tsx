import { getUserProfile } from "../auth/profile";

interface UserProfile {
  email?: string;
  sub?: string;
  [key: string]: unknown;
}

export default function Dashboard() {
  const user = getUserProfile() as UserProfile | null;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Unified Operations Dashboard</h1>
      <p>Welcome {user?.email || "Operator"}</p>

      <ul>
        <li>Facility Intelligence</li>
        <li>Compliance Analyzer</li>
        <li>Virtuous Risk Engine</li>
        <li>Learning Management</li>
      </ul>
    </div>
  );
}
