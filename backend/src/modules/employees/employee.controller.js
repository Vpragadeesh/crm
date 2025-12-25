import * as employeeService from "./employee.service.js";
import * as companyRepo from "../companies/company.repo.js";
import jwt from "jsonwebtoken";

/**
 * @desc   Complete employee profile after Google OAuth
 * @route  POST /employees/complete-profile
 * @access Employee
 */
export const completeProfile = async (req, res, next) => {
  try {
    const { name, phone, role, department, companyName } = req.body;
    const empId = req.user.empId;

    // Validate required fields
    if (!name || !phone || !role || !department) {
      return res.status(400).json({
        message: "Name, phone, role, and department are required",
      });
    }

    let companyId = req.user.companyId;

    // If user is an ADMIN and doesn't have a company, create one
    if (role === 'ADMIN' && !companyId) {
      // Get employee email to extract domain
      const employee = await employeeService.getEmployeeById(empId);
      const emailDomain = employee.email.split('@')[1];
      
      // Create a new company for this admin
      companyId = await companyRepo.createCompany({
        company_name: companyName || `${name}'s Company`,
        domain: emailDomain,
        email: employee.email,
      });
    }

    // Update employee profile with company_id
    await employeeService.updateEmployee(empId, {
      name,
      phone,
      role,
      department,
      company_id: companyId,
    });

    // Get updated employee data
    const updatedEmployee = await employeeService.getEmployeeById(empId);

    // Generate new JWT with updated company_id
    const newToken = jwt.sign(
      {
        empId: updatedEmployee.emp_id,
        companyId: updatedEmployee.company_id,
        role: updatedEmployee.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Profile completed successfully",
      token: newToken,
      user: {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        department: updatedEmployee.department,
        role: updatedEmployee.role,
        company_id: updatedEmployee.company_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Create a new employee
 * @route  POST /employees
 * @access Admin
 */
export const createEmployee = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    
    // Add the admin's company_id to the new employee data
    const employeeData = {
      ...req.body,
      company_id: companyId
    };

    const empId = await employeeService.createEmployee(employeeData);

    res.status(201).json({
      message: "Employee created successfully",
      empId,
    });
  } catch (error) {
    // Handle duplicate email error
    if (error.message.includes('already exists')) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * @desc   Get employee by ID
 * @route  GET /employees/:id
 * @access Employee
 */
export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Remove sensitive fields
    delete employee.password;

    res.json(employee);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get employees by company
 * @route  GET /employees/company/:companyId
 * @access Employee
 */
export const getEmployeesByCompany = async (req, res, next) => {
  try {
    const employees = await employeeService.getEmployeesByCompany(
      req.params.companyId
    );

    res.json(employees);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get current logged-in employee profile
 * @route  GET /employees/me
 * @access Employee
 */
export const getProfile = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployeeById(req.user.empId);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Return complete profile information
    res.json({
      emp_id: employee.emp_id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      role: employee.role,
      company_id: employee.company_id,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update employee
 * @route  PATCH /employees/:id
 * @access Admin / Self
 */
export const updateEmployee = async (req, res, next) => {
  try {
    await employeeService.updateEmployee(req.params.id, req.body);

    res.json({
      message: "Employee updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update employee role (Admin only)
 * @route  PATCH /employees/:id/role
 * @access Admin
 */
export const updateEmployeeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetEmpId = req.params.id;
    const adminEmpId = req.user.empId;

    // Validate role
    if (!role || !['ADMIN', 'EMPLOYEE'].includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Must be 'ADMIN' or 'EMPLOYEE'",
      });
    }

    // Prevent admin from demoting themselves
    if (targetEmpId == adminEmpId && role === 'EMPLOYEE') {
      return res.status(400).json({
        message: "You cannot demote yourself",
      });
    }

    // Check if target employee exists and belongs to same company
    const targetEmployee = await employeeService.getEmployeeById(targetEmpId);
    if (!targetEmployee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (targetEmployee.company_id !== req.user.companyId) {
      return res.status(403).json({
        message: "Cannot modify employees from other companies",
      });
    }

    await employeeService.updateEmployee(targetEmpId, { role });

    res.json({
      message: `Employee role updated to ${role}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete employee
 * @route  DELETE /employees/:id
 * @access Admin
 */
export const deleteEmployee = async (req, res, next) => {
  try {
    const targetEmpId = req.params.id;
    const adminEmpId = req.user.empId;

    // Prevent admin from deleting themselves
    if (targetEmpId == adminEmpId) {
      return res.status(400).json({
        message: "You cannot delete yourself",
      });
    }

    // Check if target employee exists and belongs to same company
    const targetEmployee = await employeeService.getEmployeeById(targetEmpId);
    if (!targetEmployee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (targetEmployee.company_id !== req.user.companyId) {
      return res.status(403).json({
        message: "Cannot delete employees from other companies",
      });
    }

    await employeeService.deleteEmployee(targetEmpId);

    res.json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
