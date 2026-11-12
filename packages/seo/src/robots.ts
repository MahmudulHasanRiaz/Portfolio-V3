import type { Metadata } from "next";

export interface RobotsRule {
  userAgent?: string;
  allow?: string;
  disallow?: string;
}

export function generateRobots(
  indexable?: boolean,
  rules?: RobotsRule[],
): NonNullable<Exclude<Metadata["robots"], string | null>> {
  const robots: NonNullable<Exclude<Metadata["robots"], string | null>> = {};

  if (indexable !== undefined) {
    robots.index = indexable;
    robots.follow = indexable;
  }

  if (rules) {
    (robots as Record<string, unknown>).rules = rules.map((rule) => {
      const r: Record<string, string> = {};
      if (rule.userAgent) r.userAgent = rule.userAgent;
      if (rule.allow !== undefined) r.allow = rule.allow;
      if (rule.disallow !== undefined) r.disallow = rule.disallow;
      return r;
    });
  }

  return robots;
}
