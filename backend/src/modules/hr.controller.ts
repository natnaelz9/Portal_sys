import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class HrController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('departments')
  departments() {
    return this.prisma.department.findMany({ include: { _count: { select: { employees: true } } } });
  }

  @Post('departments')
  createDept(@Body() body: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({ data: body });
  }

  @Get('employees')
  employees() {
    return this.prisma.employee.findMany({
      include: { department: true, user: { select: { email: true, role: true } } },
      orderBy: { fullName: 'asc' },
    });
  }

  @Get('employees/:id')
  employee(@Param('id') id: string) {
    return this.prisma.employee.findUniqueOrThrow({
      where: { id },
      include: {
        department: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        leaves: true,
        shifts: true,
        assignments: true,
        evaluations: true,
      },
    });
  }

  @Post('employees')
  createEmployee(@Body() body: Prisma.EmployeeUncheckedCreateInput) {
    return this.prisma.employee.create({
      data: { ...body, hireDate: new Date(body.hireDate) },
    });
  }

  @Patch('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() body: Prisma.EmployeeUncheckedUpdateInput) {
    return this.prisma.employee.update({ where: { id }, data: body });
  }

  @Post('attendance')
  attendance(@Body() body: Prisma.AttendanceUncheckedCreateInput) {
    return this.prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: String(body.employeeId),
          date: new Date(body.date),
        },
      },
      create: {
        ...body,
        date: new Date(body.date),
        checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
        checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
      },
      update: {
        checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
        checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
        status: body.status,
      },
    });
  }

  @Post('leaves')
  leave(@Body() body: Prisma.LeaveUncheckedCreateInput) {
    return this.prisma.leave.create({
      data: { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
    });
  }

  @Post('leaves/:id/approve')
  approveLeave(@Param('id') id: string) {
    return this.prisma.leave.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  @Post('shifts')
  shift(@Body() body: Prisma.ShiftUncheckedCreateInput) {
    return this.prisma.shift.create({ data: { ...body, date: new Date(body.date) } });
  }

  @Post('assignments')
  assignment(@Body() body: Prisma.AssignmentUncheckedCreateInput) {
    return this.prisma.assignment.create({
      data: { ...body, dueDate: body.dueDate ? new Date(body.dueDate) : undefined },
    });
  }

  @Post('evaluations')
  evaluation(@Body() body: Prisma.PerformanceEvalUncheckedCreateInput) {
    return this.prisma.performanceEval.create({ data: body });
  }

  @Get('attendance')
  attendanceList() {
    return this.prisma.attendance.findMany({
      include: { employee: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  @Get('leaves')
  leaves() {
    return this.prisma.leave.findMany({
      include: { employee: true },
      orderBy: { startDate: 'desc' },
    });
  }

  @Get('shifts')
  shifts() {
    return this.prisma.shift.findMany({
      include: { employee: true },
      orderBy: { date: 'desc' },
    });
  }

  @Get('assignments')
  assignments() {
    return this.prisma.assignment.findMany({
      include: { employee: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  @Get('evaluations')
  evaluations() {
    return this.prisma.performanceEval.findMany({
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('payroll')
  async payroll() {
    const employees = await this.prisma.employee.findMany({ include: { department: true } });
    return employees.map((e) => {
      const gross = Number(e.salary);
      const tax = gross * 0.15;
      return {
        employeeId: e.id,
        employeeNo: e.employeeNo,
        fullName: e.fullName,
        department: e.department.name,
        position: e.position,
        gross,
        tax,
        net: gross - tax,
        currency: 'ETB',
      };
    });
  }

  @Get('activity-logs')
  logs() {
    return this.prisma.activityLog.findMany({
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
