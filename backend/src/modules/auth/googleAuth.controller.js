import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import * as employeeRepo from "../employees/employee.repo.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Google token is required",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Find or create employee
    let employee = await employeeRepo.getByEmail(email);

    if (!employee) {
      employee = await employeeRepo.createEmployee({
        name,
        email,
        role: "EMPLOYEE",
      });
    }

    // Create JWT
    const jwtToken = jwt.sign(
      {
        empId: employee.emp_id,
        companyId: employee.company_id,
        role: employee.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: jwtToken,
      user: {
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
