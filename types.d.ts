/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection } from "mongoose";

declare global {
  var mongoose: {
    Types: any;
    conn: Connection | null;
    promise: promise<Connection> | null;
  };
}

export {};
