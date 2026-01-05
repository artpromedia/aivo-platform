/**
 * Events Module
 *
 * Exports NATS event publishing functionality.
 */

export {
  natsPublisher,
  emitProfileCreated,
  emitProfileUpdated,
  emitAccommodationCreated,
  emitAccommodationUpdated,
  emitAccommodationDeleted,
  type ProfileEvent,
  type AccommodationEvent,
  type ProfileServiceEvent,
} from './nats.js';
