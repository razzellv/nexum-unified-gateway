import { getUserProfile } from "../auth/profile";

export default function Dashboard() {
  const user = getUserProfile();

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
