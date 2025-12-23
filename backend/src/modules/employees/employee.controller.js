import * as employeeService from "./employee.service.js";

/**
 * @desc   Complete employee profile after Google OAuth
 * @route  POST /employees/complete-profile
 * @access Employee
 */
export const completeProfile = async (req, res, next) => {
  try {
    const { name, phone, role, department } = req.body;
    const empId = req.user.empId;

    // Validate required fields
    if (!name || !phone || !role || !department) {
      return res.status(400).json({
        message: "Name, phone, role, and department are required",
      });
    }

    // Update employee profile
    await employeeService.updateEmployee(empId, {
      name,
      phone,
      role,
      department,
    });

    // Get updated employee data
    const updatedEmployee = await employeeService.getEmployeeById(empId);

    res.json({
      message: "Profile completed successfully",
      user: {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        department: updatedEmployee.department,
        role: updatedEmployee.role,
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
    const empId = await employeeService.createEmployee(req.body);

    res.status(201).json({
      message: "Employee created successfully",
      empId,
    });
  } catch (error) {
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
 * @desc   Delete employee
 * @route  DELETE /employees/:id
 * @access Admin
 */
export const deleteEmployee = async (req, res, next) => {
  try {
    await employeeService.deleteEmployee(req.params.id);

    res.json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
