import { uid, todayLocalDate } from './session.js'
import { localIso } from './backup.js'

// A dated body measurement, one row per reading so the series can be trended;
// nothing is ever overwritten in place. `type` keys the series: vital capacity
// is the first, and future measurement kinds (weight, FRC estimate) add a new
// type rather than a new store.
export function newVitalCapacity() {
  return {
    id: uid('meas'),
    type: 'vital_capacity',
    date: todayLocalDate(),
    vc_l: null,
    // After glossopharyngeal insufflation (packing); optional.
    packed_l: null,
    notes: '',
    created_at: localIso(),
  }
}
