export function normalizeGithubRepository(value: string): string {
  const url = new URL(value);
  const parts = url.pathname.split("/").filter(Boolean);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    parts.length !== 2 ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error("Invalid GitHub repository URL");
  }

  const [owner, repo] = parts;

  return `${owner}/${repo.replace(/\.git$/i, "")}`.toLowerCase();
}
