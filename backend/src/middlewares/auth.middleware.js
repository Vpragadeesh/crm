import jwt from "jsonwebtoken";


export const authenticateEmployee = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    req.user = {
      empId: decoded.empId,
      companyId: decoded.companyId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authenticate internal systems (e.g. marketing/tracking servers)
 * using a shared API key/secret token.
 */
export const authenticateInternalSystem = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"] || req.headers["x-internal-secret"];
    const expectedSecret = process.env.INTERNAL_API_KEY || "internal-marketing-secret-key-12345";

    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (token === expectedSecret || apiKeyHeader === expectedSecret) {
      return next();
    }

    return res.status(401).json({
      message: "Unauthorized: Invalid or missing internal API key",
    });
  } catch (error) {
    next(error);
  }
};
