import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQuery, paginated, skipTake } from '../common/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class InventoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('warehouses')
  warehouses() {
    return this.prisma.warehouse.findMany({
      include: { _count: { select: { batches: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Post('warehouses')
  createWarehouse(@Body() body: Prisma.WarehouseCreateInput) {
    return this.prisma.warehouse.create({ data: body });
  }

  @Get('inventory')
  async inventory(@Query() query: PaginationQuery) {
    const { skip, take, page, limit } = skipTake(query);
    const where: Prisma.StockBatchWhereInput = query.q
      ? {
          OR: [
            { lotNumber: { contains: query.q, mode: 'insensitive' } },
            { origin: { contains: query.q, mode: 'insensitive' } },
            { grade: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockBatch.findMany({
        where,
        skip,
        take,
        include: { warehouse: true },
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.stockBatch.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  @Get('inventory/alerts')
  async alerts() {
    const [low, onHand] = await Promise.all([
      this.prisma.stockBatch.findMany({
        where: { status: 'AVAILABLE', quantityKg: { lt: 500 } },
        include: { warehouse: true },
      }),
      this.prisma.stockBatch.findMany({
        where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
        select: { quantityKg: true, unitValue: true, currency: true },
      }),
    ]);
    const onHandKg = onHand.reduce((sum: number, b) => sum + Number(b.quantityKg), 0);
    const valuationEtb = onHand.reduce((sum: number, b) => sum + Number(b.quantityKg) * Number(b.unitValue), 0);
    return { lowStock: low, onHandKg, valuationEtb };
  }

  @Get('inventory/:id')
  batch(@Param('id') id: string) {
    return this.prisma.stockBatch.findUniqueOrThrow({
      where: { id },
      include: { warehouse: true, bagsDetail: true, transfers: true, adjustments: true, damages: true, samples: true },
    });
  }

  @Post('inventory/:id/bags')
  addBag(@Param('id') id: string, @Body() body: { bagNo: string; weightKg: number }) {
    return this.prisma.coffeeBag.create({ data: { batchId: id, bagNo: body.bagNo, weightKg: body.weightKg } });
  }

  @Post('stock-transfers')
  async transfer(@Body() body: Prisma.StockTransferUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: { ...body, transferredAt: new Date(body.transferredAt) },
      });
      const batch = await tx.stockBatch.findUniqueOrThrow({ where: { id: String(body.batchId) } });
      const qty = Number(body.quantityKg);
      if (qty >= Number(batch.quantityKg)) {
        await tx.stockBatch.update({
          where: { id: batch.id },
          data: { warehouseId: String(body.toWarehouseId) },
        });
      } else {
        await tx.stockBatch.update({
          where: { id: batch.id },
          data: {
            quantityKg: { decrement: body.quantityKg },
            bags: { decrement: Number(body.bags) },
          },
        });
        await tx.stockBatch.create({
          data: {
            lotNumber: `${batch.lotNumber}-T${Date.now().toString().slice(-4)}`,
            warehouseId: String(body.toWarehouseId),
            purchaseId: batch.purchaseId,
            origin: batch.origin,
            process: batch.process,
            grade: batch.grade,
            bags: Number(body.bags),
            quantityKg: body.quantityKg,
            moisturePct: batch.moisturePct,
            unitValue: batch.unitValue,
            currency: batch.currency,
            receivedAt: new Date(),
            status: batch.status,
          },
        });
      }
      return transfer;
    });
  }

  @Get('stock-transfers')
  transfers() {
    return this.prisma.stockTransfer.findMany({
      include: { batch: true, fromWarehouse: true, toWarehouse: true },
      orderBy: { transferredAt: 'desc' },
    });
  }

  @Post('stock-adjustments')
  async adjust(@Body() body: Prisma.StockAdjustmentUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const adj = await tx.stockAdjustment.create({ data: body });
      await tx.stockBatch.update({
        where: { id: String(body.batchId) },
        data: { quantityKg: { increment: body.quantityKg } },
      });
      return adj;
    });
  }

  @Get('stock-adjustments')
  adjustments() {
    return this.prisma.stockAdjustment.findMany({
      include: { batch: true },
      orderBy: { adjustedAt: 'desc' },
    });
  }

  @Get('damaged-stock')
  damaged() {
    return this.prisma.damagedStock.findMany({
      include: { batch: true },
      orderBy: { reportedAt: 'desc' },
    });
  }

  @Post('damaged-stock')
  async damage(@Body() body: Prisma.DamagedStockUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.damagedStock.create({ data: body });
      const batch = await tx.stockBatch.findUniqueOrThrow({ where: { id: String(body.batchId) } });
      const remaining = Number(batch.quantityKg) - Number(body.quantityKg);
      await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          quantityKg: { decrement: body.quantityKg },
          bags: { decrement: body.bags },
          status: remaining <= 0 ? 'DAMAGED' : batch.status,
        },
      });
      return rec;
    });
  }
}
