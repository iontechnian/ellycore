interface CronOptionsStorageDisabled {
    mode: 'disabled';
  }
  
  export interface CronOptionsStorageDynamo {
    mode: 'dynamodb';
    table?: string;
    endpoint?: string;
  }
  
  export type CronOptionsStorage = CronOptionsStorageDisabled | CronOptionsStorageDynamo
  
  export interface CronOptions {
    storage?: CronOptionsStorage
  }