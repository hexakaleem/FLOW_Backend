import { Types } from 'mongoose';
import { LoadModel } from '../loads/models/load.model';

export class AnalyticsService {
  static async getSummary(orgId: string) {
    if (!orgId || !Types.ObjectId.isValid(orgId)) {
      return { statusCounts: [], revenueData: [], shipperData: [] };
    }
    const objectId = orgId;
    
    const [statusCounts, revenueData, shipperData] = await Promise.all([
      LoadModel.aggregate([
        { $match: { orgId: objectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      LoadModel.aggregate([
        { $match: { orgId: objectId, status: 'delivered' } },
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveryDate" } }, 
            revenue: { $sum: '$rate' } 
          } 
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]),
      LoadModel.aggregate([
        { $match: { orgId: objectId, status: 'delivered' } },
        { $group: { _id: '$origin.city', revenue: { $sum: '$rate' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ])
    ]);

    return {
      statusCounts,
      revenueData: revenueData.map(d => ({ name: d._id, revenue: d.revenue })),
      shipperData: shipperData.map(d => ({ name: d._id, revenue: d.revenue }))
    };
  }
}
