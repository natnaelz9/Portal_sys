import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQuery, paginated, skipTake } from '../common/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommercialController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('countries')
  countries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('countries')
  createCountry(@Body() body: Prisma.CountryCreateInput) {
    return this.prisma.country.create({ data: body });
  }

  @Get('buyers')
  async buyers(@Query() query: PaginationQuery) {
    const { skip, take, page, limit } = skipTake(query);
    const where: Prisma.BuyerWhereInput = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { code: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.buyer.findMany({
        where,
        skip,
        take,
        include: { country: true, _count: { select: { contracts: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.buyer.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  @Get('buyers/:id')
  buyer(@Param('id') id: string) {
    return this.prisma.buyer.findUniqueOrThrow({
      where: { id },
      include: {
        country: true,
        contacts: true,
        agreements: true,
        communications: { orderBy: { createdAt: 'desc' } },
        contracts: { include: { orders: true } },
      },
    });
  }

  @Post('buyers')
  createBuyer(@Body() body: Prisma.BuyerUncheckedCreateInput) {
    return this.prisma.buyer.create({ data: body });
  }

  @Patch('buyers/:id')
  updateBuyer(@Param('id') id: string, @Body() body: Prisma.BuyerUncheckedUpdateInput) {
    return this.prisma.buyer.update({ where: { id }, data: body });
  }

  @Post('buyer-contacts')
  contact(@Body() body: Prisma.BuyerContactUncheckedCreateInput) {
    return this.prisma.buyerContact.create({ data: body });
  }

  @Post('price-agreements')
  agreement(@Body() body: Prisma.PriceAgreementUncheckedCreateInput) {
    return this.prisma.priceAgreement.create({
      data: { ...body, validFrom: new Date(body.validFrom), validTo: new Date(body.validTo) },
    });
  }

  @Post('buyer-notes')
  note(@Body() body: Prisma.BuyerNoteUncheckedCreateInput) {
    return this.prisma.buyerNote.create({ data: body });
  }

  @Get('export-contracts')
  contracts() {
    return this.prisma.exportContract.findMany({
      include: { buyer: { include: { country: true } }, orders: true },
      orderBy: { signedAt: 'desc' },
    });
  }

  @Post('export-contracts')
  createContract(@Body() body: Prisma.ExportContractUncheckedCreateInput) {
    return this.prisma.exportContract.create({
      data: { ...body, signedAt: new Date(body.signedAt) },
    });
  }

  @Get('sales-orders')
  orders() {
    return this.prisma.salesOrder.findMany({
      include: { contract: { include: { buyer: true } }, shipments: true },
      orderBy: { orderDate: 'desc' },
    });
  }

  @Post('sales-orders')
  createOrder(@Body() body: Prisma.SalesOrderUncheckedCreateInput) {
    return this.prisma.salesOrder.create({
      data: {
        ...body,
        orderDate: new Date(body.orderDate),
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
      },
    });
  }

  @Patch('sales-orders/:id')
  updateOrder(@Param('id') id: string, @Body() body: Prisma.SalesOrderUncheckedUpdateInput) {
    return this.prisma.salesOrder.update({ where: { id }, data: body });
  }

  @Get('shipments')
  shipments() {
    return this.prisma.shipment.findMany({
      include: {
        salesOrder: { include: { contract: { include: { buyer: true } } } },
        lots: { include: { batch: true } },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('shipments')
  createShipment(@Body() body: Prisma.ShipmentUncheckedCreateInput) {
    return this.prisma.shipment.create({
      data: {
        ...body,
        etd: body.etd ? new Date(body.etd) : undefined,
        eta: body.eta ? new Date(body.eta) : undefined,
      },
    });
  }

  @Post('shipments/:id/lots')
  async addLot(
    @Param('id') id: string,
    @Body() body: { batchId: string; quantityKg: number; bags: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const lot = await tx.shipmentLot.create({ data: { shipmentId: id, ...body } });
      await tx.stockBatch.update({
        where: { id: body.batchId },
        data: { quantityKg: { decrement: body.quantityKg }, bags: { decrement: body.bags }, status: 'RESERVED' },
      });
      return lot;
    });
  }

  @Get('documents')
  documents() {
    return this.prisma.exportDocument.findMany({
      include: { shipment: true, certificate: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('documents')
  createDocument(@Body() body: Prisma.ExportDocumentUncheckedCreateInput) {
    return this.prisma.exportDocument.create({ data: body });
  }

  @Post('documents/generate/:shipmentId')
  async generate(@Param('shipmentId') shipmentId: string) {
    const shipment = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: {
        lots: { include: { batch: true } },
        salesOrder: { include: { contract: { include: { buyer: { include: { country: true } } } } } },
      },
    });
    const contract = shipment.salesOrder.contract;
    const invoiceNotes = [
      `Buyer: ${contract.buyer.name} (${contract.buyer.country.name})`,
      `Contract: ${contract.number}`,
      `Quantity: ${shipment.quantityKg} kg / ${shipment.bags} bags`,
      `Unit price: ${contract.unitPrice} ${contract.currency}`,
      `Amount: ${Number(contract.unitPrice) * Number(shipment.quantityKg)} ${contract.currency}`,
      `Incoterm: ${contract.incoterm}`,
      `Route: ${shipment.originPort} to ${shipment.destPort}`,
    ].join('\n');
    const packingNotes = shipment.lots.length
      ? shipment.lots
          .map((l) => `${l.batch.lotNumber}: ${l.quantityKg} kg, ${l.bags} bags, ${l.batch.grade} ${l.batch.process}`)
          .join('\n')
      : `${shipment.quantityKg} kg in ${shipment.bags} bags`;

    return this.prisma.$transaction([
      this.prisma.exportDocument.create({
        data: {
          shipmentId,
          type: 'COMMERCIAL_INVOICE',
          title: `Commercial Invoice ${shipment.number}`,
          status: 'SUBMITTED',
          notes: invoiceNotes,
        },
      }),
      this.prisma.exportDocument.create({
        data: {
          shipmentId,
          type: 'PACKING_LIST',
          title: `Packing List ${shipment.number}`,
          status: 'SUBMITTED',
          notes: packingNotes,
        },
      }),
    ]);
  }

  @Post('documents/:id/approve')
  approveDoc(@Param('id') id: string) {
    return this.prisma.exportDocument.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  @Post('documents/:id/reject')
  rejectDoc(@Param('id') id: string) {
    return this.prisma.exportDocument.update({ where: { id }, data: { status: 'REJECTED' } });
  }
}
