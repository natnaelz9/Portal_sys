import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class FinanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('accounts')
  accounts() {
    return this.prisma.account.findMany({ orderBy: { code: 'asc' } });
  }

  @Post('accounts')
  createAccount(@Body() body: Prisma.AccountCreateInput) {
    return this.prisma.account.create({ data: body });
  }

  @Get('transactions')
  transactions() {
    return this.prisma.transaction.findMany({
      include: { account: true },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  @Post('transactions')
  createTx(@Body() body: Prisma.TransactionUncheckedCreateInput) {
    return this.prisma.transaction.create({
      data: { ...body, occurredAt: new Date(body.occurredAt) },
    });
  }

  @Get('expenses')
  expenses() {
    return this.prisma.expense.findMany({ orderBy: { occurredAt: 'desc' } });
  }

  @Post('expenses')
  createExpense(@Body() body: Prisma.ExpenseCreateInput) {
    return this.prisma.expense.create({
      data: { ...body, occurredAt: new Date(body.occurredAt as unknown as string) },
    });
  }

  @Get('invoices')
  invoices() {
    return this.prisma.invoice.findMany({
      include: { salesOrder: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  @Post('invoices')
  createInvoice(@Body() body: Prisma.InvoiceUncheckedCreateInput) {
    return this.prisma.invoice.create({
      data: {
        ...body,
        issuedAt: new Date(body.issuedAt),
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      },
    });
  }

  @Get('finance/summary')
  async summary() {
    const [sales, purchases, expenses, ar, ap] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { type: 'SALE' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { type: 'PURCHASE' }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { kind: 'SALES', status: 'OPEN' }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { kind: 'PURCHASE', status: 'OPEN' }, _sum: { amount: true } }),
    ]);
    const revenue = Number(sales._sum.amount || 0);
    const cogs = Number(purchases._sum.amount || 0);
    const opex = Number(expenses._sum.amount || 0);
    return {
      revenue,
      purchases: cogs,
      expenses: opex,
      profit: revenue - cogs - opex,
      accountsReceivable: Number(ar._sum.amount || 0),
      accountsPayable: Number(ap._sum.amount || 0),
      exportTaxEstimate: revenue * 0.02,
      vatEstimate: opex * 0.15,
    };
  }
}
