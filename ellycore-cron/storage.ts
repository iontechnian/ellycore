import { CronOptionsStorage, CronOptionsStorageDynamo } from "./types.ts";
import { DynamoDB } from 'aws-sdk';

interface Storage {
    load(): Promise<void>;
    save(): Promise<string>;
    remove(id: string): Promise<void>;
}

class DynamoStorage implements Storage {
    private db: DynamoDB 
    private tableName: string;
    constructor (options: CronOptionsStorageDynamo) {
        this.tableName = options.table || "ellycore_cron_storage";
        this.db = new DynamoDB({ endpoint: options.endpoint });
    }

    private createTableIfMissing() {
        return new Promise<void>((resolve, reject) => {
            this.db.describeTable({ TableName: this.tableName }, (err, _data) => {
                if (err) {
                    if (err.code == "ResourceNotFoundException") {
                        this.db.createTable({
                            TableName: this.tableName,
                            AttributeDefinitions: [
                                {
                                    AttributeName: 'id',
                                    AttributeType: 'S',
                                },
                            ],
                            KeySchema: [
                                {
                                    AttributeName: 'id',
                                    KeyType: 'HASH',
                                },
                            ],
                        }, (err, _data) => {
                            if (err) {
                                return reject(err);
                            }
                            return resolve();
                        })
                    } else {
                        return reject(err);
                    }
                }
                return resolve();
            });

        })
    }

    async load(): Promise<void> {
      await this.createTableIfMissing();
    }
}

export const createStorage = (options: CronOptionsStorage): Storage | undefined => {
    switch (options.mode) {
        case "disabled":
            return undefined;
        case "dynamodb":
            return new DynamoStorage(options)
    }
}