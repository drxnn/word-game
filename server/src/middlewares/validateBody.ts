import { Request, Response, NextFunction } from "express";

export function validateBody(requiredKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredKeys.filter((k) => !(k in req.body));
    if (missing.length > 0) {
      return res
        .status(400)
        .json({ error: `Missing fields: ${missing.join(", ")}` });
    }
    next();
  };
}
