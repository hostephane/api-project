export async function securePing(token) {
  const res = await fetch('http://localhost:3000/ping-protected', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return res.json();
}
