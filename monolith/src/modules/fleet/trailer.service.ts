import type { CreateTrailerDTO } from '@flow/shared';
import { AppError } from '../../lib/errors';
import { TrailerModel, ITrailer } from './models/trailer.model';
import { TruckModel } from './models/truck.model';

export class TrailerService {
  static async createTrailer(orgId: string, dto: CreateTrailerDTO): Promise<ITrailer> {
    return TrailerModel.create({
      orgId,
      type: dto.type,
      length: dto.length,
      capacity: dto.capacity,
      plateNumber: dto.plateNumber,
    });
  }

  static async listTrailers(orgId: string): Promise<ITrailer[]> {
    return TrailerModel.find({ orgId });
  }

  static async assignToTruck(trailerId: string, orgId: string, truckId: string): Promise<ITrailer> {
    const trailer = await TrailerModel.findOne({ _id: trailerId, orgId });

    if (!trailer) {
      throw AppError.notFound('Trailer', trailerId);
    }

    const truck = await TruckModel.findOne({ _id: truckId, orgId });

    if (!truck) {
      throw AppError.notFound('Truck', truckId);
    }

    if (trailer.assignedTruckId) {
      await TruckModel.findByIdAndUpdate(trailer.assignedTruckId, { linkedTrailerId: null });
    }

    trailer.assignedTruckId = truck._id.toString();
    trailer.status = 'assigned';
    await trailer.save();

    truck.linkedTrailerId = trailer._id.toString();
    await truck.save();

    return trailer;
  }
}
