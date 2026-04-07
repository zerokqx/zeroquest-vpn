export {
  createInbound,
  deleteInbound,
  getInboundById,
  listActiveInbounds,
  listInbounds,
  updateInbound,
} from './server/repository';
export type { Inbound, UpsertInboundInput } from './model/types';
