import { Types } from 'mongoose';
import type { CounterOfferDTO } from '@flow/shared';
import { AppError } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import { EventBus } from '../../events/EventBus';
import { LoadModel, ILoad } from './models/load.model';
import { BookingRequestModel } from './models/booking-request.model';
import { CounterOfferModel, ICounterOffer } from './models/counter-offer.model';

export class CounterOfferService {
  static async submitCounter(
    loadId: string,
    userId: string,
    dto: CounterOfferDTO,
  ): Promise<ICounterOffer> {
    const load = await LoadModel.findById(loadId);

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    const direction =
      userId === load.createdBy.toString()
        ? 'broker_to_carrier'
        : 'carrier_to_broker';

    let otherPartyId: string;

    if (direction === 'broker_to_carrier') {
      if (!dto.bookingRequestId) {
        throw AppError.badRequest(
          'BOOKING_REQUEST_REQUIRED',
          'bookingRequestId is required for broker counter offers',
        );
      }

      const bookingRequest = await BookingRequestModel.findById(
        dto.bookingRequestId,
      );

      if (!bookingRequest) {
        throw AppError.notFound('Booking request', dto.bookingRequestId);
      }

      otherPartyId = bookingRequest.carrierUserId.toString();
    } else {
      otherPartyId = load.createdBy.toString();
    }

    const existingCount = await CounterOfferModel.countDocuments({
      loadId: loadId,
      $or: [
        {
          offeredBy: userId,
          offeredTo: new Types.ObjectId(otherPartyId),
        },
        {
          offeredBy: new Types.ObjectId(otherPartyId),
          offeredTo: userId,
        },
      ],
    });

    if (existingCount >= 5) {
      throw AppError.badRequest(
        'COUNTER_LIMIT_REACHED',
        'Maximum 5 counter-offer rounds reached',
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const counterOffer = await CounterOfferModel.create({
      loadId: loadId,
      bookingRequestId: dto.bookingRequestId
        ? new Types.ObjectId(dto.bookingRequestId)
        : null,
      offeredBy: userId,
      offeredTo: new Types.ObjectId(otherPartyId),
      proposedRate: dto.proposedRate,
      originalRate: load.rate,
      note: dto.note ?? null,
      direction,
      expiresAt,
    });

    setImmediate(async () => {
      await sendEmail('booking_notification', '', {
        loadId,
        counterOfferId: counterOffer._id.toString(),
        proposedRate: dto.proposedRate,
        direction,
      });
    });

    setImmediate(() => {
      EventBus.publish({
        type: 'counteroffer:submitted',
        payload: {
          counterOfferId: counterOffer._id.toString(),
          loadId,
          offeredBy: userId,
          offeredTo: otherPartyId,
          proposedRate: dto.proposedRate ?? null,
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return counterOffer;
  }

  static async acceptCounter(
    loadId: string,
    offerId: string,
    userId: string,
  ): Promise<ILoad> {
    const counterOffer = await CounterOfferModel.findOne({
      _id: offerId,
      loadId: loadId,
    });

    if (!counterOffer) {
      throw AppError.notFound('Counter offer', offerId);
    }

    if (counterOffer.status !== 'pending') {
      throw AppError.badRequest(
        'COUNTER_NOT_PENDING',
        'Only pending counter offers can be accepted',
      );
    }

    if (counterOffer.offeredTo.toString() !== userId) {
      throw AppError.forbidden('This counter offer was not sent to you');
    }

    counterOffer.status = 'accepted' as typeof counterOffer.status;
    counterOffer.respondedAt = new Date();
    await counterOffer.save();

    const load = await LoadModel.findById(loadId);

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    load.rate = counterOffer.proposedRate;

    await BookingRequestModel.updateMany(
      {
        loadId: loadId,
        status: 'pending',
      },
      { status: 'cancelled' as string },
    );

    await CounterOfferModel.updateMany(
      {
        loadId: loadId,
        _id: { $ne: counterOffer._id },
        status: 'pending',
      },
      { status: 'cancelled' as string },
    );

    if (load.status === 'posted') {
      load.status = 'booked';

      if (counterOffer.bookingRequestId) {
        load.confirmedBookingId = counterOffer.bookingRequestId;

        const bookingRequest = await BookingRequestModel.findById(
          counterOffer.bookingRequestId,
        );

        if (bookingRequest) {
          load.assignedTruckId = bookingRequest.truckId;
          load.assignedDriverId = bookingRequest.driverId;
          load.assignedAt = new Date();
        }
      }

      load.statusHistory.push({
        status: 'booked',
        changedBy: userId,
        changedAt: new Date(),
        note: `Booked via counter offer acceptance: ${offerId}`,
      });
    }

    await load.save();

    setImmediate(() => {
      EventBus.publish({
        type: 'counteroffer:accepted',
        payload: {
          counterOfferId: offerId,
          loadId,
          acceptedBy: userId,
          acceptedByRole: load.createdBy.toString() === userId ? 'broker' : 'carrier',
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return load;
  }
}
