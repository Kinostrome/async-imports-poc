type ErrorMessage = string;

export type Result<T> = { result: T } | { failures: ErrorMessage[] };

export function isSuccess<T>(result: Result<T>): result is { result: T } {
  return "result" in result;
}

export function isFailure<T>(
  result: Result<T>
): result is { failures: ErrorMessage[] } {
  return "failures" in result;
}
