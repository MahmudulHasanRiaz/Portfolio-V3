const SLOW_QUERY_THRESHOLD = 500;

export function trackQuery(
  entity: string,
  operation: string,
  duration: number,
): void {
  if (duration > SLOW_QUERY_THRESHOLD) {
    console.warn(
      `[SLOW QUERY] ${entity}.${operation} took ${duration}ms`,
    );
  } else {
    console.debug(
      `[QUERY] ${entity}.${operation} took ${duration}ms`,
    );
  }
}
