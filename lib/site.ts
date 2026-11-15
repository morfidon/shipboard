// Where the app runs, as a full address. Social previews, the sitemap and
// robots.txt need it. Better Auth builds its links from the same variable.
export const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
