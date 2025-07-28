import { Connection } from "mongoose";

declare global {
  var mongoose: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Types: any;
    conn: Connection | null;
    promise: promise<Connection> | null;
  };
}

export {};
