import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import * as employeeRepo from "../employees/employee.repo.js";

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID must be set in environment variables');
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

console.log('✅ Google Auth Controller initialized');
console.log(`   - Client ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`);

export const googleLogin = async (req, res, next) => {
  try {
    const { token, inviteToken, isAdminRegistration } = req.body;

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
    const { email, name, picture } = payload;

    console.log(`🔐 Google login attempt: ${email}`);

    // Check if employee exists
    let employee = await employeeRepo.getByEmail(email);

    // If invite token provided, validate it
    if (inviteToken) {
      const invitedEmployee = await employeeRepo.getByInvitationToken(inviteToken);
      
      if (!invitedEmployee) {
        return res.status(400).json({
          message: "Invalid or expired invitation link",
          code: "INVALID_INVITE"
        });
      }
      
      // Check if the Google email matches the invited email
      if (invitedEmployee.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({
          message: `This invitation was sent to ${invitedEmployee.email}. Please sign in with that email address.`,
          code: "EMAIL_MISMATCH"
        });
      }
      
      // Accept the invitation and update employee
      await employeeRepo.acceptInvitation(invitedEmployee.emp_id);
      employee = await employeeRepo.getById(invitedEmployee.emp_id);
    }
    
    // Handle admin registration - allow new admins to self-register
    if (isAdminRegistration && !employee) {
      // Create a new admin employee (without company yet - will be set during onboarding)
      const newEmployee = await employeeRepo.createAdminEmployee({
        email,
        name,
        picture,
        invitation_status: 'ACTIVE',
        role: 'ADMIN'
      });
      
      employee = await employeeRepo.getById(newEmployee.insertId);
      
      // Create JWT for new admin
      const jwtToken = jwt.sign(
        {
          empId: employee.emp_id,
          companyId: null, // No company yet
          role: 'ADMIN',
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        token: jwtToken,
        isNewAdmin: true,
        user: {
          emp_id: employee.emp_id,
          companyId: null,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          department: employee.department,
          role: 'ADMIN',
          profileComplete: false,
        },
      });
    }

    // If no employee found and no invite token
    if (!employee) {
      return res.status(403).json({
        message: "You don't have access to this application. Please contact your administrator for an invitation.",
        code: "NOT_INVITED"
      });
    }

    // Check invitation status
    if (employee.invitation_status === 'INVITED') {
      return res.status(403).json({
        message: "Please use the invitation link sent to your email to complete registration.",
        code: "PENDING_INVITATION"
      });
    }

    if (employee.invitation_status === 'DISABLED') {
      return res.status(403).json({
        message: "Your account has been disabled. Please contact your administrator.",
        code: "ACCOUNT_DISABLED"
      });
    }

    // Update last login
    await employeeRepo.updateLastLogin(employee.emp_id);

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
        emp_id: employee.emp_id,
        companyId: employee.company_id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        role: employee.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
