import { randomInt } from 'node:crypto';

export function createRequestFrame(method: string, params?: object): RequestFrame {
  return {
    id: randomInt(2 ** 48 - 1),
    src: 'Homey',
    method: method,
    params: params,
  };
}

export type RequestFrame = {
  // The version of jsonrpc used.
  jsonrpc?: '2.0';
  // Identifier of this request, will be used to match the response frame.
  id: string | number;
  // Name of the source of the request (you can choose whatever string you like to identify you as the source of the request)
  src: string;
  // Name of the procedure to be called.
  method: string;
  // Parameters that the method takes (if any)
  params?: object;
};

export type ResponseFrame<Result extends object> = ResponseSuccessFrame<Result> | ResponseErrorFrame;

interface ResponseFrameBasis {
  // Identifier of the communication
  id: string | number;
  // Name of the source of the response
  src: string;
  // Name of the destination (the source of the request)
  dst: string;
}

export type ResponseSuccessFrame<Result extends object> = ResponseFrameBasis & {
  // The result of the invoked procedure
  result: Result;
};

export type ResponseErrorFrame = ResponseFrameBasis & {
  error: {
    // Code identifying the type of the error
    code: number;
    // Description of the error
    message: string;
  };
};

export type NotificationFrame = {
  // Name of the source of the notification.
  src: string;
  // Name of the destination.
  dst: string;
  // The method invoked.
  method: string;
  // The parameters of the notification.
  params: object;
};

/**
 * This method notifies about change in the status of a component, and carries information about the changes which occurred.
 * The intended use of these notifications is to overlay the changes from NotifyStatus over a known status.
 * This should yield identical results to what would be returned by a fresh GetStatus call.
 */
export type NotificationStatusFrame<Component extends string, Status extends object> = {
  // Name of the source of the notification.
  src: string;
  // Name of the destination.
  dst: string;
  // The method invoked.
  method: 'NotifyStatus';
  // The parameters of the notification.
  params: {
    // Unix timestamp (in UTC)
    ts: number;
    // The same structure as the status object of the component.
    // Some or all unchanged attributes of the status object may not be visible.
    // Component must be substituted by the component type, (for example, cloud, wifi, mqtt).
    // If more than one instance of this type of component are available,
    // component will be substituted by component_type:id (e.g., switch:2, input:0)
  } & Record<Component, Status>;
};

/**
 * This method notifies about the full status of all components.
 */
export type NotificationFullStatusFrame<Status extends object> = {
  // Name of the source of the notification.
  src: string;
  // Name of the destination.
  dst: string;
  // The method invoked.
  method: 'NotifyFullStatus';
  // The parameters of the notification.
  params: {
    // Unix timestamp (in UTC)
    ts: number;
    // A record from component identifiers to the status of that component
    // e.g. "cloud": { "connected": false }
  } & Status;
};

/**
 * This method notifies about an occurred event that is not reflected in the status of a component.
 * (e.g., pushed button, changed configuration, ...)
 */
export type NotificationEventFrame = {
  // Name of the source of the notification.
  src: string;
  // Name of the destination.
  dst: string;
  // The method invoked.
  method: 'NotifyEvent';
  params: {
    // Unix timestamp (in UTC)
    ts: number;
    // All the events that occurred.
    events: NotificationEventParam[];
  };
};

export type NotificationEventParam = {
  // Unix timestamp (in UTC)
  ts: number;
  // Component key
  component: string;
  // Component id
  id?: number;
  // Event name
  event: string;
} & object;
