import type { Express } from "express";
import { createApp, initServer } from "../server/app.js";

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = initServer().then(() => createApp());
  }
  return appPromise;
}

export default async function handler(
  req: Parameters<Express>[0],
  res: Parameters<Express>[1],
  next: Parameters<Express>[2],
): Promise<void> {
  const app = await getApp();
  return app(req, res, next);
}
