import { ComplianceModel, ICompliance } from './models/compliance.model';

export class ComplianceService {
  static async getComplianceRecords(
    orgId: string,
    daysAhead: number = 30,
  ): Promise<ICompliance[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);

    return ComplianceModel.find({
      orgId,
      $or: [
        { cdlExpiryDate: { $lte: threshold } },
        { medicalCardExpiryDate: { $lte: threshold } },
      ],
    });
  }

  static async upsertCompliance(
    orgId: string,
    driverId: string,
    dto: {
      driverName: string;
      cdlNumber: string;
      cdlState: string;
      cdlExpiryDate: Date;
      medicalCardExpiryDate: Date;
      alertsEnabled?: boolean;
    },
  ): Promise<ICompliance> {
    const record = await ComplianceModel.findOneAndUpdate(
      { orgId, driverId },
      {
        orgId,
        driverId,
        driverName: dto.driverName,
        cdlNumber: dto.cdlNumber,
        cdlState: dto.cdlState,
        cdlExpiryDate: dto.cdlExpiryDate,
        medicalCardExpiryDate: dto.medicalCardExpiryDate,
        alertsEnabled: dto.alertsEnabled ?? true,
        lastCheckedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return record;
  }
}
