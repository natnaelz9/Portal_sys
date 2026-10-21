import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('kpis')
  async kpis() {
    const [
      suppliers,
      farmers,
      purchases,
      purchaseVolume,
      stock,
      buyers,
      openOrders,
      shipments,
      employees,
      salesTx,
      purchaseTx,
      expenses,
      byOrigin,
      byCountry,
      lowStock,
    ] = await Promise.all([
      this.prisma.supplier.count(),
      this.prisma.farmer.count(),
      this.prisma.purchase.count(),
      this.prisma.purchase.aggregate({ _sum: { quantityKg: true } }),
      this.prisma.stockBatch.aggregate({
        where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
        _sum: { quantityKg: true },
      }),
      this.prisma.buyer.count(),
      this.prisma.salesOrder.count({ where: { status: { in: ['CONFIRMED', 'PARTIAL'] } } }),
      this.prisma.shipment.count(),
      this.prisma.employee.count(),
      this.prisma.transaction.aggregate({ where: { type: 'SALE' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { type: 'PURCHASE' }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ _sum: { amount: true } }),
      this.prisma.stockBatch.groupBy({
        by: ['origin', 'grade'],
        where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
        _sum: { quantityKg: true },
      }),
      this.prisma.exportContract.groupBy({
        by: ['buyerId'],
        _sum: { quantityKg: true, shippedKg: true },
      }),
      this.prisma.stockBatch.findMany({
        where: { status: 'AVAILABLE', quantityKg: { lt: 800 } },
        include: { warehouse: true },
        take: 8,
      }),
    ]);

    const buyersList = await this.prisma.buyer.findMany({
      where: { id: { in: byCountry.map((r) => r.buyerId) } },
      include: { country: true },
    });
    const exportByCountry = buyersList.reduce<Record<string, number>>((acc, buyer) => {
      const row = byCountry.find((r) => r.buyerId === buyer.id);
      acc[buyer.country.name] = (acc[buyer.country.name] || 0) + Number(row?._sum.quantityKg || 0);
      return acc;
    }, {});

    const revenue = Number(salesTx._sum.amount || 0);
    const cogs = Number(purchaseTx._sum.amount || 0);
    const opex = Number(expenses._sum.amount || 0);

    return {
      suppliers,
      farmers,
      purchases,
      purchaseVolumeKg: Number(purchaseVolume._sum.quantityKg || 0),
      stockKg: Number(stock._sum.quantityKg || 0),
      buyers,
      openOrders,
      shipments,
      employees,
      revenue,
      profit: revenue - cogs - opex,
      inventoryByGrade: byOrigin,
      exportByCountry,
      lowStock,
    };
  }

  @Get('reports')
  async reports() {
    const now = new Date();
    const lots = await this.prisma.stockBatch.findMany({
      where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
      include: { warehouse: true },
    });
    const aging = { d0_30: 0, d31_90: 0, d90plus: 0 };
    for (const lot of lots) {
      const days = (now.getTime() - new Date(lot.receivedAt).getTime()) / 86400000;
      const qty = Number(lot.quantityKg);
      if (days <= 30) aging.d0_30 += qty;
      else if (days <= 90) aging.d31_90 += qty;
      else aging.d90plus += qty;
    }

    const [byProcess, byGrade, openContracts, evals, purchases, suppliers] = await Promise.all([
      this.prisma.stockBatch.groupBy({
        by: ['process'],
        where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
        _sum: { quantityKg: true },
      }),
      this.prisma.stockBatch.groupBy({
        by: ['grade'],
        where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
        _sum: { quantityKg: true },
      }),
      this.prisma.exportContract.findMany({
        where: { status: { in: ['CONFIRMED', 'PARTIAL'] } },
        include: { buyer: { include: { country: true } } },
      }),
      this.prisma.performanceEval.findMany({ include: { employee: true }, take: 20, orderBy: { createdAt: 'desc' } }),
      this.prisma.purchase.groupBy({ by: ['origin', 'process', 'grade'], _sum: { quantityKg: true } }),
      this.prisma.supplier.findMany({
        include: { evaluations: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { purchases: true } } },
      }),
    ]);

    const forecast = openContracts.map((c) => ({
      contract: c.number,
      buyer: c.buyer.name,
      country: c.buyer.country.name,
      remainingKg: Number(c.quantityKg) - Number(c.shippedKg),
      valueUsd: (Number(c.quantityKg) - Number(c.shippedKg)) * Number(c.unitPrice),
    }));

    return {
      inventoryAging: aging,
      processing: byProcess,
      grades: byGrade,
      purchaseBreakdown: purchases,
      forecast,
      employeePerformance: evals,
      suppliers: suppliers.map((s) => ({
        name: s.name,
        origin: s.origin,
        purchases: s._count.purchases,
        lastScore: s.evaluations[0]
          ? (Number(s.evaluations[0].quality) + Number(s.evaluations[0].delivery) + Number(s.evaluations[0].reliability)) / 3
          : null,
      })),
    };
  }
}
