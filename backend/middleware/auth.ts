import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";

type DecodedToken = JwtPayload & { id: number };

const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret",
      ) as DecodedToken;

      req.user =
        (await User.findByPk(decoded.id, {
          attributes: { exclude: ["password"] },
        })) || undefined;

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: "User account is deactivated" });
      }

      return next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token provided" });
};

export { protect };
