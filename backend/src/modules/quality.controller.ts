import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class QualityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('quality/samples')
  samples() {
    return this.prisma.qualitySample.findMany({
      include: { batch: true, purchase: true, tests: true },
      orderBy: { takenAt: 'desc' },
    });
  }

  @Post('quality/samples')
  createSample(@Body() body: Prisma.QualitySampleUncheckedCreateInput) {
    return this.prisma.qualitySample.create({ data: body });
  }

  @Get('quality/tests')
  tests() {
    return this.prisma.qualityTest.findMany({
      include: { sample: { include: { batch: true } }, certificates: true, rejections: true },
      orderBy: { testedAt: 'desc' },
    });
  }

  @Post('quality/tests')
  async createTest(@Body() body: Prisma.QualityTestUncheckedCreateInput) {
    const test = await this.prisma.qualityTest.create({ data: body });
    if (!test.passed && body.sampleId) {
      const sample = await this.prisma.qualitySample.findUnique({ where: { id: String(body.sampleId) } });
      if (sample?.batchId) {
        await this.prisma.stockBatch.update({
          where: { id: sample.batchId },
          data: { status: 'REJECTED' },
        });
      }
    }
    return test;
  }

  @Get('quality/certificates')
  certificates() {
    return this.prisma.qualityCertificate.findMany({
      include: { test: { include: { sample: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  @Post('quality/certificates')
  createCert(@Body() body: Prisma.QualityCertificateUncheckedCreateInput) {
    return this.prisma.qualityCertificate.create({
      data: {
        ...body,
        issuedAt: new Date(body.issuedAt),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    });
  }

  @Get('quality/rejections')
  rejections() {
    return this.prisma.rejectedBatch.findMany({
      include: { test: { include: { sample: { include: { batch: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('quality/rejections')
  async reject(@Body() body: Prisma.RejectedBatchUncheckedCreateInput) {
    const rec = await this.prisma.rejectedBatch.create({ data: body });
    const test = await this.prisma.qualityTest.findUnique({
      where: { id: String(body.testId) },
      include: { sample: true },
    });
    if (test?.sample?.batchId) {
      await this.prisma.stockBatch.update({
        where: { id: test.sample.batchId },
        data: { status: 'REJECTED' },
      });
    }
    return rec;
  }

  @Get('quality/history/:batchId')
  history(@Param('batchId') batchId: string) {
    return this.prisma.qualitySample.findMany({
      where: { batchId },
      include: { tests: { include: { certificates: true, rejections: true } } },
      orderBy: { takenAt: 'desc' },
    });
  }
}
