import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ActivityInterceptor } from './common/activity.interceptor';
import { CommercialController } from './modules/commercial.controller';
import { DashboardController } from './modules/dashboard.controller';
import { FinanceController } from './modules/finance.controller';
import { HrController } from './modules/hr.controller';
import { InventoryController } from './modules/inventory.controller';
import { PurchasesController } from './modules/purchases.controller';
import { QualityController } from './modules/quality.controller';
import { SuppliersController } from './modules/suppliers.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [
    SuppliersController,
    PurchasesController,
    InventoryController,
    QualityController,
    CommercialController,
    FinanceController,
    HrController,
    DashboardController,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ActivityInterceptor }],
})
export class AppModule {}
