/**
 * This method is required as safeFunctions is also loaded when running interview-rpc.
 * However, tsx does not know about the Homey module, as that is injected by Homey at runtime.
 */
export async function isDebug(): Promise<boolean> {
  try {
    return (await import('homey')).default.env.DEBUG === '1';
  } catch {
    return false;
  }
}
