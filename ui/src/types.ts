// Move interfaces here
export interface SlotData {
  slot: number;
  status: 'proposed' | 'missing' | 'pending' | 'upcoming';
}

export interface EpochData {
  current_epoch: number;
  current_epoch_start_slot: number;
  previous_epoch_start_slot: number;
  slots_per_epoch: number;
  current_slot: number;
}

// Add these interfaces
export interface ValidatorEntity {
  label: string;
  node_operator: string;
}

export interface ProposerInfo {
  slot: number;
  validator_index: number;
  when: 'current_epoch' | 'next_epoch';
  epoch: number;
  is_current_slot: boolean;
  entity: ValidatorEntity;
}

export interface SlotsResponse {
  slots: SlotData[];
  epoch_data: EpochData;
  checkpoints: {
    finalized: number;
    justified: number;
  };
  duties: {
    proposer: number[];
    attester: number[];
  };
}

export interface StatusResponse {
  total: number;
  active: number;
}

export interface ArrivalTime {
  slot: number;
  arrival_time: number;
}

export interface ArrivalTimesResponse {
  arrival_times: ArrivalTime[];
  seconds_per_slot: number;
}

// ... rest of the interfaces ... 