import { PrismaClient, ProcessType, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@temerachi.com' },
    update: {},
    create: {
      email: 'admin@temerachi.com',
      password,
      fullName: 'System Administrator',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'procurement@temerachi.com' },
    update: {},
    create: {
      email: 'procurement@temerachi.com',
      password,
      fullName: 'Selam Tesfaye',
      role: Role.PROCUREMENT,
    },
  });

  const departments = await Promise.all(
    [
      { name: 'Procurement', code: 'PRC' },
      { name: 'Warehouse', code: 'WH' },
      { name: 'Quality Control', code: 'QC' },
      { name: 'Export', code: 'EXP' },
      { name: 'Finance', code: 'FIN' },
      { name: 'Human Resources', code: 'HR' },
    ].map((d) =>
      prisma.department.upsert({
        where: { code: d.code },
        update: {},
        create: d,
      }),
    ),
  );

  const emp = await prisma.employee.upsert({
    where: { employeeNo: 'EMP-001' },
    update: {},
    create: {
      employeeNo: 'EMP-001',
      fullName: 'System Administrator',
      email: 'admin@temerachi.com',
      phone: '+251911000001',
      position: 'General Manager',
      hireDate: new Date('2022-01-10'),
      salary: 85000,
      departmentId: departments[4].id,
      userId: admin.id,
    },
  });

  await prisma.employee.upsert({
    where: { employeeNo: 'EMP-002' },
    update: {},
    create: {
      employeeNo: 'EMP-002',
      fullName: 'Selam Tesfaye',
      email: 'procurement@temerachi.com',
      phone: '+251911000002',
      position: 'Procurement Officer',
      hireDate: new Date('2023-03-01'),
      salary: 32000,
      departmentId: departments[0].id,
    },
  });

  const countries = await Promise.all(
    [
      { name: 'Germany', code: 'DE' },
      { name: 'United States', code: 'US' },
      { name: 'Japan', code: 'JP' },
      { name: 'Italy', code: 'IT' },
      { name: 'South Korea', code: 'KR' },
      { name: 'United Kingdom', code: 'GB' },
    ].map((c) =>
      prisma.country.upsert({ where: { code: c.code }, update: {}, create: c }),
    ),
  );

  const yirgacheffe = await prisma.supplier.upsert({
    where: { code: 'SUP-YIR-01' },
    update: {},
    create: {
      code: 'SUP-YIR-01',
      name: 'Yirgacheffe Coffee Farmers Cooperative Union',
      type: 'COOPERATIVE',
      phone: '+251916111222',
      email: 'ycfcu@example.com',
      address: 'Dilla, Gedeo',
      region: 'South Ethiopia',
      origin: 'Yirgacheffe',
      contactName: 'Ato Bekele',
      contactPhone: '+251916111223',
    },
  });

  const guji = await prisma.supplier.upsert({
    where: { code: 'SUP-GUJ-01' },
    update: {},
    create: {
      code: 'SUP-GUJ-01',
      name: 'Guji Highland Farmers',
      type: 'LOCAL_SUPPLIER',
      phone: '+251917222333',
      region: 'Oromia',
      origin: 'Guji',
      contactName: 'Ato Tadesse',
    },
  });

  const sidama = await prisma.supplier.upsert({
    where: { code: 'SUP-SID-01' },
    update: {},
    create: {
      code: 'SUP-SID-01',
      name: 'Sidama Washed Coffee Station',
      type: 'WASHING_STATION',
      region: 'Sidama',
      origin: 'Sidama',
      contactName: 'W/ro Hana',
    },
  });

  const farmer = await prisma.farmer.upsert({
    where: { code: 'FMR-001' },
    update: {},
    create: {
      code: 'FMR-001',
      fullName: 'Kumsa Abebe',
      phone: '+251910101010',
      kebele: 'Halo Beriti',
      woreda: 'Kochere',
      zone: 'Gedeo',
      region: 'South Ethiopia',
      farmSizeHa: 2.4,
      variety: 'Heirloom',
      supplierId: yirgacheffe.id,
    },
  });

  await prisma.site.createMany({
    data: [
      { name: 'Kochere Lot A', location: 'Kochere', altitudeM: 1950, supplierId: yirgacheffe.id },
      { name: 'Hambela Estate', location: 'Hambela', altitudeM: 2100, supplierId: guji.id },
    ],
    skipDuplicates: true,
  });

  await prisma.washingStation.createMany({
    data: [
      { name: 'Halo Beriti Station', location: 'Yirgacheffe', capacityKg: 40000, supplierId: yirgacheffe.id },
      { name: 'Bensa Station', location: 'Sidama', capacityKg: 28000, supplierId: sidama.id },
    ],
    skipDuplicates: true,
  });

  const addisWh = await prisma.warehouse.upsert({
    where: { code: 'WH-ADD' },
    update: {},
    create: { code: 'WH-ADD', name: 'Addis Ababa Central Warehouse', location: 'Kality, Addis Ababa', capacityKg: 500000 },
  });
  const djibWh = await prisma.warehouse.upsert({
    where: { code: 'WH-DJI' },
    update: {},
    create: { code: 'WH-DJI', name: 'Djibouti Staging Warehouse', location: 'Port of Djibouti', capacityKg: 200000 },
  });

  const po = await prisma.purchaseOrder.upsert({
    where: { number: 'PO-2026-001' },
    update: {},
    create: {
      number: 'PO-2026-001',
      supplierId: yirgacheffe.id,
      process: ProcessType.WASHED,
      grade: 'G1',
      quantityKg: 18000,
      unitPrice: 420,
      status: 'APPROVED',
    },
  });

  const purchase = await prisma.purchase.upsert({
    where: { number: 'PUR-2026-001' },
    update: {},
    create: {
      number: 'PUR-2026-001',
      supplierId: yirgacheffe.id,
      farmerId: farmer.id,
      warehouseId: addisWh.id,
      purchaseOrderId: po.id,
      purchaseDate: new Date('2026-09-12'),
      origin: 'Yirgacheffe',
      process: ProcessType.WASHED,
      grade: 'G1',
      bags: 300,
      quantityKg: 18000,
      moisturePct: 10.8,
      unitPrice: 420,
      inspection: 'Passed cupping, clean citrus profile',
      status: 'APPROVED',
      receiptNo: 'RCPT-1001',
    },
  });

  await prisma.purchase.upsert({
    where: { number: 'PUR-2026-002' },
    update: {},
    create: {
      number: 'PUR-2026-002',
      supplierId: guji.id,
      warehouseId: addisWh.id,
      purchaseDate: new Date('2026-09-28'),
      origin: 'Guji',
      process: ProcessType.NATURAL,
      grade: 'G2',
      bags: 200,
      quantityKg: 12000,
      moisturePct: 11.2,
      unitPrice: 390,
      status: 'PENDING',
      receiptNo: 'RCPT-1002',
    },
  });

  const lot1 = await prisma.stockBatch.upsert({
    where: { lotNumber: 'LOT-PUR-2026-001' },
    update: {},
    create: {
      lotNumber: 'LOT-PUR-2026-001',
      warehouseId: addisWh.id,
      purchaseId: purchase.id,
      origin: 'Yirgacheffe',
      process: ProcessType.WASHED,
      grade: 'G1',
      bags: 300,
      quantityKg: 18000,
      moisturePct: 10.8,
      unitValue: 420,
      receivedAt: new Date('2026-09-12'),
    },
  });

  await prisma.stockBatch.upsert({
    where: { lotNumber: 'LOT-PUR-2026-002' },
    update: {},
    create: {
      lotNumber: 'LOT-PUR-2026-002',
      warehouseId: addisWh.id,
      origin: 'Guji',
      process: ProcessType.NATURAL,
      grade: 'G2',
      bags: 200,
      quantityKg: 12000,
      moisturePct: 11.2,
      unitValue: 390,
      receivedAt: new Date('2026-09-28'),
    },
  });

  await prisma.stockBatch.upsert({
    where: { lotNumber: 'LOT-SID-NAT-01' },
    update: {},
    create: {
      lotNumber: 'LOT-SID-NAT-01',
      warehouseId: djibWh.id,
      origin: 'Sidama',
      process: ProcessType.NATURAL,
      grade: 'G1',
      bags: 80,
      quantityKg: 4800,
      moisturePct: 10.5,
      unitValue: 410,
      receivedAt: new Date('2026-08-20'),
    },
  });

  const sample = await prisma.qualitySample.upsert({
    where: { code: 'SMP-001' },
    update: {},
    create: { code: 'SMP-001', batchId: lot1.id, purchaseId: purchase.id, notes: 'Pre-export cupping' },
  });

  const test = await prisma.qualityTest.create({
    data: {
      sampleId: sample.id,
      moisturePct: 10.8,
      cupScore: 87.5,
      aroma: 'Jasmine, bergamot',
      acidity: 'Bright citrus',
      body: 'Silky',
      flavor: 'Peach, lemon tea',
      defectCount: 2,
      gradeResult: 'G1 Specialty',
      passed: true,
      labNotes: 'ECX / Q-grader panel',
    },
  });

  const cert = await prisma.qualityCertificate.upsert({
    where: { number: 'QC-ET-2026-441' },
    update: {},
    create: {
      number: 'QC-ET-2026-441',
      testId: test.id,
      issuer: 'Ethiopian Coffee & Tea Authority',
      issuedAt: new Date('2026-10-02'),
      expiresAt: new Date('2027-10-02'),
    },
  });

  const buyerDe = await prisma.buyer.upsert({
    where: { code: 'BYR-DE-01' },
    update: {},
    create: {
      code: 'BYR-DE-01',
      name: 'Nordstern Coffee Roasters',
      countryId: countries[0].id,
      email: 'buy@nordstern.example',
      phone: '+49 40 0000',
      creditLimit: 250000,
      currency: 'USD',
    },
  });

  const buyerUs = await prisma.buyer.upsert({
    where: { code: 'BYR-US-01' },
    update: {},
    create: {
      code: 'BYR-US-01',
      name: 'Cascade Specialty Importers',
      countryId: countries[1].id,
      email: 'orders@cascade.example',
      creditLimit: 400000,
      currency: 'USD',
    },
  });

  await prisma.buyerContact.createMany({
    data: [
      { buyerId: buyerDe.id, name: 'Anna Keller', role: 'Green Buyer', email: 'anna@nordstern.example' },
      { buyerId: buyerUs.id, name: 'James Ortiz', role: 'Procurement', email: 'james@cascade.example' },
    ],
    skipDuplicates: true,
  });

  const contract = await prisma.exportContract.upsert({
    where: { number: 'EXP-2026-017' },
    update: {},
    create: {
      number: 'EXP-2026-017',
      buyerId: buyerDe.id,
      signedAt: new Date('2026-08-01'),
      origin: 'Yirgacheffe',
      process: ProcessType.WASHED,
      grade: 'G1',
      quantityKg: 19200,
      shippedKg: 9600,
      unitPrice: 6.4,
      incoterm: 'FOB Djibouti',
      status: 'PARTIAL',
    },
  });

  const order = await prisma.salesOrder.upsert({
    where: { number: 'SO-2026-009' },
    update: {},
    create: {
      number: 'SO-2026-009',
      contractId: contract.id,
      orderDate: new Date('2026-09-15'),
      quantityKg: 9600,
      deliveryDate: new Date('2026-10-30'),
      status: 'CONFIRMED',
    },
  });

  const shipment = await prisma.shipment.upsert({
    where: { number: 'SHP-2026-004' },
    update: {},
    create: {
      number: 'SHP-2026-004',
      salesOrderId: order.id,
      vessel: 'MV Horn of Africa',
      originPort: 'Djibouti',
      destPort: 'Hamburg',
      etd: new Date('2026-10-18'),
      eta: new Date('2026-11-08'),
      quantityKg: 9600,
      bags: 160,
      status: 'PLANNED',
    },
  });

  await prisma.exportDocument.createMany({
    data: [
      { shipmentId: shipment.id, type: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice SHP-2026-004', status: 'APPROVED' },
      { shipmentId: shipment.id, type: 'PACKING_LIST', title: 'Packing List SHP-2026-004', status: 'SUBMITTED' },
      { shipmentId: shipment.id, type: 'CERTIFICATE_OF_ORIGIN', title: 'COO Ethiopia', status: 'DRAFT' },
      { shipmentId: shipment.id, certificateId: cert.id, type: 'QUALITY_CERTIFICATE', title: 'QC-ET-2026-441', status: 'ATTACHED' },
      { shipmentId: shipment.id, type: 'PHYTOSANITARY', title: 'Phyto certificate pending', status: 'DRAFT' },
      { shipmentId: shipment.id, type: 'BILL_OF_LADING', title: 'B/L attached after loading', status: 'DRAFT' },
    ],
    skipDuplicates: true,
  });

  const cash = await prisma.account.upsert({
    where: { code: '1000' },
    update: {},
    create: { code: '1000', name: 'Cash on Hand ETB', type: 'CASH', currency: 'ETB' },
  });
  const bankUsd = await prisma.account.upsert({
    where: { code: '1010' },
    update: {},
    create: { code: '1010', name: 'CBE USD Export Account', type: 'BANK', currency: 'USD' },
  });
  await prisma.account.upsert({
    where: { code: '1100' },
    update: {},
    create: { code: '1100', name: 'Accounts Receivable', type: 'RECEIVABLE', currency: 'USD' },
  });
  await prisma.account.upsert({
    where: { code: '2000' },
    update: {},
    create: { code: '2000', name: 'Accounts Payable', type: 'PAYABLE', currency: 'ETB' },
  });

  await prisma.transaction.createMany({
    data: [
      { accountId: cash.id, type: 'PURCHASE', amount: 7560000, currency: 'ETB', memo: 'Yirgacheffe G1 lot', occurredAt: new Date('2026-09-12') },
      { accountId: bankUsd.id, type: 'SALE', amount: 61440, currency: 'USD', fxRate: 148.5, memo: 'Nordstern partial shipment', occurredAt: new Date('2026-10-05') },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { category: 'Transport', amount: 185000, currency: 'ETB', vendor: 'Awash Logistics', occurredAt: new Date('2026-09-20') },
      { category: 'Warehouse', amount: 42000, currency: 'ETB', vendor: 'Kality Rent', occurredAt: new Date('2026-10-01') },
      { category: 'Export fees', amount: 12000, currency: 'USD', vendor: 'Shipping agent', occurredAt: new Date('2026-10-10') },
    ],
  });

  await prisma.invoice.upsert({
    where: { number: 'INV-EXP-004' },
    update: {},
    create: {
      number: 'INV-EXP-004',
      salesOrderId: order.id,
      kind: 'SALES',
      amount: 61440,
      currency: 'USD',
      issuedAt: new Date('2026-10-05'),
      dueAt: new Date('2026-11-05'),
      status: 'OPEN',
    },
  });

  await prisma.supplierPayment.create({
    data: {
      supplierId: yirgacheffe.id,
      purchaseId: purchase.id,
      amount: 7560000,
      paidAt: new Date('2026-09-14'),
      method: 'Bank transfer',
      reference: 'PAY-4412',
    },
  });

  await prisma.coffeeBag.createMany({
    data: [
      { bagNo: 'BAG-001', weightKg: 60, batchId: lot1.id },
      { bagNo: 'BAG-002', weightKg: 60, batchId: lot1.id },
    ],
    skipDuplicates: true,
  });

  await prisma.supplierEval.create({
    data: {
      supplierId: yirgacheffe.id,
      period: '2026 Q3',
      quality: 92,
      delivery: 88,
      reliability: 90,
      notes: 'Consistent G1 lots',
    },
  });

  await prisma.priceAgreement.create({
    data: {
      buyerId: buyerDe.id,
      grade: 'G1',
      process: ProcessType.WASHED,
      priceUsd: 6.4,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
    },
  });

  await prisma.buyerNote.create({
    data: {
      buyerId: buyerDe.id,
      subject: 'Harvest sample',
      body: 'Requested additional Kochere lots for November.',
    },
  });

  await prisma.attendance.create({
    data: { employeeId: emp.id, date: new Date('2026-10-20'), status: 'PRESENT', checkIn: new Date('2026-10-20T08:05:00') },
  });

  await prisma.leave.create({
    data: {
      employeeId: emp.id,
      type: 'Annual',
      startDate: new Date('2026-12-24'),
      endDate: new Date('2026-12-31'),
      reason: 'Year-end rest',
      status: 'PENDING',
    },
  });

  await prisma.shift.create({
    data: { employeeId: emp.id, date: new Date('2026-10-21'), startTime: '08:00', endTime: '17:00', location: 'Head office' },
  });

  await prisma.assignment.create({
    data: {
      employeeId: emp.id,
      title: 'Approve export docs for SHP-2026-004',
      details: 'COO and phyto before vessel cutoff',
      dueDate: new Date('2026-10-17'),
    },
  });

  await prisma.performanceEval.create({
    data: { employeeId: emp.id, period: '2026 H1', score: 4.6, comments: 'Strong leadership of export cycle' },
  });

  await prisma.activityLog.create({
    data: { userId: admin.id, action: 'SEED', entity: 'System', entityId: 'init' },
  });

  console.log('Seed complete. Login: admin@temerachi.com / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
