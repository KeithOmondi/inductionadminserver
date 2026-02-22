import { Request, Response, NextFunction } from "express";

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  res.status(404);
  res.json({ success: false, message: `Route ${req.originalUrl} not found` });
};
