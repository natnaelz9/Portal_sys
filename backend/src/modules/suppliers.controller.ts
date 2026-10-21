import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQuery, paginated, skipTake } from '../common/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('suppliers')
  async suppliers(@Query() query: PaginationQuery) {
    const { skip, take, page, limit } = skipTake(query);
    const where: Prisma.SupplierWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { code: { contains: query.q, mode: 'insensitive' } },
            { origin: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        include: { _count: { select: { farmers: true, purchases: true, contracts: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  @Get('suppliers/:id')
  supplier(@Param('id') id: string) {
    return this.prisma.supplier.findUniqueOrThrow({
      where: { id },
      include: {
        farmers: true,
        sites: true,
        stations: true,
        contracts: true,
        payments: { orderBy: { paidAt: 'desc' }, take: 20 },
        evaluations: { orderBy: { createdAt: 'desc' } },
        purchases: { orderBy: { purchaseDate: 'desc' }, take: 20 },
      },
    });
  }

  @Post('suppliers')
  createSupplier(@Body() body: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data: body });
  }

  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() body: Prisma.SupplierUpdateInput) {
    return this.prisma.supplier.update({ where: { id }, data: body });
  }

  @Delete('suppliers/:id')
  deleteSupplier(@Param('id') id: string) {
    return this.prisma.supplier.delete({ where: { id } });
  }

  @Get('farmers')
  async farmers(@Query() query: PaginationQuery) {
    const { skip, take, page, limit } = skipTake(query);
    const where: Prisma.FarmerWhereInput = query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' } },
            { code: { contains: query.q, mode: 'insensitive' } },
            { region: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.farmer.findMany({
        where,
        skip,
        take,
        include: { supplier: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.farmer.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  @Post('farmers')
  createFarmer(@Body() body: Prisma.FarmerUncheckedCreateInput) {
    return this.prisma.farmer.create({ data: body });
  }

  @Patch('farmers/:id')
  updateFarmer(@Param('id') id: string, @Body() body: Prisma.FarmerUncheckedUpdateInput) {
    return this.prisma.farmer.update({ where: { id }, data: body });
  }

  @Post('sites')
  createSite(@Body() body: Prisma.SiteUncheckedCreateInput) {
    return this.prisma.site.create({ data: body });
  }

  @Get('sites')
  sites() {
    return this.prisma.site.findMany({ include: { supplier: true }, orderBy: { name: 'asc' } });
  }

  @Post('washing-stations')
  createStation(@Body() body: Prisma.WashingStationUncheckedCreateInput) {
    return this.prisma.washingStation.create({ data: body });
  }

  @Get('washing-stations')
  stations() {
    return this.prisma.washingStation.findMany({ include: { supplier: true }, orderBy: { name: 'asc' } });
  }

  @Post('supplier-contracts')
  createContract(@Body() body: Prisma.SupplierContractUncheckedCreateInput) {
    return this.prisma.supplierContract.create({
      data: { ...body, startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
    });
  }

  @Get('supplier-contracts')
  contracts() {
    return this.prisma.supplierContract.findMany({ include: { supplier: true }, orderBy: { startDate: 'desc' } });
  }

  @Post('supplier-payments')
  createPayment(@Body() body: Prisma.SupplierPaymentUncheckedCreateInput) {
    return this.prisma.supplierPayment.create({
      data: { ...body, paidAt: new Date(body.paidAt) },
    });
  }

  @Get('supplier-payments')
  payments() {
    return this.prisma.supplierPayment.findMany({ include: { supplier: true }, orderBy: { paidAt: 'desc' } });
  }

  @Get('supplier-evaluations')
  evaluations() {
    return this.prisma.supplierEval.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('supplier-evaluations')
  createEval(@Body() body: Prisma.SupplierEvalUncheckedCreateInput) {
    return this.prisma.supplierEval.create({ data: body });
  }
}
