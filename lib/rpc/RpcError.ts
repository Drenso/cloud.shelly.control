/**
 * An error returned as a response to a request send to a Shelly device.
 * Common errors are described at https://shelly-api-docs.shelly.cloud/gen2/General/CommonErrors/
 */
export class RpcError extends Error {
  public readonly code: number;
  public constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * This error is received when the parameters sent in the request do not match the ones specified by the method in the request.
 */
export class InvalidArgumentError extends RpcError {
  public constructor(message: string) {
    super(-103, message);
  }
}

/**
 * This error is received when a request has timed out.
 * It is usually related to requests for fetching external resources by calling HTTP.GET or HTTP.POST in scripts.
 */
export class DeadlineExceededError extends RpcError {
  public constructor(message: string) {
    super(-104, message);
  }
}

/**
 * This error is received when a required resource has reached its limit.
 * For example, when you try to create 21 schedule jobs on one Shelly device (the limit is 20).
 */
export class ResourceExhaustedError extends RpcError {
  public constructor(message: string) {
    super(-108, message);
  }
}

/**
 * This error is received when a precondition for a requested action is not satisfied.
 * For example, when you try to turn a switch on in a situation of overpower condition,
 * or when a reboot has been scheduled and the device is shutting down.
 */
export class FailedPreconditionError extends RpcError {
  public constructor(message: string) {
    super(-109, message);
  }
}

/**
 * This error is received when a service is unavailable.
 * The service can be internal - a sensor could be unreachable, or external.
 * External services are - timezone information, firmware update or HTTP requests in Scripts.
 */
export class UnavailableError extends RpcError {
  public constructor(message: string) {
    super(-114, message);
  }
}
