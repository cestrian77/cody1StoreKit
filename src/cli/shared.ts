export function parseVerbose(): boolean {
  return process.argv.includes("--verbose") || process.argv.includes("-v");
}

export function handleCliError(err: unknown, verbose: boolean): void {
  if (verbose && err instanceof Error) {
    console.error(err.stack ?? err.message);
  } else if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(String(err));
  }
  process.exit(1);
}
