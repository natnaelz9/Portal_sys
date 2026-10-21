import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQuery, paginated, skipTake } from '../common/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PurchasesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('purchase-orders')
  purchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { orderDate: 'desc' },
    });
  }

  @Post('purchase-orders')
  createPo(@Body() body: Prisma.PurchaseOrderUncheckedCreateInput) {
    return this.prisma.purchaseOrder.create({ data: body });
  }

  @Get('purchases')
  async purchases(@Query() query: PaginationQuery) {
    const { skip, take, page, limit } = skipTake(query);
    const where: Prisma.PurchaseWhereInput = query.q
      ? {
          OR: [
            { number: { contains: query.q, mode: 'insensitive' } },
            { origin: { contains: query.q, mode: 'insensitive' } },
            { grade: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        skip,
        take,
        include: { supplier: true, farmer: true, warehouse: true },
        orderBy: { purchaseDate: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  @Get('purchases/:id')
  purchase(@Param('id') id: string) {
    return this.prisma.purchase.findUniqueOrThrow({
      where: { id },
      include: { supplier: true, farmer: true, warehouse: true, purchaseOrder: true, batches: true, payments: true },
    });
  }

  @Post('purchases')
  async createPurchase(@Body() body: Prisma.PurchaseUncheckedCreateInput) {
    const purchase = await this.prisma.purchase.create({
      data: { ...body, purchaseDate: new Date(body.purchaseDate) },
    });
    await this.prisma.stockBatch.create({
      data: {
        lotNumber: `LOT-${purchase.number}`,
        warehouseId: purchase.warehouseId,
        purchaseId: purchase.id,
        origin: purchase.origin,
        process: purchase.process,
        grade: purchase.grade,
        bags: purchase.bags,
        quantityKg: purchase.quantityKg,
        moisturePct: purchase.moisturePct,
        unitValue: purchase.unitPrice,
        currency: purchase.currency,
        receivedAt: purchase.purchaseDate,
      },
    });
    return this.prisma.purchase.findUnique({
      where: { id: purchase.id },
      include: { supplier: true, warehouse: true, batches: true },
    });
  }

  @Patch('purchases/:id')
  updatePurchase(@Param('id') id: string, @Body() body: Prisma.PurchaseUncheckedUpdateInput) {
    const data = { ...body };
    if (body.purchaseDate) data.purchaseDate = new Date(String(body.purchaseDate));
    return this.prisma.purchase.update({ where: { id }, data });
  }

  @Post('purchases/:id/approve')
  async approve(@Param('id') id: string) {
    const purchase = await this.prisma.purchase.findUniqueOrThrow({ where: { id } });
    return this.prisma.purchase.update({
      where: { id },
      data: {
        status: 'APPROVED',
        receiptNo: purchase.receiptNo || `RCPT-${purchase.number}`,
      },
    });
  }

  @Post('purchases/:id/reject')
  reject(@Param('id') id: string) {
    return this.prisma.purchase.update({ where: { id }, data: { status: 'REJECTED' } });
  }
}
